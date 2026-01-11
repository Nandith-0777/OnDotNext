const axios = require("axios");
const readline = require("readline");

// Function to prompt the user for input (username/password)
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Function to log in to the ERP system (MODIFIED to return UID)
async function login(username, password) {
  const url = "https://erp.vidyaacademy.ac.in/web/session/authenticate";

  const payload = {
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

  try {
    const response = await axios.post(url, payload);
    const result = response.data;

    if (result.result && result.result.uid) {
      const sid = response.headers["set-cookie"][0].split(";")[0].split("=")[1];
      const session_id = result.result.session_id;
      const uid = result.result.uid; // Capture the User ID
      return { sid, session_id, uid }; // Return all three values
    } else {
      return "wrong";
    }
  } catch (error) {
    throw new Error(
      "Failed to log in. Please check your credentials or try again later."
    );
  }
}

// Function for detailed attendance retrieval (MODIFIED with batching logic)
async function retrieveAttendanceNew(sid, session_id, uid) {
  const baseURL = "https://erp.vidyaacademy.ac.in/web/dataset";
  console.log("\n--- Using Detailed Attendance Retrieval Method ---");
  try {
    const parsedUid = parseInt(uid);
    const context = { lang: "en_GB", tz: "Asia/Kolkata", uid: parsedUid };

    // Preparatory Step 1: Get user's name
    const userReadPayload = {
      jsonrpc: "2.0",
      method: "call",
      params: {
        model: "res.users",
        method: "read",
        args: [parsedUid, ["name"]],
        kwargs: {},
        session_id: session_id,
        context: context,
      },
      id: "r6",
    };
    const userResponse = await axios.post(
      `${baseURL}/call_kw`,
      userReadPayload,
      { headers: { Cookie: `sid=${sid}` } }
    );
    const userName = userResponse.data.result.name;
    console.log(
      `\n👋 Hello, ${userName.trim()}! Fetching detailed attendance...`
    );

    // Preparatory Step 2: Automatically get student_id and company_id
    const defaultGetPayload = {
      jsonrpc: "2.0",
      method: "call",
      params: {
        model: "vict.academics.check.student.attendance",
        method: "default_get",
        args: [["student_id", "company_id"]],
        kwargs: { context: context },
        session_id: session_id,
        context: context,
      },
      id: "r43",
    };
    const defaultGetResponse = await axios.post(
      `${baseURL}/call_kw`,
      defaultGetPayload,
      { headers: { Cookie: `sid=${sid}` } }
    );
    const { student_id, company_id } = defaultGetResponse.data.result;
    console.log("\n🔍 Auto-fetched Student ID:", student_id);

    // Step 1: Create a temporary attendance check record
    const createPayload = {
      jsonrpc: "2.0",
      method: "call",
      params: {
        model: "vict.academics.check.student.attendance",
        method: "create",
        args: [
          {
            student_id: student_id,
            state: "draft",
            company_id: company_id,
            from_date: false,
            to_date: false,
            select_course: false,
            course: false,
          },
        ],
        kwargs: { context: context },
        session_id: session_id,
        context: context,
      },
      id: "r52",
    };
    const createResponse = await axios.post(
      `${baseURL}/call_kw`,
      createPayload,
      { headers: { Cookie: `sid=${sid}` } }
    );
    const tempId = createResponse.data.result;

    // Step 2: Trigger the status check button
    const buttonCheckPayload = {
      jsonrpc: "2.0",
      method: "call",
      params: {
        model: "vict.academics.check.student.attendance",
        method: "button_check_status",
        domain_id: null,
        context_id: 1,
        args: [[tempId], context],
        session_id: session_id,
        context: context,
      },
      id: "r55",
    };
    await axios.post(`${baseURL}/call_button`, buttonCheckPayload, {
      headers: { Cookie: `sid=${sid}` },
    });

    // Step 3: Read the temporary record to get the list of attendance line IDs
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
        session_id: session_id,
        context: context,
      },
      id: "r57",
    };
    const readTempResponse = await axios.post(
      `${baseURL}/call_kw`,
      readTempPayload,
      { headers: { Cookie: `sid=${sid}` } }
    );
    const attenStatusIds = readTempResponse.data.result[0].atten_status;
    console.log(
      `\nFound ${attenStatusIds.length} total attendance records to fetch.`
    );

    // Step 4: Read the attendance line details in batches of 80
    const allAttendanceLines = [];
    const batchSize = 80;

    for (let i = 0; i < attenStatusIds.length; i += batchSize) {
      const batch = attenStatusIds.slice(i, i + batchSize);
      console.log(
        `\nFetching batch ${Math.floor(i / batchSize) + 1}... (IDs ${i} to ${
          i + batch.length - 1
        })`
      );

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
          kwargs: { context: context },
          session_id: session_id,
          context: context,
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

    console.log(
      `\n✅ Fetched details for all ${allAttendanceLines.length} records.`
    );
    return allAttendanceLines; // Return the combined list of attendance records
  } catch (error) {
    const errorMessage = error.response
      ? JSON.stringify(error.response.data)
      : error.message;
    console.error(
      "\n❗ An error occurred during the new retrieval method:",
      errorMessage
    );
    throw new Error("Failed to retrieve attendance with the new method.");
  }
}

// Main Function to orchestrate the process (MODIFIED)
async function main() {
  console.log("Welcome to the Real-Time Attendance Fetcher");
  console.log("---");
  console.log("1. Get Session ID, SID & UID (Login with username/password)");
  console.log("2. Fetch Detailed Attendance (Needs SID/Session ID/UID)");
  console.log("---\n");

  rl.question("Enter your choice (1 or 2): ", (choice) => {
    if (choice === "1") {
      rl.question("Enter your username: ", (username) => {
        rl.question("Enter your password: ", async (password) => {
          try {
            console.log("\nLogging in...");
            const loginResult = await login(username, password);

            if (loginResult === "wrong") {
              console.log("\n❌ Error: Incorrect username or password.");
            } else {
              console.log("\n✅ Login Successful! Here are your credentials:");
              console.log(`SID: ${loginResult.sid}`);
              console.log(`Session ID: ${loginResult.session_id}`);
              console.log(`User ID (UID): ${loginResult.uid}`); // Display UID
              console.log("\nUse these for Option 2 next time.");
            }
          } catch (error) {
            console.error(error.message);
          } finally {
            rl.close();
          }
        });
      });
    } else if (choice === "2") {
      rl.question("Enter your SID: ", (sid) => {
        rl.question("Enter your Session ID: ", (session_id) => {
          rl.question("Enter your User ID (UID): ", async (uid) => {
            try {
              const detailedAttendance = await retrieveAttendanceNew(
                sid.trim(),
                session_id.trim(),
                uid.trim()
              );

              // --- NEW: Process data for summary ---
              const courseStats = {};

              detailedAttendance.forEach((item) => {
                const courseName = item.course[1];
                if (!courseStats[courseName]) {
                  courseStats[courseName] = {
                    attendedClasses: 0,
                    totalClasses: 0,
                  };
                }
                courseStats[courseName].totalClasses++;
                if (item.attendance_state === "present") {
                  courseStats[courseName].attendedClasses++;
                }
              });

              console.log("\n--- 📊 Attendance Summary ---");
              console.log(
                "Course Name                                     | Attended/Total | Percentage | Status"
              );
              console.log(
                "------------------------------------------------|----------------|------------|---------------------------------------------------------"
              );

              for (const courseName in courseStats) {
                const stats = courseStats[courseName];
                const percentage =
                  (stats.attendedClasses / stats.totalClasses) * 100;
                let statusMessage = "";

                if (percentage >= 75) {
                  const canSkip = Math.floor(
                    stats.attendedClasses / 0.75 - stats.totalClasses
                  );
                  statusMessage = `✅ You can skip ${canSkip} more class(es).`;
                } else {
                  const mustAttend = Math.ceil(
                    (0.75 * stats.totalClasses - stats.attendedClasses) / 0.25
                  );
                  statusMessage = `❗ Need to attend ${mustAttend} more class(es) for 75%.`;
                }

                const ratio =
                  `${stats.attendedClasses}/${stats.totalClasses}`.padEnd(14);
                const percentStr = `${percentage.toFixed(2)}%`.padEnd(10);
                console.log(
                  `${courseName.padEnd(
                    47
                  )}| ${ratio}| ${percentStr}| ${statusMessage}`
                );
              }
              console.log(
                "---------------------------------------------------------------------------------------------------------------------------------"
              );
            } catch (error) {
              console.error(
                "\n❌ Error: Failed to retrieve attendance. Your SID/Session ID/UID might be invalid or expired."
              );
            } finally {
              rl.close();
            }
          });
        });
      });
    } else {
      console.log(
        "Invalid choice. Please run the script again and enter 1 or 2."
      );
      rl.close();
    }
  });
}

main();
