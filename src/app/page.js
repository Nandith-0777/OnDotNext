'use client';
import Image from "next/image";
import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

export default function InputComponent() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [attendanceData, setAttendanceData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const storedSid = Cookies.get('sid');
    const storedSessionId = Cookies.get('session_id');

    if (storedSid && storedSessionId) {
      const fetchAttendance = async () => {
        try {
          const attendanceRes = await fetch('/api/attendance', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sid: storedSid, session_id: storedSessionId })
          });

          const attendance = await attendanceRes.json();
          setAttendanceData(attendance);
        } catch (error) {
          console.error("Failed to retrieve data with stored session.");
          setErrorMessage("Session expired or invalid. Please login again.");
          Cookies.remove('sid');
          Cookies.remove('session_id');
        }
      };

      fetchAttendance();
    }
  }, []);

  const handleUsernameChange = (e) => {
    setUsername(e.target.value);
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
  };

  const handleSubmit = async () => {
    try {
      console.log("Logging in...");
      const loginRes = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const loginResult = await loginRes.json();

      if (!loginRes.ok || loginResult === 'wrong') {
        console.log("Error: Incorrect username or password.");
        setErrorMessage("Incorrect username or password.");
      } else {
        console.log("Login successful! Fetching attendance data...");
        setErrorMessage('');
        const { sid, session_id } = loginResult;
        console.log(`SID: ${sid}, Session ID: ${session_id}`);

        Cookies.set('sid', sid);
        Cookies.set('session_id', session_id);

        const attendanceRes = await fetch('/api/attendance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ sid, session_id })
        });

        const attendance = await attendanceRes.json();

        setAttendanceData(attendance);

        console.log("\n--- Attendance Details ---");
        for (const [course, percentage] of Object.entries(attendance)) {
          console.log(`${course}: ${percentage}%`);
        }
        console.log("---------------------------");
      }
    } catch (error) {
      console.error("Failed to retrieve data. Please try again.");
      setErrorMessage("Failed to retrieve data. Please try again.");
    }
  };

  return (
    <div className="grid items-center grid justify-items-center flex flex-col items-start gap-4">
      <input
        type="text"
        placeholder="Enter username"
        value={username}
        onChange={handleUsernameChange}
        className="border px-3 py-2 rounded"
      />
      <input
        type="password"
        placeholder="Enter password"
        value={password}
        onChange={handlePasswordChange}
        className="border px-3 py-2 rounded"
      />
      <button
        onClick={handleSubmit}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Submit
      </button>
      {errorMessage && (
        <div className="text-red-600 mt-2">
          {errorMessage}
        </div>
      )}
      {attendanceData && (
        <div className="mt-4">
          <h2 className="font-semibold mb-2">Attendance Details</h2>
          <ul className="list-disc list-inside">
            {Object.entries(attendanceData).map(([course, percentage]) => (
              <li key={course}>
                {course}: {percentage}%
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Removed login() and retrieveAttendance() functions from this file