

export const handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { VITE_BIN_ID, VITE_MASTER_KEY } = process.env;
  const BASE_URL = `https://api.jsonbin.io/v3/b/${VITE_BIN_ID}`;
  const nuevoRecuerdo = JSON.parse(event.body);

  try {
    const resGet = await fetch(`${BASE_URL}/latest`, {
        headers: { "X-Master-Key": VITE_MASTER_KEY }
    });
    const data = await resGet.json();
    const actualizado = [...data.record, nuevoRecuerdo];

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