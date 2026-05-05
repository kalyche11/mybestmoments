import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_TABLE = process.env.SUPABASE_EMBEDDINGS_TABLE;

const getSupabaseHeaders = () => {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados');
  }
  if (!SUPABASE_TABLE) {
    throw new Error('SUPABASE_EMBEDDINGS_TABLE no configurado. Usa SUPABASE_EMBEDDINGS_TABLE=mybestmoments.');
  }
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  };
};

export const saveEmbeddingToSupabase = async (memoryId, embedding) => {
  const filter = `memory_id=eq.${encodeURIComponent(String(memoryId))}`;
  const patchUrl = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?${filter}`;
  const patchRes = await fetch(patchUrl, {
    method: 'PATCH',
    headers: {
      ...getSupabaseHeaders(),
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ embeddings_memory: embedding }),
  });

  if (!patchRes.ok) {
    const text = await patchRes.text();
    throw new Error(`Supabase saveEmbedding patch failed (${SUPABASE_TABLE}): ${patchRes.status} ${text}`);
  }

  const patchedRows = await patchRes.json();
  if (Array.isArray(patchedRows) && patchedRows.length > 0) {
    return;
  }

  const insertUrl = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`;
  const insertRes = await fetch(insertUrl, {
    method: 'POST',
    headers: {
      ...getSupabaseHeaders(),
      Prefer: 'return=minimal',
    },
    body: JSON.stringify([{ memory_id: String(memoryId), embeddings_memory: embedding }]),
  });

  if (!insertRes.ok) {
    const text = await insertRes.text();
    throw new Error(`Supabase saveEmbedding insert failed (${SUPABASE_TABLE}): ${insertRes.status} ${text}`);
  }
};

export const deleteEmbeddingFromSupabase = async (memoryId) => {
  const url = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?memory_id=eq.${encodeURIComponent(String(memoryId))}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      ...getSupabaseHeaders(),
      Prefer: 'return=minimal',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase deleteEmbedding failed (${SUPABASE_TABLE}): ${res.status} ${text}`);
  }
};

export const embeddingExistsInSupabase = async (memoryId) => {
  const url = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?select=memory_id&memory_id=eq.${encodeURIComponent(String(memoryId))}&limit=1`;
  const res = await fetch(url, {
    method: 'GET',
    headers: getSupabaseHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase embeddingExists failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return Array.isArray(data) && data.length > 0;
};

export const searchEmbeddingsInSupabase = async (queryEmbedding, threshold = 0.25, limit = 5) => {
  const url = `${SUPABASE_URL}/rest/v1/rpc/match_embeddings`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getSupabaseHeaders(),
    body: JSON.stringify({
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase searchEmbeddings failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};
