// searchRecuerdos.js
// Búsqueda semántica basada en embeddings (text-embedding-3-small).
// Estrategia:
//   1. Convertir el query del usuario en un embedding.
//   2. Para cada recuerdo sin embedding almacenado, generarlo y cachearlo en memoria.
//   3. Calcular similitud coseno entre el query y cada recuerdo.
//   4. Filtrar por umbral y devolver top 5.
// Variables de entorno: OPENAI_API_KEY, VITE_BIN_ID, VITE_MASTER_KEY

import OpenAI from 'openai';

// Cache en memoria: Map<recordId (string), embedding (number[])>
// Persiste entre invocaciones calientes de la función (warm instances).
// Preparada para migrar a persistencia externa (ej: Supabase + pgvector).
const embeddingCache = new Map();

// ── Cliente OpenAI (instancia única) ────────────────────────────────────────
let openaiClient = null;
const getClient = (apiKey) => {
  if (!openaiClient) openaiClient = new OpenAI({ apiKey });
  return openaiClient;
};

// ── Genera un embedding para el texto dado ───────────────────────────────────
// Retorna number[] o null si falla.
const createEmbedding = async (text, apiKey) => {
  try {
    const client = getClient(apiKey);
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  } catch (err) {
    console.error('[embedding] Error al generar embedding:', err.message);
    return null;
  }
};

// ── Similitud coseno entre dos vectores ─────────────────────────────────────
// Retorna valor entre -1 y 1. Retorna 0 si los vectores no son válidos.
const cosineSimilarity = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
};

// ── Preprocesa un record para construir el texto que se embebe ───────────────
// Combina los campos más representativos y normaliza para consistencia.
const preprocessRecord = (r) => {
  const parts = [
    r.title        || '',
    r.description  || '',
    (r.tags        || []).join(' '),
    r.location     || '',
    r.image_description || '',
    (r.image_tags  || []).join(' '),
  ];
  return parts
    .map(p => p.trim().toLowerCase())
    .filter(Boolean)
    .join(' ');
};

// ── Fallback: búsqueda simple por texto ─────────────────────────────────────
// Se usa cuando OpenAI no está disponible o falla.
const textFallbackSearch = (records, query) => {
  const words = query
    .toLowerCase()
    .split(/[^a-záéíóúñ0-9]+/)
    .filter(w => w.length > 2);

  return records
    .map(rec => {
      const haystack = preprocessRecord(rec);
      let score = 0;
      words.forEach(w => {
        const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const matches = haystack.match(new RegExp(escaped, 'g'));
        if (matches) score += matches.length;
        if (rec.title && rec.title.toLowerCase().includes(w)) score += 2; // Bonus si la palabra está en el título
      });
      return { ...rec, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
};

export const handler = async function (event) {
  try {
    const { OPENAI_API_KEY, VITE_BIN_ID, VITE_MASTER_KEY } = process.env;
    const openaiAvailable = Boolean(OPENAI_API_KEY && OPENAI_API_KEY.length > 10);

    const body = event.body ? JSON.parse(event.body) : {};
    const { text = '' } = body;
    if (!text || text.trim().length === 0) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Texto vacío' }) };
    }

    // ── Obtener recuerdos del JSON bin ──────────────────────────────────────
    const BASE_URL = `https://api.jsonbin.io/v3/b/${VITE_BIN_ID}`;
    const resBin = await fetch(`${BASE_URL}/latest`, {
      headers: { 'X-Master-Key': VITE_MASTER_KEY },
    });
    if (!resBin.ok) {
      return { statusCode: 502, body: JSON.stringify({ message: 'Error al obtener recuerdos' }) };
    }
    const bin = await resBin.json();
    const records = Array.isArray(bin.record) ? bin.record : [];
    if (!records.length) {
      return { statusCode: 200, body: JSON.stringify({ results: [] }) };
    }

    // ── Fallback si OpenAI no está configurado ──────────────────────────────
    if (!openaiAvailable) {
      console.warn('[search] OpenAI no disponible, usando búsqueda por texto.');
      return {
        statusCode: 200,
        body: JSON.stringify({ results: textFallbackSearch(records, text) }),
      };
    }

    // ── Paso 1: Embedding del query (1 llamada) ─────────────────────────────
    const queryEmbedding = await createEmbedding(text.trim().toLowerCase(), OPENAI_API_KEY);
    if (!queryEmbedding) {
      console.warn('[search] Fallo al generar embedding del query, usando fallback.');
      return {
        statusCode: 200,
        body: JSON.stringify({ results: textFallbackSearch(records, text) }),
      };
    }

    // ── Paso 2: Generar embeddings faltantes (N llamadas solo si es necesario)
    // Se prioriza: embedding ya guardado en el record > cache en memoria > nueva llamada.
    const embeddingPromises = records.map(async (rec) => {
      const id = String(rec.id);

      if (Array.isArray(rec.embedding) && rec.embedding.length > 0) {
        // El record ya trae embedding persistido: cachearlo para llamadas futuras.
        if (!embeddingCache.has(id)) embeddingCache.set(id, rec.embedding);
        return rec.embedding;
      }

      if (embeddingCache.has(id)) {
        // Hit en cache de memoria (warm instance).
        return embeddingCache.get(id);
      }

      // Sin embedding: generarlo y cachearlo.
      const recText = preprocessRecord(rec);
      const emb = await createEmbedding(recText, OPENAI_API_KEY);
      if (emb) embeddingCache.set(id, emb);
      return emb;
    });

    const embeddings = await Promise.all(embeddingPromises);

    // ── Paso 3: Calcular similitud coseno y construir resultados ────────────
    // text-embedding-3-small produce similitudes típicamente entre 0.25–0.55
    // para contenido semánticamente relacionado. Umbrales calibrados para este modelo.
    const THRESHOLD_HIGH   = 0.40; // Alta relevancia
    const THRESHOLD_MEDIUM = 0.25; // Relevancia media (fallback)

    const scored = records.map((rec, i) => ({
      ...rec,
      score: cosineSimilarity(queryEmbedding, embeddings[i]),
    }));

    scored.sort((a, b) => b.score - a.score);

    // Intentar con umbral alto; si no hay resultados, bajar al medio.
    let results = scored.filter(r => r.score >= THRESHOLD_HIGH).slice(0, 5);
    if (results.length === 0) {
      results = scored.filter(r => r.score >= THRESHOLD_MEDIUM).slice(0, 5);
    }

    console.log(`[search] Query: "${text}" | Resultados: ${results.length} | Top score: ${scored[0]?.score?.toFixed(3)}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ results }),
    };

  } catch (error) {
    console.error('[searchRecuerdos] Error interno:', error);
    return { statusCode: 500, body: JSON.stringify({ message: 'Error interno' }) };
  }
};
