'use client';
import Image from "next/image";
import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

export default function InputComponent() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [attendanceData, setAttendanceData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedSid = Cookies.get('sid');
    const storedSessionId = Cookies.get('session_id');

    if (storedSid && storedSessionId) {
      setLoading(true);
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
          setLoading(false);
          setShowLogin(false);
        } catch (error) {
          console.error("Failed to retrieve data with stored session.");
          setErrorMessage("Session expired or invalid. Please login again.");
          setLoading(false);
          Cookies.remove('sid');
          Cookies.remove('session_id');
          setShowLogin(true);
        }
      };

      fetchAttendance();
    } else {
      console.log("No stored session found. Please login.");
      setShowLogin(true);
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

        setLoading(true);
        const attendanceRes = await fetch('/api/attendance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ sid, session_id })
        });

        const attendance = await attendanceRes.json();

        setAttendanceData(attendance);
        setLoading(false);
        setShowLogin(false);

        console.log("\n--- Attendance Details ---");
        for (const [course, percentage] of Object.entries(attendance)) {
          console.log(`${course}: ${percentage}%`);
        }
        console.log("---------------------------");
      }
    } catch (error) {
      console.error("Failed to retrieve data. Please try again.");
      setErrorMessage("Failed to retrieve data. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-auto">
      <div className="fixed inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem]">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_800px_at_100%_200px,#d5c5ff,transparent)]"></div>
      </div>
    <div className="min-h-screen flex p-6 pt-14 justify-center">
      <div className="w-full max-w-md text-black">
        <h2 className="text-center text-6xl sm:text-4xl md:text-5xl font-medium text-gray-900">
          OnDot{' '}
        </h2>
        <h2 className="text-center text-6xl sm:text-4xl md:text-5xl font-medium text-gray-900">
          <span className="animate-text-gradient inline-flex bg-gradient-to-r from-neutral-900 via-slate-500 to-neutral-500 bg-[200%_auto] bg-clip-text leading-tight text-transparent">
            Next
          </span>
        </h2>
        {showLogin && (
          <>
            <p className="mt-6 text-center text-lg leading-6 text-gray-600">
              The next generation of OnDot, now available as Web-App with Easy-to-use, Interface. All crafted with a {' '}
              <span className="cursor-wait opacity-70 ">Design</span> first approach. Supports {' '}
              <span className="cursor-wait opacity-70 ">iOS</span> and {' '}
              <span className="cursor-wait opacity-70">Android</span> platforms.
            </p>
            <div className="mt-10 mb-6 flex gap-4 justify-center">
              <a
                href="https://vidyaacademy.ac.in"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center"
              >
                <button className="px-4 py-2 bg-black text-white rounded flex items-center gap-1">
                  Install Now <span className="pl-0.5">→</span>
                </button>
              </a>
            </div>
          </>
        )}

        {showLogin && (
          <form className="w-full max-w-sm mx-auto bg-white/30 backdrop-blur-md rounded-3xl shadow-lg shadow-slate-400/50 p-8 space-y-6"  onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
            <div>
              <label htmlFor="username" className="block mb-2 text-sm font-medium text-gray-700">
                TL Number
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={handleUsernameChange}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                placeholder="Enter your TL Number"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-700">
                ERP Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={handlePasswordChange}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                placeholder="Enter your ERP Password"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full text-white bg-gray-700 hover:bg-gray-800 focus:ring-4 focus:outline-none focus:ring-slate-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center transition"
            >
              Sign In
            </button>
          </form>
        )}

        {errorMessage && (
          <div className="text-red-300 mt-4 text-center">
            {errorMessage}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center mt-6">
            <div className="loader"></div>
            <p className="text-black">Loading attendance data...</p>
          </div>
        )}

        {attendanceData && (
          <div className="w-full max-w-md mx-auto mt-6 space-y-4">
            <h5 className="ml-1 text-lg font-bold tracking-tight text-gray-900 dark:text-white">
               Your Attendance Details
                  </h5>
            {Object.entries(attendanceData).map(([course, percentage]) => (
              <div
                key={course}
                className="block w-full min-h-[120px] p-6 bg-white/30 backdrop-blur-md border border-gray-200 rounded-xl shadow-lg shadow-slate-600/50 hover:bg-gray-400 dark:bg-gray-800/30 dark:border-gray-700 dark:hover:bg-gray-700/50"

              >
                <div className="mt-1 flex justify-between items-center">
                  <h5 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                    {course}
                  </h5>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {percentage}%
                  </span>
                </div>
                <div className="mt-10 mb-1">
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-500 transition-all duration-500 ease-in-out">
                    <div
                      className={`h-2.5 rounded-full ${percentage < 75
                        ? 'bg-gradient-to-r from-red-700 to-red-500'
                        : 'bg-gradient-to-r from-green-600 to-green-500'}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex justify-center">
              <button
                className="mt-4 px-4 py-2 bg-gray-200 text-black rounded"
                onClick={() => {
                  Cookies.remove('sid');
                  Cookies.remove('session_id');
                  setAttendanceData(null);
                  setShowLogin(true);
                  setErrorMessage('');
                }}
              >
                Log Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}

// Removed login() and retrieveAttendance() functions from this file