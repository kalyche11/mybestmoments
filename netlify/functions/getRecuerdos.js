const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

exports.handler = async function(event, context) {
  const { VITE_BIN_ID, VITE_MASTER_KEY } = process.env;
  const BASE_URL = `https://api.jsonbin.io/v3/b/${VITE_BIN_ID}`;

  try {
    const res = await fetch(`${BASE_URL}/latest`, {
      headers: {
        "X-Master-Key": VITE_MASTER_KEY
      }
    });
    const data = await res.json();
    const sortedData = data.record.sort((a, b) => b.favorite - a.favorite);
    return {
      statusCode: 200,
      body: JSON.stringify(sortedData),
    };
  } catch {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Something went wrong" }),
    };
  }
};