// backfillEmbeddings.js
// Función de migración única: genera y persiste el campo `embedding` en todos
// los recuerdos del JSONBin que aún no lo tengan.
//
// Cuándo llamarla:
//   POST /.netlify/functions/backfillEmbeddings
//   (también acepta GET para facilitar pruebas desde el navegador)
//
// Seguridad: válida un header `x-backfill-secret` contra la variable de entorno
//   BACKFILL_SECRET para evitar ejecuciones accidentales en producción.
//
// Variables de entorno requeridas: OPENAI_API_KEY, VITE_BIN_ID, VITE_MASTER_KEY
// Variable opcional:               BACKFILL_SECRET

import { saveEmbeddingToSupabase, embeddingExistsInSupabase } from './supabaseClient.js';

// ── Preprocesa un record para construir el texto que se embebe ───────────────
// Combina los campos más representativos y normaliza para consistencia.
const preprocessRecord = (r) => {
  const parts = [
    r.title             || '',
    r.description       || '',
    (r.tags             || []).join(' '),
    r.location          || '',
    r.image_description || '',
    (r.image_tags       || []).join(' '),
  ];
  return parts.map(p => p.trim().toLowerCase()).filter(Boolean).join(' ');
};

// ── Genera embedding via text-embedding-3-small ──────────────────────────────
// Retorna number[] o null si falla (nunca lanza excepción).
const createEmbedding = async (text, apiKey) => {
  if (!apiKey || !text) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
    });
    if (!res.ok) {
      console.error('[embedding] HTTP error:', res.status, await res.text());
      return null;
    }
    const json = await res.json();
    return json?.data?.[0]?.embedding ?? null;
  } catch (e) {
    console.error('[embedding] Error:', e.message);
    return null;
  }
};

export const handler = async function (event) {
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { OPENAI_API_KEY, VITE_BIN_ID, VITE_MASTER_KEY, BACKFILL_SECRET } = process.env;

  // ── Validar secret opcional para evitar ejecuciones no autorizadas ──────────
  if (BACKFILL_SECRET) {
    const provided = event.headers?.['x-backfill-secret'] || event.queryStringParameters?.secret;
    if (provided !== BACKFILL_SECRET) {
      return { statusCode: 403, body: JSON.stringify({ message: 'Forbidden' }) };
    }
  }

  if (!OPENAI_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ message: 'OPENAI_API_KEY no configurada' }) };
  }
  if (!VITE_BIN_ID || !VITE_MASTER_KEY) {
    return { statusCode: 500, body: JSON.stringify({ message: 'Variables de JSONBin no configuradas' }) };
  }

  const BASE_URL = `https://api.jsonbin.io/v3/b/${VITE_BIN_ID}`;

  // ── Leer todos los recuerdos ─────────────────────────────────────────────────
  let records;
  try {
    const resGet = await fetch(`${BASE_URL}/latest`, {
      headers: { 'X-Master-Key': VITE_MASTER_KEY },
    });
    if (!resGet.ok) {
      return { statusCode: 502, body: JSON.stringify({ message: 'Error al obtener recuerdos del JSONBin' }) };
    }
    const bin = await resGet.json();
    records = Array.isArray(bin.record) ? bin.record : [];
  } catch (e) {
    console.error('[backfill] Error leyendo JSONBin:', e.message);
    return { statusCode: 500, body: JSON.stringify({ message: 'Error interno al leer datos' }) };
  }

  if (!records.length) {
    return { statusCode: 200, body: JSON.stringify({ message: 'No hay recuerdos', procesados: 0, omitidos: 0, errores: 0 }) };
  }

  // ── Iterar secuencialmente para no saturar la API de OpenAI ─────────────────
  // Se procesan de uno en uno (no en paralelo) para respetar rate limits.
  let procesados = 0;
  let omitidos   = 0;
  let errores    = 0;

  for (const rec of records) {
    let exists;
    try {
      exists = await embeddingExistsInSupabase(rec.id);
    } catch (err) {
      console.error('[backfill] Error verificando embedding en Supabase para record', rec.id, err.message);
      errores++;
      continue;
    }

    if (exists) {
      omitidos++;
      continue;
    }

    const text = preprocessRecord(rec);
    if (!text) {
      console.warn(`[backfill] Record ${rec.id} sin texto útil, omitido.`);
      omitidos++;
      continue;
    }

    const embedding = await createEmbedding(text, OPENAI_API_KEY);
    if (!embedding) {
      console.error(`[backfill] Falló embedding para record ${rec.id}`);
      errores++;
      continue;
    }

    try {
      await saveEmbeddingToSupabase(rec.id, embedding);
      procesados++;
      console.log(`[backfill] ✓ Embedding guardado en Supabase para record ${rec.id}`);
    } catch (err) {
      console.error('[backfill] Error guardando embedding en Supabase:', err.message);
      errores++;
    }
  }

  console.log(`[backfill] Completo → procesados: ${procesados}, omitidos: ${omitidos}, errores: ${errores}`);
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Backfill de embeddings completado',
      procesados,
      omitidos,
      errores,
    }),
  };
};
