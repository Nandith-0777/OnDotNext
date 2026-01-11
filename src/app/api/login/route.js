// NOTES: This API route handles login.
// - It has been MODIFIED to return the `uid` and `name` along with `sid` and `session_id`.

import axios from "axios";

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    const authPayload = {
      jsonrpc: "2.0",
      method: "call",
      params: {
        db: "liveone",
        login: username.toUpperCase(),
        password: password,
        base_location: "https://erp.vidyaacademy.ac.in",
        context: {},
      },
      id: "r7",
    };

    const authResponse = await axios.post(
      "https://erp.vidyaacademy.ac.in/web/session/authenticate",
      authPayload
    );

    const authResult = authResponse.data;

    if (authResult.result && authResult.result.uid) {
      const sid = authResponse.headers["set-cookie"][0]
        .split(";")[0]
        .split("=")[1];
      const { session_id, uid } = authResult.result;

      // After successful login, fetch the user's name
      const userContext = { lang: "en_GB", tz: "Asia/Kolkata", uid: uid };
      const userReadPayload = {
        jsonrpc: "2.0",
        method: "call",
        params: {
          model: "res.users",
          method: "read",
          args: [uid, ["name"]],
          kwargs: {},
          session_id: session_id,
          context: userContext,
        },
        id: "r8", // Use a different ID for the new request
      };

      const userResponse = await axios.post(
        "https://erp.vidyaacademy.ac.in/web/dataset/call_kw",
        userReadPayload,
        { headers: { Cookie: `sid=${sid}` } }
      );

      const name = userResponse.data.result.name;

      // Return all credentials including the name
      return new Response(JSON.stringify({ sid, session_id, uid, name }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      return new Response(
        JSON.stringify({ error: "Incorrect username or password." }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Login API Error:", error.message);
    return new Response(
      JSON.stringify({
        error: "Login failed on the server.",
        details: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
