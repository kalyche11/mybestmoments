const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

exports.handler = async function(event, context) {
  const {  VITE_MASTER_KEY } = process.env;
  const BASE_URL = `https://api.jsonbin.io/v3/b/${VITE_MASTER_KEY}`;

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
        body: JSON.stringify({ message: "Failed to fetch data" })
      };
    }

    const data = await res.json();
    console.log("Data from API:", data);

    const sortedData = data.record.sort((a, b) => b.favorite - a.favorite);
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