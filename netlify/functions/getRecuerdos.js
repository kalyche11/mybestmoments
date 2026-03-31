

export const handler = async function(event, context) {
  const { VITE_BIN_ID, VITE_MASTER_KEY } = process.env;
  const BASE_URL = `https://api.jsonbin.io/v3/b/${VITE_BIN_ID}`;

  try {
    const res = await fetch(`${BASE_URL}/latest`, {
      headers: {
        "X-Master-Key": VITE_MASTER_KEY
      }
    });

    if (!res.ok) {
      console.error("API Error:", await res.text());
      return {
        statusCode: res.status,
        body: JSON.stringify({ message: "Error al traer datos" })
      };
    }

    const data = await res.json();

    // Excluir el campo `embedding` de la respuesta al cliente.
    // Los embeddings son arrays de 1536 floats; enviarlos al frontend
    // inflaría innecesariamente el payload. Solo se usan server-side en searchRecuerdos.
    const sortedData = data.record
      .sort((a, b) => b.favorite - a.favorite)
      .map(({ embedding: _emb, ...rest }) => rest);

    return {
      statusCode: 200,
      body: JSON.stringify(sortedData),
    };
  } catch (error) {
    console.error("Function Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Something went wrong" }),
    };
  }
};