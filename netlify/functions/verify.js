import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const authHeader = event.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return { statusCode: 401, body: JSON.stringify({ valid: false }) };
    }

    const decoded = jwt.verify(token, SECRET);

    // solo permitir al usuario correcto
    if (decoded.username !== process.env.VITE_USER1) {
      return { statusCode: 403, body: JSON.stringify({ valid: false }) };
    }

    return { statusCode: 200, body: JSON.stringify({ valid: true, user: decoded.username }) };
  } catch {
    return { statusCode: 401, body: JSON.stringify({ valid: false }) };
  }
}
