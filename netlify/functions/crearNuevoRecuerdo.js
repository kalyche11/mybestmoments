
// Extrae el primer bloque JSON de un string (maneja markdown ```json ... ```)
const extractJSON = (text) => {
  const stripped = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
  const brace = stripped.indexOf('{');
  if (brace < 0) throw new Error(`No se encontró '{' en: ${stripped.slice(0, 120)}`);
  let depth = 0, end = -1;
  for (let i = brace; i < stripped.length; i++) {
    if (stripped[i] === '{') depth++;
    else if (stripped[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) throw new Error('JSON incompleto (no cierra {)');
  return JSON.parse(stripped.slice(brace, end + 1));
};

// Analiza TODAS las imágenes del recuerdo con OpenAI Vision (gpt-4o-mini).
const analyzeImages = async (allImages, meta, apiKey) => {
  const empty = { image_tags: [], image_description: '' };
  if (!apiKey || !Array.isArray(allImages) || allImages.length === 0) return empty;
  const metaText = `título="${meta.title||''}", descripción="${meta.description||''}", lugar="${meta.location||''}", tags=[${(meta.tags||[]).join(',')}]`;
  try {
    // Formato correcto para /v1/chat/completions con visión
    const imageContent = allImages.map(url => ({
      type: 'image_url',
      image_url: { url, detail: 'low' }
    }));
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
      console.error('Vision error status:', res.status, errText);
      return empty;
    }
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content || '';
    console.log('Vision raw response:', text.slice(0, 300));
    const parsed = extractJSON(text);
    return {
      image_tags: Array.isArray(parsed.image_tags) ? parsed.image_tags.map(t => t.toString().toLowerCase()) : [],
      image_description: typeof parsed.image_description === 'string' ? parsed.image_description.slice(0, 300) : ''
    };
  } catch (e) {
    console.error('analyzeImages error:', e.message);
    return empty;
  }
};

export const handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { VITE_BIN_ID, VITE_MASTER_KEY, OPENAI_API_KEY } = process.env;
  const BASE_URL = `https://api.jsonbin.io/v3/b/${VITE_BIN_ID}`;
  const nuevoRecuerdo = JSON.parse(event.body);

  // Analizar TODAS las imágenes (url principal + images[]) antes de guardar
  const allImages = [nuevoRecuerdo.url, ...(Array.isArray(nuevoRecuerdo.images) ? nuevoRecuerdo.images : [])].filter(Boolean);
  console.log('crearNuevoRecuerdo → allImages:', allImages.length, allImages);
  console.log('crearNuevoRecuerdo → OPENAI_API_KEY present:', !!OPENAI_API_KEY);
  const meta = { title: nuevoRecuerdo.title, description: nuevoRecuerdo.description, location: nuevoRecuerdo.location, tags: nuevoRecuerdo.tags };
  const { image_tags, image_description } = allImages.length
    ? await analyzeImages(allImages, meta, OPENAI_API_KEY)
    : { image_tags: [], image_description: '' };
  console.log('crearNuevoRecuerdo → vision result:', { image_tags, image_description: image_description?.slice(0, 80) });
  const recuerdoConTags = { ...nuevoRecuerdo, image_tags, image_description };

  try {
    const resGet = await fetch(`${BASE_URL}/latest`, {
        headers: { "X-Master-Key": VITE_MASTER_KEY }
    });
    const data = await resGet.json();
    const actualizado = [...data.record, recuerdoConTags];

    const resPatch = await fetch(BASE_URL, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "X-Master-Key": VITE_MASTER_KEY
        },
        body: JSON.stringify(actualizado)
    });

    const result = await resPatch.json();

    return {
        statusCode: 200,
        body: JSON.stringify(result)
    };
  } catch {
      return {
          statusCode: 500,
          body: JSON.stringify({ message: "Something went wrong" })
      };
  }
};