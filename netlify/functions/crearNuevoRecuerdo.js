

// Analiza TODAS las imágenes del recuerdo con OpenAI Vision (gpt-4o-mini).
// allImages = [url_principal, ...images_adicionales].filter(Boolean)
// meta = { title, description, location, tags } para prompt más completo.
// Devuelve { image_tags: string[], image_description: string } (descripción máx. 60 chars).
// Solo se llama al crear o actualizar; nunca en cada búsqueda.
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
              { type: 'text', text: `Analiza estas imágenes junto con estos datos: ${metaText}. Devuelve ÚNICAMENTE JSON válido con: image_tags (array de strings en minúsculas, máx. 10) e image_description (string en español, máx. 60 caracteres, resumen descriptivo completo). Ejemplo: {"image_tags":["playa","sol","familia"],"image_description":"Tarde familiar en la playa de Málaga al atardecer"}` },
              ...imageContent
            ]
          }
        ],
        max_tokens: 300,
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
    const brace = text.indexOf('{');
    const parsed = JSON.parse(brace >= 0 ? text.slice(brace) : text);
    return {
      image_tags: Array.isArray(parsed.image_tags) ? parsed.image_tags.map(t => t.toString().toLowerCase()) : [],
      image_description: typeof parsed.image_description === 'string' ? parsed.image_description.slice(0, 60) : ''
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
  const meta = { title: nuevoRecuerdo.title, description: nuevoRecuerdo.description, location: nuevoRecuerdo.location, tags: nuevoRecuerdo.tags };
  const { image_tags, image_description } = allImages.length
    ? await analyzeImages(allImages, meta, OPENAI_API_KEY)
    : { image_tags: [], image_description: '' };
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