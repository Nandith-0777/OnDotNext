// NOTES: This is the main frontend component.
// - It now fetches and calculates the detailed attendance summary.
// - The UI is updated to display the new summary format.
// - Login and auto-login logic now handles the required `uid`.

"use client";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import CryptoJS from "crypto-js";

// A small component for the "Install on iOS/Android" prompt.
function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream);
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
  }, []);

  if (isStandalone || !isIOS) {
    return null; // Only show for iOS Safari as Android has a built-in prompt.
  }

  return (
    <div className="mt-8 mb-6">
      <div className="flex gap-4 justify-center">
        <button
          onClick={() => {
            alert(
              "Installation Instructions:\n1. Tap the Share button in Safari.\n2. Scroll down and tap 'Add to Home Screen'.\n3. Confirm by tapping 'Add'."
            );
          }}
          className="px-4 py-2 bg-black text-white rounded-lg flex items-center gap-1 shadow-md hover:bg-gray-800 transition-colors"
        >
          Install App <span className="pl-0.5">→</span>
        </button>
      </div>
    </div>
  );
}

// The main component for the application.
export default function InputComponent() {
  // --- STATE MANAGEMENT ---
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [userName, setUserName] = useState(""); // State for user's name
  const [courseSummary, setCourseSummary] = useState(null); // Holds the final calculated summary
  const [errorMessage, setErrorMessage] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(
    "Loading attendance data..."
  );

  // --- CONSTANTS ---
  const SECRET_KEY = "your-very-secret-key-that-is-long-and-random"; // Use a secure, random key

  // --- EFFECTS ---
  // This effect runs on initial load to check for stored credentials and auto-login.
  useEffect(() => {
    const encryptedUsername = Cookies.get("enc_username");
    const encryptedPassword = Cookies.get("enc_password");

    if (encryptedUsername && encryptedPassword) {
      let storedUsername = "";
      let storedPassword = "";
      try {
        storedUsername = CryptoJS.AES.decrypt(
          encryptedUsername,
          SECRET_KEY
        ).toString(CryptoJS.enc.Utf8);
        storedPassword = CryptoJS.AES.decrypt(
          encryptedPassword,
          SECRET_KEY
        ).toString(CryptoJS.enc.Utf8);
      } catch (e) {
        console.error("Decryption failed:", e);
        handleLogout();
        return;
      }

      if (storedUsername && storedPassword) {
        fetchData(storedUsername, storedPassword);
      } else {
        setShowLogin(true);
      }
    } else {
      setShowLogin(true);
    }
  }, []);

  // --- DATA FETCHING & PROCESSING ---
  const fetchData = async (currentUsername, currentPassword) => {
    setLoading(true);
    setErrorMessage("");
    try {
      setLoadingMessage("Authenticating...");
      const loginRes = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentUsername,
          password: currentPassword,
        }),
      });

      const loginResult = await loginRes.json();

      if (!loginRes.ok || loginResult.error || loginResult === "wrong") {
        throw new Error(
          loginResult.error || "Auto-login failed. Please log in again."
        );
      }

      const { sid, session_id, uid, name } = loginResult;
      setUserName(name.trim()); // Set the user's name

      setLoadingMessage("Fetching attendance records...");
      const attendanceRes = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sid, session_id, uid }),
      });

      const detailedAttendance = await attendanceRes.json();
      if (!attendanceRes.ok || detailedAttendance.error) {
        throw new Error(
          detailedAttendance.error || "Failed to fetch attendance data."
        );
      }

      setLoadingMessage("Calculating summary...");
      processAttendanceData(detailedAttendance);

      // Store credentials only after a fully successful data fetch
      const encryptedUsername = CryptoJS.AES.encrypt(
        currentUsername,
        SECRET_KEY
      ).toString();
      const encryptedPassword = CryptoJS.AES.encrypt(
        currentPassword,
        SECRET_KEY
      ).toString();
      Cookies.set("enc_username", encryptedUsername, {
        expires: 365,
        secure: true,
        sameSite: "strict",
      });
      Cookies.set("enc_password", encryptedPassword, {
        expires: 365,
        secure: true,
        sameSite: "strict",
      });

      setShowLogin(false);
    } catch (error) {
      console.error("Data fetching process failed:", error);
      setErrorMessage(error.message);
      handleLogout(false);
    } finally {
      setLoading(false);
    }
  };

  const processAttendanceData = (detailedAttendance) => {
    const courseStats = {};

    detailedAttendance.forEach((item) => {
      const courseName = item.course[1];
      if (!courseStats[courseName]) {
        courseStats[courseName] = { attendedClasses: 0, totalClasses: 0 };
      }
      courseStats[courseName].totalClasses++;
      if (item.attendance_state === "present") {
        courseStats[courseName].attendedClasses++;
      }
    });

    for (const courseName in courseStats) {
      const stats = courseStats[courseName];
      const percentage =
        stats.totalClasses > 0
          ? (stats.attendedClasses / stats.totalClasses) * 100
          : 0;
      stats.percentage = percentage;

      if (percentage >= 75) {
        stats.statusType = "safe";
        stats.statusValue = Math.floor(
          stats.attendedClasses / 0.75 - stats.totalClasses
        );
      } else {
        stats.statusType = "danger";
        stats.statusValue = Math.ceil(
          (0.75 * stats.totalClasses - stats.attendedClasses) / 0.25
        );
      }
    }
    setCourseSummary(courseStats);
  };

  // --- EVENT HANDLERS ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    await fetchData(username, password);
  };

  const handleLogout = (showLoginForm = true) => {
    Cookies.remove("enc_username");
    Cookies.remove("enc_password");
    setCourseSummary(null);
    setUserName("");
    setUsername("");
    setPassword("");
    if (showLoginForm) {
      setShowLogin(true);
      setErrorMessage("");
    }
  };

  // --- RENDER ---
  return (
    <div className="relative min-h-screen w-full font-sans">
      <div className="fixed inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem]">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_800px_at_100%_200px,#d5c5ff,transparent)]"></div>
      </div>

      <main className="flex flex-col min-h-screen">
        <div className="flex-grow flex flex-col p-6 pt-14 items-center">
          <div className="w-full max-w-md text-black">
            <h2 className="text-center text-6xl sm:text-4xl md:text-5xl font-medium text-gray-900">
              OnDot{" "}
            </h2>
            <h2 className="text-center text-6xl sm:text-4xl md:text-5xl font-medium text-gray-900">
              <span className="animate-text-gradient inline-flex bg-gradient-to-r from-neutral-900 via-slate-500 to-neutral-500 bg-[200%_auto] bg-clip-text leading-tight text-transparent">
                Next
              </span>
            </h2>

            {showLogin && (
              <div className="animate-fadeInLogin opacity-0 translate-y-4 transition-all duration-500 ease-out">
                <p className="mt-6 text-center text-lg leading-6 text-gray-600 mb-6">
                  The next generation of OnDot, now available as Web-App with
                  Easy-to-use, Interface. All crafted with a{" "}
                  <span className="cursor-wait opacity-70 ">Design</span> first
                  approach. Supports{" "}
                  <span className="cursor-wait opacity-70 ">iOS</span> and{" "}
                  <span className="cursor-wait opacity-70">Android</span>{" "}
                  platforms.
                </p>
                <InstallPrompt />
                <form
                  className="w-full max-w-sm mx-auto bg-white/30 backdrop-blur-md rounded-3xl shadow-lg shadow-slate-400/50 p-8 space-y-6"
                  onSubmit={handleSubmit}
                >
                  <div>
                    <label
                      htmlFor="username"
                      className="block mb-2 text-sm font-medium text-gray-700"
                    >
                      TL Number
                    </label>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                      placeholder="Enter your TL Number"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="password"
                      className="block mb-2 text-sm font-medium text-gray-700"
                    >
                      ERP Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5"
                      placeholder="d/m/yyyy Format"
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
              </div>
            )}

            {errorMessage && (
              <div className="text-red-600 bg-red-100 border border-red-400 rounded-lg p-3 mt-4 text-center animate-fadeInLogin">
                {errorMessage}
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center mt-12 space-y-3">
                <div className="loader"></div>
                <p className="text-gray-600">{loadingMessage}</p>
              </div>
            )}

            {courseSummary && (
              <div className="w-full max-w-md mx-auto mt-6 space-y-4">
                <div className="ml-1 mb-4">
                  {" "}
                  {/* Increased bottom margin */}
                  <h5 className="text-xl font-bold tracking-tight text-gray-900">
                    Hi {userName},
                  </h5>
                  <p className="text-gray-700">Your attendance details</p>
                </div>
                {Object.entries(courseSummary).map(
                  ([courseName, stats], index) => (
                    <div
                      key={courseName}
                      className="block w-full p-6 bg-black/5 backdrop-blur-md rounded-2xl shadow-lg shadow-slate-600/20 transform transition-all duration-500 ease-out translate-y-4 opacity-0 animate-fadeInLogin" // Changed animation to be consistent and centered
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex justify-between items-start">
                        <h5 className="text-lg font-bold tracking-tight text-gray-900 w-2/3">
                          {courseName}
                        </h5>
                        <span className="text-2xl font-bold text-gray-900">
                          {stats.percentage.toFixed(2)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 my-3 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-1000 ease-out ${
                            stats.percentage < 75
                              ? "bg-gradient-to-r from-red-700 to-red-500"
                              : "bg-gradient-to-r from-green-600 to-green-500"
                          }`}
                          style={{ width: `${stats.percentage}%` }}
                        ></div>
                      </div>
                      <div className="text-sm text-gray-700 flex justify-between items-center">
                        <span>{`Attended: ${stats.attendedClasses}/${stats.totalClasses}`}</span>
                        {stats.statusType === "safe" ? (
                          <div className="flex items-center gap-2 font-medium text-black">
                            <span className="h-2 w-2 rounded-full bg-green-500"></span>
                            Skips Left: {stats.statusValue}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 font-medium text-black">
                            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                            Must Attend: {stats.statusValue}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )}
                <div className="flex justify-center pt-4">
                  <button
                    className="px-4 py-2 bg-gray-200 text-black rounded-lg shadow-sm hover:bg-gray-300 transition-colors"
                    onClick={() => handleLogout()}
                  >
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="w-full flex justify-center py-4 mt-auto">
          <img
            src="/ondotfooter.png"
            alt="OnDot Logo"
            className="h-12 w-auto opacity-80"
          />
        </footer>
      </main>
    </div>
  );
}
