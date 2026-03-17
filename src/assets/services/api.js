export const getRecuerdos = async () => {
  const res = await fetch("/.netlify/functions/getRecuerdos");
  const data = await res.json();
  return data;
};

export const crearNuevoRecuerdo = async (nuevoRecuerdo) => {
  const res = await fetch("/.netlify/functions/crearNuevoRecuerdo", {
    method: "POST",
    body: JSON.stringify(nuevoRecuerdo),
  });
  return res.json();
};

export const actualizarRecuerdo = async (id, recuerdo) => {
  const res = await fetch("/.netlify/functions/actualizarRecuerdo", {
    method: "PUT",
    body: JSON.stringify({ id, recuerdo }),
  });
  return res.json();
};

export const deleteMemory = async (id) => {
  const res = await fetch("/.netlify/functions/deleteMemory", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  });
  return res.ok;
};

export function searchFilter(recuerdos, input) {
  const term = input.trim().toLowerCase();

  if (!term) return recuerdos;

  return recuerdos.filter(
    (item) =>
      item.location.toLowerCase().includes(term) ||
      item.tags.some((tag) => tag.toLowerCase().includes(term))
  );
}

export const updateFavorite = async (id) => {
  const res = await fetch("/.netlify/functions/updateFavorite", {
    method: "PUT",
    body: JSON.stringify({ id }),
  });
  return res.ok;
};

// Migración única: rellena image_tags en todos los recuerdos que no los tengan.
// Llamar desde la consola del navegador o desde un botón de admin:
//   import { backfillImageTags } from './services/api'; backfillImageTags();
export const backfillImageTags = async () => {
  const res = await fetch("/.netlify/functions/backfillImageTags", {
    method: "POST",
  });
  return res.json();
};