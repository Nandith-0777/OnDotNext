// NOTES: This is the main frontend component.
// - It now fetches and calculates the detailed attendance summary.
// - The UI is updated to display the new summary format.
// - Login and auto-login logic now handles the required uid.

"use client";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import CryptoJS from "crypto-js";
import Navbar from "@/components/Navbar";
import Overview from "@/components/Overview";
import AttendanceDetails from "@/components/AttendanceDetails";

// ✅ Helper function: TL number >= 24 (case-insensitive)
const isEligibleUser = (id) => {
  if (typeof id !== "string") return false;
  const match = id.toLowerCase().match(/^tl(\d+)/);
  if (!match) return false;
  return parseInt(match[1], 10) >= 24;
};

// A small component for the "Install on iOS/Android" prompt.
function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream);
    setIsAndroid(/android/i.test(navigator.userAgent));
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
  }, []);

  if (isStandalone) return null;

  return (
    <div className={isIOS || isAndroid ? "mt-8 mb-6" : "mb-8"}>
      {(isIOS || isAndroid) && (
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => {
              if (isIOS) {
                window.alert(
                  "Installation Instructions:\n1. Tap the Share button in Safari (looks like a square with an arrow).\n2. Scroll down and tap “Add to Home Screen”.\n3. Confirm by tapping “Add”."
                );
              } else {
                window.alert(
                  "Installation Instructions:\n1. Open your browser’s menu (usually the three dots in the top-right corner).\n2. Tap “Add to Home Screen”.\n3. Confirm by tapping “Add”."
                );
              }
            }}
            className="px-4 py-2 bg-black text-white rounded flex items-center gap-1"
          >
            Install Now <span className="pl-0.5">→</span>
          </button>
        </div>
      )}
    </div>
  );
}

// The main component for the application.
export default function InputComponent() {
  // --- STATE MANAGEMENT ---
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [userName, setUserName] = useState("");
  const [courseSummary, setCourseSummary] = useState(null);
  const [detailedAttendance, setDetailedAttendance] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(
    "Loading attendance data..."
  );
  const [isEligibleForCondonation, setIsEligibleForCondonation] =
    useState(false);
  const [activeSection, setActiveSection] = useState("attendance");
  const [showSummary, setShowSummary] = useState(false);

  // --- CONSTANTS ---
  const SECRET_KEY = "your-very-secret-key-that-is-long-and-random";
  const CONDONATION_FEE = 750; // 💰 fixed condonation fee

  // --- EFFECTS ---
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
      setUserName(name.trim());

      // ✅ Calculate eligibility
      const eligible = isEligibleUser(currentUsername);
      setIsEligibleForCondonation(eligible);

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
      setDetailedAttendance(detailedAttendance); // Store detailed data for overview
      processAttendanceData(detailedAttendance, eligible);

      // store encrypted credentials
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
      setActiveSection("attendance"); // Set default section to attendance after login
    } catch (error) {
      console.error("Data fetching process failed:", error);
      setErrorMessage(error.message);
      handleLogout(false);
    } finally {
      setLoading(false);
    }
  };

  const processAttendanceData = (detailedAttendance, eligible) => {
    const courseStats = {};
    let totalCondonation = 0;

    //  ADDED THIS SECTION

    // STEP 1: Add all "minor" subject names to this list
    const KNOWN_MINOR_SUBJECT_NAMES_LIST = [
      "PYTHON FOR ARTIFICIAL INTELLIGENCE",
      "MATHEMATICS FOR MACHINE LEARNING",
      "ESSENTIALS OF MACHINE LEARNING",
      "DEEP LEARNING",
      "PYTHON FOR APPLICATION DEVELOPMENT",
      "DATABASE MANAGEMENT SYSTEMS",
      "WEB APPLICATION DEVELOPMENT",
      "SOFTWARE ARCHITECTURE",
      "Sensors and Devices",
      "IOT – Architecture, protocols and Applications",
      "Mobile applications for IOT",
      "Industrial IoT applications",
      "Electronic Circuits and Linear ICs",
      "Fundamentals of Microcontrollers and applications",
      "Principles of Communication System",
      "Discrete Signals and Signal Processing",
      "Internet of Things and Sensor Networks",
      "Introduction to Robotics",
      "Electric Vehicles and Smart Mobility",
      "Data Science & Analytics",
      "Introduction to Power System",
      "Energy and Storage Systems",
      "Power Plant Instrumentation and Automation",
      "Energy Audit and Management",
      "Introduction to product design and Associated Development Tools",
      "Introduction to Computational Methods",
      "Intelligent Design Practices and Smart Manufacturing",
      "Mechatronics and robotics",
      "Corporate Management",
      "Financial Management",
      "Fundamentals of Stock Markets and Trading",
      "Alternative Global Investment Techniques",
      "Climate Change And Sustainable Development",
      "Environment and pollution abatement",
      "Industrial health and safety",
      "Environmental planning and management",
      "Building Materials",
      "Advanced Construction Technologies",
      "Functional Design Of Buildings",
      "Sustainable Construction Practices",
    ];

    // Use a Set for instant lookups (more efficient)
    // Convert our known base names to lowercase
    const MINOR_SUBJECT_BASE_NAMES = KNOWN_MINOR_SUBJECT_NAMES_LIST.map(
      (name) => name.toLowerCase()
    );

    // Auto-detect the student type
    const hasMinorSubject = detailedAttendance.some((item) => {
      const actualCourseName = (item.course[1] || "").toLowerCase();

      // Check if the actual course name *starts with* any of our base names
      return MINOR_SUBJECT_BASE_NAMES.some((baseName) =>
        actualCourseName.startsWith(baseName)
      );
    });

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

      // To mark disabled classes
      if (hasMinorSubject && courseName.toLowerCase().includes("remedial")) {
        stats.disabledReason = "Opted for Minor";
      }

      if (percentage >= 75) {
        stats.statusType = "safe";
        stats.statusValue = Math.max(
          0,
          Math.floor(stats.attendedClasses / 0.75 - stats.totalClasses)
        );
        stats.condonation = 0;
      } else {
        stats.statusType = "danger";
        stats.statusValue = Math.ceil(
          (0.75 * stats.totalClasses - stats.attendedClasses) / 0.25
        );

        // NEW CONDONATION LOGIC
        if (stats.disabledReason) {
          // If it's disabled, no condonation
          stats.condonation = 0;
        } else if (eligible) {
          // Otherwise, apply as normal if eligible
          stats.condonation = CONDONATION_FEE;
          totalCondonation += CONDONATION_FEE;
        } else {
          stats.condonation = 0;
        }
      }
    }
    // Calculate overall totals
    const totalStats = Object.values(courseStats).reduce(
      (acc, stats) => {
        acc.totalAttended += stats.attendedClasses;
        acc.totalOverall += stats.totalClasses;
        return acc;
      },
      { totalAttended: 0, totalOverall: 0 }
    );

    const overallPercentage =
      totalStats.totalOverall > 0
        ? (totalStats.totalAttended / totalStats.totalOverall) * 100
        : 0;
    // (ends here)

    setCourseSummary({
      courses: courseStats,
      totalCondonation,
      totalPercentage: overallPercentage, //new property
    });
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
    setDetailedAttendance(null);
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
        {/* Navbar - only show when logged in */}
        {courseSummary && !showLogin && (
          <>
            <Navbar
              activeSection={activeSection}
              onSectionChange={setActiveSection}
              onLogout={handleLogout}
              userName={userName}
            />
            {/* OnDot Next Text after Navbar */}
            {activeSection !== 'overview' && (
              <div className="text-center py-4 px-4">
                <h2 className="text-4xl sm:text-5xl md:text-6xl font-medium text-gray-900">
                  OnDot{" "}
                  <span className="animate-text-gradient inline-flex bg-gradient-to-r from-neutral-900 via-slate-500 to-neutral-500 bg-[200%_auto] bg-clip-text leading-tight text-transparent">
                    Next
                  </span>
                </h2>
              </div>
            )}
          </>
        )}

        <div className={`flex-grow flex flex-col ${activeSection === 'overview' ? 'p-0' : 'p-6'} ${courseSummary && !showLogin ? 'pt-0' : 'pt-14'} ${activeSection === 'overview' ? '' : 'items-center'}`}>
          <div className={`w-full ${activeSection === 'overview' ? 'max-w-full' : 'max-w-md'} text-black`}>
            {showLogin && (
              <>
                <h2 className="text-center text-6xl sm:text-4xl md:text-5xl font-medium text-gray-900">
                  OnDot{" "}
                </h2>
                <h2 className="text-center text-6xl sm:text-4xl md:text-5xl font-medium text-gray-900">
                  <span className="animate-text-gradient inline-flex bg-gradient-to-r from-neutral-900 via-slate-500 to-neutral-500 bg-[200%_auto] bg-clip-text leading-tight text-transparent">
                    Next
                  </span>
                </h2>
              </>
            )}

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
              <div className="mx-auto w-80 mt-12 text-red-600 bg-red-100 border border-red-400 rounded-lg p-3 mt-4 text-center animate-fadeInLogin">
                {errorMessage}
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center mt-12 space-y-3">
                <div className="loader"></div>
                <p className="text-gray-600">{loadingMessage}</p>
              </div>
            )}

            {courseSummary && activeSection === "attendance" && (
              <div className="w-full max-w-md mx-auto mt-4 sm:mt-6 space-y-4 px-4 sm:px-5">
                <div className="mb-4">
                  <h5 className="text-lg sm:text-xl font-bold tracking-tight text-gray-900">
                    Hey {userName.split(' ')[0]},
                  </h5>
                  <p className="text-sm sm:text-base text-gray-700 mt-1">Your attendance details</p>
                </div>
                
                {/* Collapsible Summary Card - Hidden by Default */}
                <div
                  className="block w-full transform transition-all duration-500 ease-out translate-y-4 opacity-0 animate-fadeInLogin"
                  style={{ animationDelay: '0ms' }}
                  onMouseEnter={() => {
                    if (typeof window !== 'undefined' && window.innerWidth >= 640) {
                      setShowSummary(true);
                    }
                  }}
                  onMouseLeave={() => {
                    if (typeof window !== 'undefined' && window.innerWidth >= 640) {
                      setShowSummary(false);
                    }
                  }}
                  onClick={() => setShowSummary(!showSummary)}
                >
                  {/* Cover/Trigger Area */}
                  {!showSummary && (
                    <div className="w-full p-4 sm:p-5 bg-black/5 backdrop-blur-md rounded-2xl shadow-lg shadow-slate-600/20 border border-gray-200/50 cursor-pointer transition-all duration-300 touch-manipulation active:scale-[0.98]">
                      <div className="flex items-center justify-between gap-2 sm:gap-3">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0">
                            <svg
                              className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-semibold text-gray-700 truncate">View Summary</p>
                            <p className="text-[10px] sm:text-xs text-gray-500 truncate">Tap or hover to see details</p>
                          </div>
                        </div>
                        <svg
                          className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 transition-transform duration-300 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* Summary Content - Revealed on Interaction */}
                  {showSummary && (
                    <div className="w-full p-4 sm:p-5 md:p-6 bg-black/5 backdrop-blur-md rounded-2xl shadow-lg shadow-slate-600/20 border border-gray-200/50 transition-all duration-300">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
                        {/* Overall Attendance Section */}
                        <div className="flex flex-col">
                          <div className="flex items-center justify-between mb-2 sm:mb-3">
                            <h5 className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wide">
                              Overall Attendance
                            </h5>
                          </div>
                          <div className="flex items-baseline gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                            <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900">
                              {courseSummary.totalPercentage.toFixed(1)}
                            </span>
                            <span className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-600">%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 sm:h-3 overflow-hidden">
                            <div
                              className={`h-2.5 sm:h-3 rounded-full transition-all duration-1000 ease-out ${
                                courseSummary.totalPercentage < 75
                                  ? "bg-gradient-to-r from-red-700 to-red-500"
                                  : "bg-gradient-to-r from-green-600 to-green-500"
                              }`}
                              style={{ width: `${courseSummary.totalPercentage}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Total Condonation Section */}
                        {isEligibleForCondonation && courseSummary.totalCondonation > 0 ? (
                          <div className="flex flex-col border-t sm:border-t-0 sm:border-l border-gray-300/50 pt-3 sm:pt-0 sm:pl-4 md:pl-6">
                            <div className="flex items-center justify-between mb-2 sm:mb-3">
                              <h5 className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wide">
                                Total Condonation
                              </h5>
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-red-600">
                                ₹{courseSummary.totalCondonation}
                              </span>
                            </div>
                            <p className="text-[10px] sm:text-xs text-gray-500 mt-1.5 sm:mt-2">Payable amount</p>
                          </div>
                        ) : (
                          <div className="flex flex-col border-t sm:border-t-0 sm:border-l border-gray-300/50 pt-3 sm:pt-0 sm:pl-4 md:pl-6">
                            <div className="flex items-center justify-between mb-2 sm:mb-3">
                              <h5 className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wide">
                                Status
                              </h5>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <div className={`h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full flex-shrink-0 ${
                                courseSummary.totalPercentage >= 75 ? "bg-green-500" : "bg-amber-500"
                              }`}></div>
                              <span className="text-base sm:text-lg font-semibold text-gray-900">
                                {courseSummary.totalPercentage >= 75 ? "On Track" : "Needs Attention"}
                              </span>
                            </div>
                            <p className="text-[10px] sm:text-xs text-gray-500 mt-1.5 sm:mt-2">Attendance status</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Attendance Section Heading */}
                <div className="mt-6 sm:mt-7 mb-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 whitespace-nowrap px-2">Course Attendance</h3>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                  </div>
                </div>

                {/* Course Cards */}
                {Object.entries(courseSummary.courses).map(
                  ([courseName, stats], index) => (
                    <div
                      key={courseName}
                      className={`block w-full p-5 sm:p-6 bg-black/5 backdrop-blur-md rounded-2xl shadow-lg shadow-slate-600/20 transform transition-all duration-500 ease-out translate-y-4 opacity-0 animate-fadeInLogin ${
                        stats.disabledReason ? "opacity-60 grayscale-[50%]" : ""
                      }`} // disabled styling to course cards
                      style={{ animationDelay: `${(index + 2) * 100}ms` }}
                    >
                      <div className="flex justify-between items-start gap-2 sm:gap-3">
                        <h5 className="text-base sm:text-lg font-bold tracking-tight text-gray-900 flex-1 min-w-0 break-words">
                          {courseName}
                        </h5>
                        <span className="text-xl sm:text-2xl font-bold text-gray-900 flex-shrink-0 whitespace-nowrap">
                          {stats.percentage.toFixed(2)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 sm:h-2.5 my-2 sm:my-3 overflow-hidden">
                        <div
                          className={`h-2 sm:h-2.5 rounded-full transition-all duration-1000 ease-out ${
                            stats.percentage < 75
                              ? "bg-gradient-to-r from-red-700 to-red-500"
                              : "bg-gradient-to-r from-green-600 to-green-500"
                          }`}
                          style={{ width: `${stats.percentage}%` }}
                        ></div>
                      </div>
                      {/*  Show disabled reason OR normal stats */}
                      {stats.disabledReason ? (
                        <div className="text-xs sm:text-sm text-gray-700 font-medium italic mt-1">
                          {stats.disabledReason}
                        </div>
                      ) : (
                        <div className="text-xs sm:text-sm text-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-2">
                          <span className="whitespace-nowrap">{`Attended: ${stats.attendedClasses}/${stats.totalClasses}`}</span>
                          {stats.statusType === "safe" ? (
                            <div className="flex items-center gap-1.5 sm:gap-2 font-medium text-black">
                              <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-green-500 flex-shrink-0"></span>
                              <span className="whitespace-nowrap">Skips Left: {stats.statusValue}</span>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 font-medium text-black">
                              <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-amber-500 flex-shrink-0"></span>
                              <span className="whitespace-nowrap">Must Attend: {stats.statusValue}</span>
                              {isEligibleForCondonation &&
                                stats.condonation > 0 && (
                                  <span className="px-1.5 sm:px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-[10px] sm:text-xs font-semibold whitespace-nowrap">
                                    Condonation: ₹{stats.condonation}
                                  </span>
                                )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            )}

            {/* Overview Section - Detailed Attendance View */}
            {courseSummary && activeSection === "overview" && (
              <div className="w-full">
                <AttendanceDetails
                  detailedAttendance={detailedAttendance}
                  userName={userName}
                />
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
