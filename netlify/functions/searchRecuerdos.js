// Serverless function: recibe texto, pide a OpenAI extraer tags/title/description/location
// y filtra los recuerdos almacenados en el JSON bin. Variables de entorno requeridas:
// - OPENAI_API_KEY
// - VITE_BIN_ID
// - VITE_MASTER_KEY

export const handler = async function(event, context) {
  try {
    const { OPENAI_API_KEY, VITE_BIN_ID, VITE_MASTER_KEY } = process.env;
    const openaiAvailable = Boolean(OPENAI_API_KEY && OPENAI_API_KEY.length > 10);
    if (!openaiAvailable) {
      console.warn('OPENAI_API_KEY no configurada — usando modo heurístico/mock para desarrollo');
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const { text = '', filters = { tags: true, title: true, description: true, location: true } } = body;

    if (!text || text.trim().length === 0) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Texto vacío' }) };
    }

    // Llamada a OpenAI para extraer entidades relevantes en formato JSON
    const systemPrompt = `Eres un extractor. Devuelve sólo JSON con las claves: tags (array de strings), title_terms (array), description_terms (array), location_terms (array).`;
    const userPrompt = `Extrae de este texto las etiquetas (tags), palabras clave de título, ideas clave de la descripción y localizaciones relevantes. Responde únicamente con JSON válido. Texto:\n\n"""${text.replace(/\"/g,'\\\"')}"""`;

    let extracted = { tags: [], title_terms: [], description_terms: [], location_terms: [] };
    if (openaiAvailable) {
      const oaRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 300,
          temperature: 0.2
        })
      });

      if (!oaRes.ok) {
        const txt = await oaRes.text();
        console.error('OpenAI error:', txt);
        // fallback to heuristic instead of failing
        console.warn('Fallo OpenAI — usando heurística');
      } else {
        const oaJson = await oaRes.json();
        const content = oaJson?.choices?.[0]?.message?.content || '';
        try {
          const firstBrace = content.indexOf('{');
          const jsonText = firstBrace >= 0 ? content.slice(firstBrace) : content;
          extracted = JSON.parse(jsonText);
        } catch (e) {
          console.warn('No se pudo parsear JSON de OpenAI, intentando heurística');
        }
      }
    }

    // If OpenAI not used or parsing failed, use simple heuristic extraction
    if (!extracted || (!extracted.tags?.length && !extracted.title_terms?.length && !extracted.description_terms?.length && !extracted.location_terms?.length)) {
      const words = text.toLowerCase().split(/[^a-záéíóúñ0-9]+/).filter(w => w.length > 2);
      const freq = {};
      words.forEach(w => { freq[w] = (freq[w]||0) + 1; });
      const sorted = Object.keys(freq).sort((a,b)=>freq[b]-freq[a]).slice(0,8);
      extracted = {
        tags: sorted.slice(0,6),
        title_terms: sorted.slice(0,4),
        description_terms: sorted.slice(0,6),
        location_terms: []
      };
    }

    // Traer recuerdos (JSON bin)
    const BASE_URL = `https://api.jsonbin.io/v3/b/${VITE_BIN_ID}`;
    const res = await fetch(`${BASE_URL}/latest`, {
      headers: { 'X-Master-Key': VITE_MASTER_KEY }
    });
    if (!res.ok) {
      console.error('JSON Bin error', await res.text());
      return { statusCode: 502, body: JSON.stringify({ message: 'Error al obtener recuerdos' }) };
    }
    const bin = await res.json();
    const records = Array.isArray(bin.record) ? bin.record : [];

    // Normalizar helpers
    const normalize = (s='') => s.toString().toLowerCase();

    // Prepare search terms from extracted
    const tagTerms = (extracted.tags || []).map(t=>normalize(t));
    const titleTerms = (extracted.title_terms || []).map(t=>normalize(t));
    const descTerms = (extracted.description_terms || []).map(t=>normalize(t));
    const locTerms = (extracted.location_terms || []).map(t=>normalize(t));

    // Scoring con OpenAI: pasa el JSON completo de recuerdos para puntuar cada uno (0-100)
    const scoreWithOpenAI = async (recs, searchText) => {
      if (!openaiAvailable || !recs.length) return null;
      try {
        const compact = recs.map(r => ({
          id: r.id,
          title: r.title || '',
          description: r.description || '',
          tags: r.tags || [],
          location: r.location || '',
          image_tags: r.image_tags || [],
          image_description: r.image_description || ''
        }));
        const oaRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'user',
                content: `Texto de búsqueda: "${searchText}"\n\nPuntúa cada recuerdo del 0 al 100 según su relevancia. Considera title, description, tags, location, image_tags e image_description.\nDevuelve ÚNICAMENTE un array JSON válido: [{"id":"...","score":0},...]\n\nRecuerdos:\n${JSON.stringify(compact)}`
              }
            ],
            max_tokens: 600,
            temperature: 0
          })
        });
        if (!oaRes.ok) { console.warn('Scoring error:', await oaRes.text()); return null; }
        const oaJson = await oaRes.json();
        const content = oaJson?.choices?.[0]?.message?.content || '';
        const bracket = content.indexOf('[');
        const scoreArray = JSON.parse(bracket >= 0 ? content.slice(bracket) : content);
        if (!Array.isArray(scoreArray)) return null;
        const scoreMap = {};
        scoreArray.forEach(({ id, score }) => { scoreMap[id] = Number(score) || 0; });
        return scoreMap;
      } catch (e) {
        console.warn('scoreWithOpenAI error:', e.message);
        return null;
      }
    };

    // Puntuar todos los registros — OpenAI scoring con fallback heurístico
    const scoreMap = await scoreWithOpenAI(records, text);

    const scored = records.map(rec => {
      let score;
      if (scoreMap !== null) {
        // Score asignado por OpenAI (0-100)
        score = scoreMap[rec.id] !== undefined ? scoreMap[rec.id] : 0;
      } else {
        // Fallback: scoring heurístico local
        const recTags = Array.isArray(rec.tags) ? rec.tags.map(normalize) : [];
        const recTitle = normalize(rec.title || '');
        const recDesc = normalize(rec.description || '');
        const recLoc = normalize(rec.location || '');
        const imageTags = Array.isArray(rec.image_tags) ? rec.image_tags.map(normalize) : [];
        score = 0;
        tagTerms.forEach(t => {
          if (!t) return;
          if (recTags.includes(t)) score += 5;
          if (recTitle.includes(t)) score += 3;
          if (recDesc.includes(t)) score += 2;
          if (imageTags.includes(t)) score += 4;
        });
        titleTerms.forEach(t => { if (t && recTitle.includes(t)) score += 4; });
        descTerms.forEach(t => { if (t && recDesc.includes(t)) score += 2; });
        locTerms.forEach(t => { if (t && recLoc.includes(t)) score += 3; });
      }
      return { ...rec, score };
    });

    // Ordenar descendente por score, top 3 con score > 0
    const sortedByScore = scored.sort((a, b) => (b.score || 0) - (a.score || 0));
    const top = sortedByScore.filter(r => (r.score || 0) > 0).slice(0, 3);

    return {
      statusCode: 200,
      body: JSON.stringify({ extracted, results: top })
    };

  } catch (error) {
    console.error('searchRecuerdos Error', error);
    return { statusCode: 500, body: JSON.stringify({ message: 'Error interno' }) };
  }
};
