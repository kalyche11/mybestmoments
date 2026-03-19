// searchRecuerdos.js
// Búsqueda en 2 fases:
//   Fase 1 — Clasificador binario liviano: payload compacto → IA dice sí/no por cada recuerdo
//   Fase 2 — Scoring profundo: solo los candidatos aprobados → IA puntúa 0-100
// Variables de entorno: OPENAI_API_KEY, VITE_BIN_ID, VITE_MASTER_KEY

const callOpenAI = async (messages, apiKey, maxTokens = 400) => {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages, max_tokens: maxTokens, temperature: 0 })
  });
  if (!res.ok) { console.warn('OpenAI error:', await res.text()); return null; }
  const json = await res.json();
  return json?.choices?.[0]?.message?.content || '';
};

const parseJSONArray = (text) => {
  const bracket = text.indexOf('[');
  if (bracket < 0) return null;
  // Encontrar cierre correspondiente
  let depth = 0, end = -1;
  for (let i = bracket; i < text.length; i++) {
    if (text[i] === '[') depth++;
    else if (text[i] === ']') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) return null;
  try { return JSON.parse(text.slice(bracket, end + 1)); } catch { return null; }
};

export const handler = async function(event) {
  try {
    const { OPENAI_API_KEY, VITE_BIN_ID, VITE_MASTER_KEY } = process.env;
    const openaiAvailable = Boolean(OPENAI_API_KEY && OPENAI_API_KEY.length > 10);

    const body = event.body ? JSON.parse(event.body) : {};
    const { text = '' } = body;
    if (!text || text.trim().length === 0) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Texto vacío' }) };
    }

    // ── Obtener recuerdos del JSON bin ──
    const BASE_URL = `https://api.jsonbin.io/v3/b/${VITE_BIN_ID}`;
    const resBin = await fetch(`${BASE_URL}/latest`, { headers: { 'X-Master-Key': VITE_MASTER_KEY } });
    if (!resBin.ok) {
      return { statusCode: 502, body: JSON.stringify({ message: 'Error al obtener recuerdos' }) };
    }
    const bin = await resBin.json();
    const records = Array.isArray(bin.record) ? bin.record : [];
    if (!records.length) {
      return { statusCode: 200, body: JSON.stringify({ results: [] }) };
    }

    // ══════════════════════════════════════════════
    //  FASE 1 — Clasificador binario liviano
    //  Payload compacto: solo id + campos clave
    //  IA responde: ["id1","id2",...]
    // ══════════════════════════════════════════════
    let candidateIds = null;

    if (openaiAvailable) {
      const compact = records.map(r => ({
        id: r.id,
        tags: (r.tags || []).join(', '),
        image_tags: (r.image_tags || []).join(', '),
        image_description: r.image_description || '',
        location: r.location || '',
        date: r.date || '',
        title: r.title || ''
      }));

      console.log(`[Fase 1] Clasificando ${compact.length} recuerdos para: "${text}"`);

      const phase1Content = await callOpenAI([{
        role: 'user',
        content: `Búsqueda del usuario: "${text}"

Analiza semánticamente cada recuerdo y determina cuáles tienen relación con la búsqueda.
Considera sinónimos, contexto y relaciones semánticas (ej: "playa" conecta con "océano", "arena", "costa").
Devuelve ÚNICAMENTE un array JSON con los IDs de los recuerdos relevantes: ["id1","id2",...]
Si ninguno es relevante, devuelve [].

Recuerdos:
${JSON.stringify(compact)}`
      }], OPENAI_API_KEY, 300);

      if (phase1Content) {
        const ids = parseJSONArray(phase1Content);
        if (Array.isArray(ids) && ids.length > 0) {
          candidateIds = new Set(ids.map(String));
          console.log(`[Fase 1] IA seleccionó ${candidateIds.size} candidatos:`, [...candidateIds]);
        } else {
          console.log('[Fase 1] IA no encontró candidatos relevantes');
          return { statusCode: 200, body: JSON.stringify({ results: [] }) };
        }
      }
    }

    // Si OpenAI no disponible → fallback heurístico para fase 1
    if (candidateIds === null) {
      const normalize = (s = '') => s.toString().toLowerCase();
      const words = text.toLowerCase().split(/[^a-záéíóúñ0-9]+/).filter(w => w.length > 2);
      candidateIds = new Set();
      for (const rec of records) {
        const haystack = [
          rec.title, rec.description, rec.location, rec.date,
          ...(rec.tags || []), ...(rec.image_tags || []),
          rec.image_description
        ].map(normalize).join(' ');
        if (words.some(w => haystack.includes(w))) {
          candidateIds.add(String(rec.id));
        }
      }
      console.log(`[Fase 1 heurística] ${candidateIds.size} candidatos de ${records.length}`);
      if (candidateIds.size === 0) {
        return { statusCode: 200, body: JSON.stringify({ results: [] }) };
      }
    }

    // Filtrar solo los candidatos aprobados
    const candidates = records.filter(r => candidateIds.has(String(r.id)));

    // ══════════════════════════════════════════════
    //  FASE 2 — Scoring profundo
    //  Solo candidatos aprobados, datos completos
    //  IA responde: [{"id":"...","score":85},...]
    // ══════════════════════════════════════════════
    let scoredResults = [];

    if (openaiAvailable && candidates.length > 0) {
      const full = candidates.map(r => ({
        id: r.id,
        title: r.title || '',
        description: r.description || '',
        tags: r.tags || [],
        location: r.location || '',
        date: r.date || '',
        image_tags: r.image_tags || [],
        image_description: r.image_description || ''
      }));

      console.log(`[Fase 2] Puntuando ${full.length} candidatos`);

      const phase2Content = await callOpenAI([{
        role: 'user',
        content: `Búsqueda del usuario: "${text}"

Puntúa cada recuerdo del 0 al 100 según su relevancia con la búsqueda.
Considera TODOS los campos: title, description, tags, location, date, image_tags, image_description.
Sé preciso: puntajes altos (≥60) solo si hay relación fuerte.
Devuelve ÚNICAMENTE un array JSON con id y score: [{"id":"...","score":85},...]

Recuerdos:
${JSON.stringify(full)}`
      }], OPENAI_API_KEY, 600);

      if (phase2Content) {
        const scores = parseJSONArray(phase2Content);
        if (Array.isArray(scores)) {
          const scoreMap = {};
          scores.forEach(({ id, score }) => { scoreMap[String(id)] = Number(score) || 0; });
          scoredResults = candidates.map(r => ({
            ...r,
            score: scoreMap[String(r.id)] !== undefined ? scoreMap[String(r.id)] : 0
          }));
          console.log(`[Fase 2] Scores:`, scores);
        }
      }
    }

    // Fallback heurístico para fase 2 si OpenAI falló
    if (scoredResults.length === 0 && candidates.length > 0) {
      const normalize = (s = '') => s.toString().toLowerCase();
      const words = text.toLowerCase().split(/[^a-záéíóúñ0-9]+/).filter(w => w.length > 2);
      scoredResults = candidates.map(rec => {
        const haystack = [
          rec.title, rec.description, rec.location, rec.date,
          ...(rec.tags || []), ...(rec.image_tags || []),
          rec.image_description
        ].map(normalize).join(' ');
        let score = 0;
        words.forEach(w => {
          const count = (haystack.match(new RegExp(w, 'g')) || []).length;
          score += count * 5;
        });
        return { ...rec, score };
      });
    }

    // Ordenar y devolver top 5
    scoredResults.sort((a, b) => (b.score || 0) - (a.score || 0));
    const top = scoredResults.filter(r => (r.score || 0) > 0).slice(0, 5);

    return {
      statusCode: 200,
      body: JSON.stringify({ results: top })
    };

  } catch (error) {
    console.error('searchRecuerdos Error', error);
    return { statusCode: 500, body: JSON.stringify({ message: 'Error interno' }) };
  }
};
