

export const handler = async function(event, context) {
  if (event.httpMethod !== 'DELETE') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { VITE_BIN_ID, VITE_MASTER_KEY } = process.env;
  const BASE_URL = `https://api.jsonbin.io/v3/b/${VITE_BIN_ID}`;
  const { id } = JSON.parse(event.body);

  try {
    const resGet = await fetch(`${BASE_URL}/latest`, {
        headers: { "X-Master-Key": VITE_MASTER_KEY }
    });
    const data = await resGet.json();
    const actualizado = data.record.filter((item) => item.id != id);

    const resPut = await fetch(BASE_URL, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "X-Master-Key": VITE_MASTER_KEY
        },
        body: JSON.stringify(actualizado)
    });

    if(resPut.ok){
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Memory deleted" })
        };
    }
    else{
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Something went wrong" })
        };
    }

  } catch {
      return {
          statusCode: 500,
          body: JSON.stringify({ message: "Something went wrong" })
      };
  }
};