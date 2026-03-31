
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

// ── Preprocesa un record para construir el texto que se embebe ───────────────
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
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
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

export const handler = async function(event) {
  if (event.httpMethod !== 'PUT') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { VITE_BIN_ID, VITE_MASTER_KEY, OPENAI_API_KEY } = process.env;
  const BASE_URL = `https://api.jsonbin.io/v3/b/${VITE_BIN_ID}`;
  const { id, recuerdo } = JSON.parse(event.body);

  try {
    const resGet = await fetch(`${BASE_URL}/latest`, {
        headers: { "X-Master-Key": VITE_MASTER_KEY }
    });
    const data = await resGet.json();

    // Re-analizar imágenes si: cambiaron O si faltan image_tags / image_description
    const existing = data.record.find(item => item.id === id);
    const newImages = Array.isArray(recuerdo.images) ? recuerdo.images : [];
    const oldImages = existing && Array.isArray(existing.images) ? existing.images : [];
    const imagesChanged = JSON.stringify(newImages) !== JSON.stringify(oldImages);
    const urlChanged = (recuerdo.url || '') !== (existing?.url || '');
    const missingVisionData = !existing?.image_tags || existing.image_tags.length === 0 || !existing?.image_description;
    const allImages = [recuerdo.url || existing?.url, ...newImages].filter(Boolean);
    let updatedVisionData;
    if (allImages.length > 0 && (imagesChanged || urlChanged || missingVisionData)) {
      const meta = { title: recuerdo.title ?? existing?.title, description: recuerdo.description ?? existing?.description, location: recuerdo.location ?? existing?.location, tags: recuerdo.tags ?? existing?.tags };
      updatedVisionData = await analyzeImages(allImages, meta, OPENAI_API_KEY);
    }

    // ── Recalcular embedding si cambiaron campos semánticos ───────────────────
    // Se dispara si: faltan campos de texto, cambió algún campo semántico,
    // o se acaban de regenerar image_tags/image_description.
    const missingEmbedding = !existing?.embedding || !Array.isArray(existing.embedding) || existing.embedding.length === 0;
    const textFieldsChanged =
      (recuerdo.title       !== undefined && recuerdo.title       !== existing?.title)       ||
      (recuerdo.description !== undefined && recuerdo.description !== existing?.description) ||
      (recuerdo.location    !== undefined && recuerdo.location    !== existing?.location)    ||
      JSON.stringify(recuerdo.tags ?? existing?.tags ?? []) !== JSON.stringify(existing?.tags ?? []);

    let updatedEmbedding;
    if (missingEmbedding || textFieldsChanged || updatedVisionData !== undefined) {
      // Fusionar campos para tener el texto más actualizado posible antes de embeber.
      const mergedForEmbedding = { ...existing, ...recuerdo };
      if (updatedVisionData !== undefined) {
        mergedForEmbedding.image_tags        = updatedVisionData.image_tags;
        mergedForEmbedding.image_description = updatedVisionData.image_description;
      }
      const embeddingText = preprocessRecord(mergedForEmbedding);
      updatedEmbedding = await createEmbedding(embeddingText, OPENAI_API_KEY);
      console.log('[actualizarRecuerdo] Embedding recalculado:', !!updatedEmbedding);
      // Si OpenAI falla, updatedEmbedding queda null → se conserva el embedding anterior.
    }

    const actualizado = data.record.map((item) => {
      if (item.id !== id) return item;
      const merged = { ...item, ...recuerdo };
      if (updatedVisionData !== undefined) {
        merged.image_tags        = updatedVisionData.image_tags;
        merged.image_description = updatedVisionData.image_description;
      }
      // Solo sobrescribir embedding si se generó uno nuevo válido.
      if (updatedEmbedding) merged.embedding = updatedEmbedding;
      return merged;
    });

    const resPut = await fetch(BASE_URL, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "X-Master-Key": VITE_MASTER_KEY
        },
        body: JSON.stringify(actualizado)
    });

    const result = await resPut.json();

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
