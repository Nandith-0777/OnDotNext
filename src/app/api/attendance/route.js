// NOTES: This API route fetches attendance.
// - The logic has been COMPLETELY REPLACED with our new, detailed method.
// - It now requires `sid`, `session_id`, and `uid`.
// - It fetches records in batches of 80 to handle API limits.

import axios from "axios";

export async function POST(request) {
  const baseURL = "https://erp.vidyaacademy.ac.in/web/dataset";

  try {
    const { sid, session_id, uid } = await request.json();
    if (!sid || !session_id || !uid) {
      return new Response(
        JSON.stringify({ error: "Missing session credentials." }),
        { status: 400 }
      );
    }

    const parsedUid = parseInt(uid);
    const context = { lang: "en_GB", tz: "Asia/Kolkata", uid: parsedUid };

    // --- API Call Sequence ---

    // 1. Get student_id and company_id automatically
    const defaultGetPayload = {
      jsonrpc: "2.0",
      method: "call",
      params: {
        model: "vict.academics.check.student.attendance",
        method: "default_get",
        args: [["student_id", "company_id"]],
        kwargs: { context },
        session_id,
        context,
      },
      id: "r43",
    };
    const defaultGetResponse = await axios.post(
      `${baseURL}/call_kw`,
      defaultGetPayload,
      { headers: { Cookie: `sid=${sid}` } }
    );
    const { student_id, company_id } = defaultGetResponse.data.result;

    // 2. Create a temporary attendance check record
    const createPayload = {
      jsonrpc: "2.0",
      method: "call",
      params: {
        model: "vict.academics.check.student.attendance",
        method: "create",
        args: [
          {
            student_id,
            state: "draft",
            company_id,
            from_date: false,
            to_date: false,
            select_course: false,
            course: false,
          },
        ],
        kwargs: { context },
        session_id,
        context,
      },
      id: "r52",
    };
    const createResponse = await axios.post(
      `${baseURL}/call_kw`,
      createPayload,
      { headers: { Cookie: `sid=${sid}` } }
    );
    const tempId = createResponse.data.result;

    // 3. Trigger the status check button
    const buttonCheckPayload = {
      jsonrpc: "2.0",
      method: "call",
      params: {
        model: "vict.academics.check.student.attendance",
        method: "button_check_status",
        domain_id: null,
        context_id: 1,
        args: [[tempId], context],
        session_id,
        context,
      },
      id: "r55",
    };
    await axios.post(`${baseURL}/call_button`, buttonCheckPayload, {
      headers: { Cookie: `sid=${sid}` },
    });

    // 4. Read the temporary record to get the list of attendance line IDs
    const readTempPayload = {
      jsonrpc: "2.0",
      method: "call",
      params: {
        model: "vict.academics.check.student.attendance",
        method: "read",
        args: [[tempId], ["atten_status"]],
        kwargs: {
          context: { ...context, bin_size: true, future_display_name: true },
        },
        session_id,
        context,
      },
      id: "r57",
    };
    const readTempResponse = await axios.post(
      `${baseURL}/call_kw`,
      readTempPayload,
      { headers: { Cookie: `sid=${sid}` } }
    );
    const attenStatusIds = readTempResponse.data.result[0].atten_status;

    // 5. Read the attendance line details in batches of 80
    const allAttendanceLines = [];
    const batchSize = 80;
    for (let i = 0; i < attenStatusIds.length; i += batchSize) {
      const batch = attenStatusIds.slice(i, i + batchSize);
      const readLinesPayload = {
        jsonrpc: "2.0",
        method: "call",
        params: {
          model: "vict.academics.check.student.atten.lines",
          method: "read",
          args: [
            batch,
            [
              "marking_date",
              "hour",
              "course",
              "marked_faculty_name",
              "attendance_state",
            ],
          ],
          kwargs: { context },
          session_id,
          context,
        },
        id: "r59",
      };
      const attendanceLinesResponse = await axios.post(
        `${baseURL}/call_kw`,
        readLinesPayload,
        { headers: { Cookie: `sid=${sid}` } }
      );
      if (attendanceLinesResponse.data.result) {
        allAttendanceLines.push(...attendanceLinesResponse.data.result);
      }
    }

    // --- Success ---
    return new Response(JSON.stringify(allAttendanceLines), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(
      "Attendance API Error:",
      error.response ? error.response.data : error.message
    );
    return new Response(
      JSON.stringify({ error: "Failed to fetch attendance from ERP server." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
