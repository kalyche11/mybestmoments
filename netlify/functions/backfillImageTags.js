// backfillImageTags.js
// Función de migración: analiza con OpenAI Vision la primera imagen de cada
// recuerdo que NO tenga image_tags (o los tenga vacíos) y persiste los tags en el JSON bin.
// Llamar una sola vez vía POST /.netlify/functions/backfillImageTags
// Variables de entorno requeridas: OPENAI_API_KEY, VITE_BIN_ID, VITE_MASTER_KEY

// Extrae el primer bloque JSON de un string (maneja markdown ```json ... ```)
const extractJSON = (text) => {
  // Quitar bloques de código markdown si los hay
  const stripped = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
  const brace = stripped.indexOf('{');
  if (brace < 0) throw new Error(`No se encontró '{' en: ${stripped.slice(0, 120)}`);
  // Encontrar el cierre correspondiente
  let depth = 0, end = -1;
  for (let i = brace; i < stripped.length; i++) {
    if (stripped[i] === '{') depth++;
    else if (stripped[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) throw new Error('JSON incompleto (no cierra {)');
  return JSON.parse(stripped.slice(brace, end + 1));
};

// Analiza TODAS las imágenes con OpenAI Vision (gpt-4o-mini).
// allImages = [url_principal, ...images_adicionales].filter(Boolean)
// meta = { title, description, location, tags } para prompt más completo.
// Devuelve { image_tags, image_description }.
const analyzeImages = async (allImages, meta, apiKey) => {
  const empty = { image_tags: [], image_description: '' };
  if (!apiKey || !Array.isArray(allImages) || allImages.length === 0) return empty;
  const metaText = `título="${meta.title||''}", descripción="${meta.description||''}", lugar="${meta.location||''}", tags=[${(meta.tags||[]).join(',')}]`;
  try {
    const imageContent = allImages.map(url => ({
      type: 'image_url',
      image_url: { url, detail: 'low' }
    }));
    console.log(`  → Llamando a OpenAI Vision con ${allImages.length} imagen(es):`, allImages);
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: `Analiza TODAS estas imágenes (no solo la primera) junto con estos datos: ${metaText}. Devuelve ÚNICAMENTE JSON válido con: image_tags (array de strings en minúsculas, máx. 20, debe cubrir detalles visuales de TODAS las imágenes: colores, objetos, accesorios, ropa, emociones, entorno) e image_description (string en español, máx. 300 caracteres, describe detalles visuales específicos de CADA imagen separados por punto y coma). Ejemplo: {"image_tags":["playa","collar blanco","vestido azul","cubetas rojas","arena","atardecer"],"image_description":"Mujer con collar blanco y vestido azul sonriendo en playa; niños jugando con cubetas rojas en arena; atardecer naranja sobre mar turquesa con palmeras"}` },
              ...imageContent
            ]
          }
        ],
        max_tokens: 400,
        temperature: 0
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('  ✗ Vision HTTP error', res.status, ':', errText);
      return empty;
    }
    const json = await res.json();
    const rawText = json?.choices?.[0]?.message?.content || '';
    console.log('  ← OpenAI raw response:', rawText);
    const parsed = extractJSON(rawText);
    console.log('  ← Parsed:', JSON.stringify(parsed));
    const result = {
      image_tags: Array.isArray(parsed.image_tags) ? parsed.image_tags.map(t => t.toString().toLowerCase()) : [],
      image_description: typeof parsed.image_description === 'string' ? parsed.image_description.slice(0, 300) : ''
    };
    console.log('  ← Result:', JSON.stringify(result));
    return result;
  } catch (e) {
    console.error('  ✗ analyzeImages error:', e.message);
    return empty;
  }
};

export const handler = async function(event) {
  // Acepta GET (fácil de probar desde el navegador) y POST
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { VITE_BIN_ID, VITE_MASTER_KEY, OPENAI_API_KEY } = process.env;

  if (!OPENAI_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ message: 'OPENAI_API_KEY no configurada' }) };
  }

  const BASE_URL = `https://api.jsonbin.io/v3/b/${VITE_BIN_ID}`;

  try {
    const resGet = await fetch(`${BASE_URL}/latest`, {
      headers: { 'X-Master-Key': VITE_MASTER_KEY }
    });
    if (!resGet.ok) {
      return { statusCode: 502, body: JSON.stringify({ message: 'Error al obtener recuerdos' }) };
    }
    const data = await resGet.json();
    const records = Array.isArray(data.record) ? data.record : [];

    // Procesar los que NO tienen image_tags, los tienen vacíos, o falta image_description
    const needsAnalysis = records.filter(
      r => (r.url || (Array.isArray(r.images) && r.images.length > 0)) &&
           (!Array.isArray(r.image_tags) || r.image_tags.length === 0 || !r.image_description)
    );

    if (needsAnalysis.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Todos los recuerdos ya tienen image_tags', updated: 0 })
      };
    }

    console.log(`Backfill: ${records.length} recuerdos totales, ${needsAnalysis.length} necesitan análisis`);
    needsAnalysis.forEach(r => console.log(`  pendiente → id=${r.id} url="${r.url}" images=${JSON.stringify(r.images)}`));

    // Analizar TODAS las imágenes de cada recuerdo, una a una para no saturar la API
    const visionMap = {};
    for (const rec of needsAnalysis) {
      try {
        const allImages = [rec.url, ...(rec.images||[])].filter(Boolean);
        const meta = { title: rec.title, description: rec.description, location: rec.location, tags: rec.tags };
        const result = await analyzeImages(allImages, meta, OPENAI_API_KEY);
        visionMap[rec.id] = result;
        console.log(`  ✓ ${rec.id}: tags=[${result.image_tags.join(', ')}] desc="${result.image_description}"`);
      } catch (e) {
        console.warn(`  ✗ ${rec.id}: error al analizar — ${e.message}`);
        visionMap[rec.id] = { image_tags: [], image_description: '' };
      }
    }

    // Construir array actualizado con image_tags e image_description
    const updatedRecords = records.map(rec => {
      if (visionMap[rec.id] !== undefined) {
        const updated = { ...rec, image_tags: visionMap[rec.id].image_tags, image_description: visionMap[rec.id].image_description };
        console.log(`  MERGE id=${rec.id} → image_tags=${JSON.stringify(updated.image_tags)} image_description="${updated.image_description}"`);
        return updated;
      }
      return rec;
    });
    console.log(`updatedRecords count: ${updatedRecords.length}`);
    console.log('Sample updated record:', JSON.stringify(updatedRecords.find(r => visionMap[r.id]) || updatedRecords[0]));

    // Guardar en el JSON bin
    console.log('Guardando en JSON bin...');
    const resPut = await fetch(BASE_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': VITE_MASTER_KEY
      },
      body: JSON.stringify(updatedRecords)
    });
    const putText = await resPut.text();
    console.log('JSON bin PUT status:', resPut.status, '— response:', putText.slice(0, 200));

    if (!resPut.ok) {
      return { statusCode: 502, body: JSON.stringify({ message: 'Error al guardar recuerdos', detail: putText }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `image_tags e image_description actualizados en ${needsAnalysis.length} recuerdos`,
        updated: needsAnalysis.length,
        details: visionMap
      })
    };

  } catch (error) {
    console.error('backfillImageTags error:', error);
    return { statusCode: 500, body: JSON.stringify({ message: 'Error interno', error: error.message }) };
  }
};
