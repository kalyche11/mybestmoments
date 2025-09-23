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

    // Lista de usuarios autorizados
    const authorizedUsers = [process.env.VITE_USER1, process.env.VITE_USER2];

    // Verificar si el usuario del token NO está en la lista de autorizados
    if (!authorizedUsers.includes(decoded.username)) {
      return { statusCode: 403, body: JSON.stringify({ valid: false }) };
    }

    return { statusCode: 200, body: JSON.stringify({ valid: true, user: decoded.username }) };
  } catch (error) {
    // En caso de token inválido o expirado, jwt.verify lanza una excepción
    return { statusCode: 401, body: JSON.stringify({ valid: false }) };
  }
}