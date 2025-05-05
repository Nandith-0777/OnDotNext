const axios = require('axios');
const readline = require('readline');

// Function to prompt the user for input (username/password)
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to log in to the ERP system
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
            context: {}
        },
        id: "r7"
    };

    try {
        const response = await axios.post(url, payload);
        const result = response.data;

        if (result.result && result.result.uid) {
            const sid = response.headers['set-cookie'][0].split(';')[0].split('=')[1];
            const session_id = result.result.session_id;
            return { sid, session_id };
        } else {
            return 'wrong';
        }
    } catch (error) {
        throw new Error("Failed to log in. Please check your credentials or try again later.");
    }
}

// Function to retrieve attendance
async function retrieveAttendance(sid, session_id) {
    const baseURL = "https://erp.vidyaacademy.ac.in/web/dataset";

    try {
        // Step 1: Get args value
        let payload = {
            jsonrpc: "2.0",
            method: "call",
            params: {
                model: "vict.academics.duty.leave.status",
                method: "create",
                args: [{}],
                kwargs: { context: {} },
                session_id: session_id,
                context: {}
            }
        };

        const argsResponse = await axios.post(`${baseURL}/call_kw`, payload, { headers: { Cookie: `sid=${sid}` } });
        const args = argsResponse.data.result;

        // Step 2: Call button_check_status
        payload = {
            jsonrpc: "2.0",
            method: "call",
            params: {
                model: "vict.academics.duty.leave.status",
                method: "button_check_status",
                domain_id: "null",
                context_id: 1,
                args: [[args], {}],
                session_id: session_id
            },
            id: "r54"
        };
        await axios.post(`${baseURL}/call_button`, payload, { headers: { Cookie: `sid=${sid}` } });

        // Step 3: Read attendance status
        payload = {
            jsonrpc: "2.0",
            method: "call",
            params: {
                model: "vict.academics.duty.leave.status",
                method: "read",
                args: [[args], ["atten_status"]],
                kwargs: { context: {} },
                session_id: session_id,
                context: {}
            }
        };
        const attenResponse = await axios.post(`${baseURL}/call_kw`, payload, { headers: { Cookie: `sid=${sid}` } });
        const subs = attenResponse.data.result[0].atten_status;

        // Step 4: Fetch attendance details
        payload = {
            jsonrpc: "2.0",
            method: "call",
            params: {
                model: "vict.academics.duty.leave.status.lines",
                method: "read",
                args: [subs, ["course", "course_percentage"]],
                kwargs: { context: {} },
                session_id: session_id,
                context: {}
            }
        };

        const attendanceResponse = await axios.post(`${baseURL}/call_kw`, payload, { headers: { Cookie: `sid=${sid}` } });
        const attendanceData = attendanceResponse.data.result;

        const attendance = {};
        attendanceData.forEach(item => {
            attendance[item.course[1]] = item.course_percentage;
        });

        return attendance;
    } catch (error) {
        throw new Error("Failed to retrieve attendance. Please try again.");
    }
}

// Main Function to fetch attendance
function main() {
    console.log("Welcome to the Real-Time Attendance Fetcher");

    rl.question("Enter your username: ", (username) => {
        rl.question("Enter your password: ", async (password) => {
            try {
                console.log("Logging in...");
                const loginResult = await login(username, password);

                if (loginResult === 'wrong') {
                    console.log("Error: Incorrect username or password.");
                } else {
                    console.log("Login successful! Fetching attendance data...");
                    const { sid, session_id } = loginResult;
                    const attendance = await retrieveAttendance(sid, session_id);

                    // Display attendance details
                    console.log("\n--- Attendance Details ---");
                    for (const [course, percentage] of Object.entries(attendance)) {
                        console.log(`${course}: ${percentage}%`);
                    }
                    console.log("---------------------------");
                }
            } catch (error) {
                console.error(error.message);
            } finally {
                rl.close();
            }
        });
    });
}

main();