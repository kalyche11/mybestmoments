import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { username, password } = JSON.parse(event.body);

    const { VITE_USER1, VITE_PASSWORD } = process.env;

    if (username === VITE_USER1 && password === VITE_PASSWORD) {
      const token = jwt.sign({ username }, SECRET, { expiresIn: "2h" });

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, token, username }),
      };
    }

    return {
      statusCode: 401,
      body: JSON.stringify({ success: false, message: "Ya no puede entrar bro :(" }),
    };
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, message: "Bad Request" }),
    };
  }
}
