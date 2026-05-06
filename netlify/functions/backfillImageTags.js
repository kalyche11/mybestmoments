// backfillImageTags.js
// Endpoint de mantenimiento usado por el boton "Analizar imagenes".
// Completa image_tags/image_description en JSONBin cuando falten y asegura que
// cada recuerdo tenga su embedding guardado en Supabase por memory_id.

import { saveEmbeddingToSupabase, embeddingExistsInSupabase } from './supabaseClient.js';

const hasImages = (record) =>
  Boolean(record?.url) || (Array.isArray(record?.images) && record.images.length > 0);

const getAllImages = (record) =>
  [record?.url, ...(Array.isArray(record?.images) ? record.images : [])].filter(Boolean);

const hasVisionData = (record) =>
  Array.isArray(record?.image_tags) &&
  record.image_tags.length > 0 &&
  typeof record?.image_description === 'string' &&
  record.image_description.trim().length > 0;

const extractJSON = (text) => {
  const stripped = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
  const brace = stripped.indexOf('{');
  if (brace < 0) throw new Error(`No se encontro '{' en: ${stripped.slice(0, 120)}`);

  let depth = 0;
  let end = -1;
  for (let i = brace; i < stripped.length; i++) {
    if (stripped[i] === '{') depth++;
    if (stripped[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (end < 0) throw new Error('JSON incompleto');
  return JSON.parse(stripped.slice(brace, end + 1));
};

const analyzeImages = async (allImages, meta, apiKey) => {
  if (!apiKey || !Array.isArray(allImages) || allImages.length === 0) {
    return { ok: false, image_tags: [], image_description: '' };
  }

  const metaText = `titulo="${meta.title || ''}", descripcion="${meta.description || ''}", lugar="${meta.location || ''}", tags=[${(meta.tags || []).join(',')}]`;
  const imageContent = allImages.map((url) => ({
    type: 'image_url',
    image_url: { url, detail: 'low' },
  }));

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analiza TODAS estas imagenes junto con estos datos: ${metaText}. Devuelve unicamente JSON valido con: image_tags (array de strings en minusculas, maximo 20, cubriendo objetos, colores, ropa, emociones, entorno y detalles visuales) e image_description (string en espanol, maximo 300 caracteres, describiendo detalles especificos de cada imagen separados por punto y coma).`,
              },
              ...imageContent,
            ],
          },
        ],
        max_tokens: 400,
        temperature: 0,
      }),
    });

    if (!res.ok) {
      console.error('[backfill] Vision HTTP error:', res.status, await res.text());
      return { ok: false, image_tags: [], image_description: '' };
    }

    const json = await res.json();
    const rawText = json?.choices?.[0]?.message?.content || '';
    const parsed = extractJSON(rawText);

    return {
      ok: true,
      image_tags: Array.isArray(parsed.image_tags)
        ? parsed.image_tags.map((tag) => tag.toString().trim().toLowerCase()).filter(Boolean).slice(0, 20)
        : [],
      image_description:
        typeof parsed.image_description === 'string'
          ? parsed.image_description.trim().slice(0, 300)
          : '',
    };
  } catch (error) {
    console.error('[backfill] analyzeImages error:', error.message);
    return { ok: false, image_tags: [], image_description: '' };
  }
};

const preprocessRecord = (record) => {
  const parts = [
    record.title || '',
    record.description || '',
    (record.tags || []).join(' '),
    record.location || '',
    record.image_description || '',
    (record.image_tags || []).join(' '),
  ];

  return parts.map((part) => part.trim().toLowerCase()).filter(Boolean).join(' ');
};

const createEmbedding = async (text, apiKey) => {
  if (!apiKey || !text) return null;

  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
    });

    if (!res.ok) {
      console.error('[backfill] Embedding HTTP error:', res.status, await res.text());
      return null;
    }

    const json = await res.json();
    return json?.data?.[0]?.embedding ?? null;
  } catch (error) {
    console.error('[backfill] createEmbedding error:', error.message);
    return null;
  }
};

export const handler = async function (event) {
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { OPENAI_API_KEY, VITE_BIN_ID, VITE_MASTER_KEY, BACKFILL_SECRET } = process.env;

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

  try {
    const resGet = await fetch(`${BASE_URL}/latest`, {
      headers: { 'X-Master-Key': VITE_MASTER_KEY },
    });

    if (!resGet.ok) {
      return { statusCode: 502, body: JSON.stringify({ message: 'Error al obtener recuerdos' }) };
    }

    const data = await resGet.json();
    const records = Array.isArray(data.record) ? data.record : [];

    let updated = 0;
    let omitted = 0;
    let embeddingsCreated = 0;
    let embeddingsSkipped = 0;
    let errors = 0;
    let jsonbinChanged = false;
    const details = {};
    const updatedRecords = [];

    for (const record of records) {
      const nextRecord = { ...record };
      const id = nextRecord.id;
      const detail = {
        imageTags: 'skipped',
        embedding: 'skipped',
      };

      const needsVision = hasImages(nextRecord) && !hasVisionData(nextRecord);
      let visionReadyForEmbedding = !needsVision;

      if (needsVision) {
        const meta = {
          title: nextRecord.title,
          description: nextRecord.description,
          location: nextRecord.location,
          tags: nextRecord.tags,
        };
        const vision = await analyzeImages(getAllImages(nextRecord), meta, OPENAI_API_KEY);

        if (vision.ok && (vision.image_tags.length > 0 || vision.image_description)) {
          nextRecord.image_tags = vision.image_tags;
          nextRecord.image_description = vision.image_description;
          jsonbinChanged = true;
          updated++;
          detail.imageTags = 'updated';
          visionReadyForEmbedding = true;
        } else {
          errors++;
          detail.imageTags = 'error';
        }
      } else {
        omitted++;
      }

      try {
        if (!visionReadyForEmbedding) {
          embeddingsSkipped++;
          detail.embedding = 'waiting_for_image_analysis';
          delete nextRecord.embedding;
          updatedRecords.push(nextRecord);
          details[id] = detail;
          continue;
        }

        const exists = await embeddingExistsInSupabase(id);
        if (exists) {
          embeddingsSkipped++;
          detail.embedding = 'exists';
        } else {
          const text = preprocessRecord(nextRecord);
          const embedding = await createEmbedding(text, OPENAI_API_KEY);

          if (!embedding) {
            errors++;
            detail.embedding = text ? 'error' : 'empty_text';
          } else {
            await saveEmbeddingToSupabase(id, embedding);
            embeddingsCreated++;
            detail.embedding = 'created';
          }
        }
      } catch (error) {
        errors++;
        detail.embedding = 'error';
        console.error('[backfill] Error procesando embedding para record', id, error.message);
      }

      if (detail.imageTags !== 'skipped' || detail.embedding !== 'exists') {
        details[id] = detail;
      }

      delete nextRecord.embedding;
      updatedRecords.push(nextRecord);
    }

    if (jsonbinChanged) {
      const resPut = await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': VITE_MASTER_KEY,
        },
        body: JSON.stringify(updatedRecords),
      });

      const putText = await resPut.text();
      if (!resPut.ok) {
        return {
          statusCode: 502,
          body: JSON.stringify({ message: 'Error al guardar recuerdos', detail: putText }),
        };
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Analisis de imagenes y embeddings completado',
        updated,
        omitted,
        embeddingsCreated,
        embeddingsSkipped,
        errors,
        details,
      }),
    };
  } catch (error) {
    console.error('backfillImageTags error:', error);
    return { statusCode: 500, body: JSON.stringify({ message: 'Error interno', error: error.message }) };
  }
};
