import axios from 'axios';

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    const payload = {
      jsonrpc: "2.0",
      method: "call",
      params: {
        db: "liveone",
        login: username.toUpperCase(),
        password: password,
        base_location: "https://erp.vidyaacademy.ac.in",
        context: {}
      },
      id: "r7"
    };

    const response = await axios.post(
      "https://erp.vidyaacademy.ac.in/web/session/authenticate",
      payload
    );

    const result = response.data;

    if (result.result && result.result.uid) {
      const sid = response.headers['set-cookie'][0].split(';')[0].split('=')[1];
      const session_id = result.result.session_id;

      return new Response(JSON.stringify({ sid, session_id }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify("wrong"), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: "Login failed", details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}