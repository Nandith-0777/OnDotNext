import axios from 'axios';

export async function POST(request) {
  try {
    const { sid, session_id } = await request.json();
    const baseURL = "https://erp.vidyaacademy.ac.in/web/dataset";

    let payload = {
      jsonrpc: "2.0",
      method: "call",
      params: {
        model: "vict.academics.duty.leave.status",
        method: "create",
        args: [{}],
        kwargs: { context: {} },
        session_id,
        context: {}
      }
    };

    const argsResponse = await axios.post(`${baseURL}/call_kw`, payload, { headers: { Cookie: `sid=${sid}` } });
    const args = argsResponse.data.result;

    payload = {
      jsonrpc: "2.0",
      method: "call",
      params: {
        model: "vict.academics.duty.leave.status",
        method: "button_check_status",
        domain_id: "null",
        context_id: 1,
        args: [[args], {}],
        session_id
      },
      id: "r54"
    };
    await axios.post(`${baseURL}/call_button`, payload, { headers: { Cookie: `sid=${sid}` } });

    payload = {
      jsonrpc: "2.0",
      method: "call",
      params: {
        model: "vict.academics.duty.leave.status",
        method: "read",
        args: [[args], ["atten_status"]],
        kwargs: { context: {} },
        session_id,
        context: {}
      }
    };

    const attenResponse = await axios.post(`${baseURL}/call_kw`, payload, { headers: { Cookie: `sid=${sid}` } });
    const subs = attenResponse.data.result[0].atten_status;

    payload = {
      jsonrpc: "2.0",
      method: "call",
      params: {
        model: "vict.academics.duty.leave.status.lines",
        method: "read",
        args: [subs, ["course", "course_percentage"]],
        kwargs: { context: {} },
        session_id,
        context: {}
      }
    };

    const attendanceResponse = await axios.post(`${baseURL}/call_kw`, payload, { headers: { Cookie: `sid=${sid}` } });
    const attendanceData = attendanceResponse.data.result;

    const attendance = {};
    attendanceData.forEach(item => {
      attendance[item.course[1]] = item.course_percentage;
    });

    return new Response(JSON.stringify(attendance), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}