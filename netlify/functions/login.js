exports.handler = async function(event) {
  // We only care about POST requests to this function
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Get the username and password from the request body
    const { username, password } = JSON.parse(event.body);
    
    // Get the secret credentials from the environment variables
    const { VITE_USER1, VITE_USER2, VITE_PASSWORD } = process.env;

    // Check if the credentials match
    if (
      (username === VITE_USER1) &&
      password === VITE_PASSWORD
    ) {
      // If they match, send back a success response.
      // In a real-world app, you would generate and return a JWT (JSON Web Token) here for session management.
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, username }),
      };
    } else {
      // If they don't match, send back an error.
      return {
        statusCode: 401,
        body: JSON.stringify({ success: false, message: 'Invalid credentials' }),
      };
    }
  } catch (error) {
    // Handle any errors, like if the request body isn't valid JSON
    return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Bad Request' }) };
  }
};
