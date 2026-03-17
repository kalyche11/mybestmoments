

export const handler = async function(event, context) {
  if (event.httpMethod !== 'PUT') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { VITE_BIN_ID, VITE_MASTER_KEY } = process.env;
  const BASE_URL = `https://api.jsonbin.io/v3/b/${VITE_BIN_ID}`;
  const { id } = JSON.parse(event.body);

  try {
    // Leer siempre desde el bin para no perder campos como image_tags / image_description
    const resGet = await fetch(`${BASE_URL}/latest`, {
      headers: { 'X-Master-Key': VITE_MASTER_KEY }
    });
    if (!resGet.ok) {
      return { statusCode: 502, body: JSON.stringify({ message: 'Error al obtener recuerdos' }) };
    }
    const data = await resGet.json();

    const actualizado = data.record.map((item) =>
      item.id === id ? { ...item, favorite: !item.favorite } : item
    );

    const resPut = await fetch(BASE_URL, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': VITE_MASTER_KEY
        },
        body: JSON.stringify(actualizado)
    });

    if (resPut.ok) {
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Favorite updated' })
        };
    } else {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Something went wrong' })
        };
    }

  } catch {
      return {
          statusCode: 500,
          body: JSON.stringify({ message: 'Something went wrong' })
      };
  }
};
