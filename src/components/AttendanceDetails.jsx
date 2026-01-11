"use client";
import { useState, useMemo, useEffect } from "react";

export default function AttendanceDetails({ detailedAttendance, userName }) {
  const [selectedSubject, setSelectedSubject] = useState("All Subjects");
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showFilters, setShowFilters] = useState(false);
  
  // Initialize currentMonth to the most recent month with data
  useEffect(() => {
    if (!detailedAttendance || detailedAttendance.length === 0) {
      return;
    }
    
    let latestDate = null;
    detailedAttendance.forEach((item) => {
      if (item && item.marking_date) {
        let date;
        if (typeof item.marking_date === "string") {
          date = new Date(item.marking_date);
        } else if (Array.isArray(item.marking_date)) {
          date = new Date(item.marking_date[0], item.marking_date[1] - 1, item.marking_date[2]);
        } else {
          date = new Date(item.marking_date);
        }
        
        if (!isNaN(date.getTime()) && (!latestDate || date > latestDate)) {
          latestDate = date;
        }
      }
    });
    
    if (latestDate) {
      const initialMonth = new Date(latestDate.getFullYear(), latestDate.getMonth(), 1);
      setCurrentMonth(initialMonth);
    }
  }, [detailedAttendance]);

  if (!detailedAttendance || detailedAttendance.length === 0) {
    return (
      <div className="w-full p-4">
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center text-gray-500">
          <p>No attendance data available.</p>
        </div>
      </div>
    );
  }

  // Process attendance data with validation
  const processedData = useMemo(() => {
    return detailedAttendance
      .filter((item) => item && item.marking_date)
      .map((item) => {
        let date;
        if (typeof item.marking_date === "string") {
          date = new Date(item.marking_date);
        } else if (Array.isArray(item.marking_date)) {
          date = new Date(item.marking_date[0], item.marking_date[1] - 1, item.marking_date[2]);
        } else {
          date = new Date(item.marking_date);
        }

        if (isNaN(date.getTime())) {
          return null;
        }

        let hour = "N/A";
        
        // Process hour field - extract actual hour value from database
        let hourValue = item.hour;
        
        // Handle array format [id, name] - common in Odoo (e.g., [1, "Hour 1"])
        if (Array.isArray(hourValue) && hourValue.length > 0) {
          // Use the first element (id) which is the numeric hour
          hourValue = hourValue[0];
        }
        
        // Handle object format {id: 1, name: "Hour 1"}
        if (hourValue && typeof hourValue === "object" && !Array.isArray(hourValue)) {
          hourValue = hourValue.id || hourValue.value || null;
        }
        
        // Extract numeric value
        if (hourValue !== null && hourValue !== undefined && hourValue !== false && hourValue !== "") {
          let hourNum = null;
          
          if (typeof hourValue === "number") {
            hourNum = hourValue;
          } else if (typeof hourValue === "string") {
            // Extract number from string
            const match = hourValue.match(/^\d+$/);
            if (match) {
              hourNum = parseInt(match[0], 10);
            }
          }
          
          // Map time-based hours (8-14) to class period order (1-7)
          // Hour 8 (8 AM) = Period 1, Hour 9 (9 AM) = Period 2, etc.
          if (hourNum !== null && !isNaN(hourNum) && hourNum > 0) {
            if (hourNum >= 8 && hourNum <= 14) {
              // Map 8-14 to 1-7 (class periods)
              hour = (hourNum - 7).toString();
            } else if (hourNum >= 1 && hourNum <= 7) {
              // Already in period format
              hour = hourNum.toString();
            } else {
              // For other values, use as-is but ensure it's within valid range
              hour = hourNum.toString();
            }
          }
        }

        let subject = "Unknown";
        if (item.course) {
          if (Array.isArray(item.course) && item.course.length > 1) {
            subject = item.course[1] || item.course[0] || "Unknown";
          } else if (typeof item.course === "string") {
            subject = item.course;
          } else if (Array.isArray(item.course) && item.course.length === 1) {
            subject = item.course[0];
          }
        }

        let faculty = "N/A";
        if (item.marked_faculty_name) {
          faculty = typeof item.marked_faculty_name === "string" 
            ? item.marked_faculty_name 
            : Array.isArray(item.marked_faculty_name) 
            ? item.marked_faculty_name[0] || "N/A"
            : String(item.marked_faculty_name);
        }

        const attendanceState = item.attendance_state || item.attendance_status || "";
        const isPresent = attendanceState.toString().toLowerCase() === "present";
        const status = isPresent ? "Present" : "Absent";

        return {
          date: date,
          dateStr: date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          weekday: date.toLocaleDateString("en-GB", { weekday: "long" }),
          weekdayShort: date.toLocaleDateString("en-GB", { weekday: "short" }),
          hour: hour,
          subject: subject.trim() || "Unknown",
          faculty: faculty.trim() || "N/A",
          status: status,
          isPresent: isPresent,
        };
      })
      .filter((item) => item !== null);
  }, [detailedAttendance]);

  // Get unique subjects
  const uniqueSubjects = useMemo(() => {
    const subjects = new Set(processedData.map((item) => item.subject));
    return ["All Subjects", ...Array.from(subjects).sort()];
  }, [processedData]);

  // Get unique months
  const uniqueMonths = useMemo(() => {
    const months = new Set();
    processedData.forEach((item) => {
      const monthKey = `${item.date.getFullYear()}-${item.date.getMonth()}`;
      months.add(monthKey);
    });
    return Array.from(months)
      .map((key) => {
        const [year, month] = key.split("-").map(Number);
        return new Date(year, month, 1);
      })
      .sort((a, b) => b - a);
  }, [processedData]);

  // Filter data
  const filteredData = useMemo(() => {
    let filtered = processedData;

    if (selectedSubject !== "All Subjects") {
      filtered = filtered.filter((item) => item.subject === selectedSubject);
    }

    if (selectedMonth) {
      filtered = filtered.filter((item) => {
        return (
          item.date.getFullYear() === selectedMonth.getFullYear() &&
          item.date.getMonth() === selectedMonth.getMonth()
        );
      });
    } else {
      filtered = filtered.filter((item) => {
        return (
          item.date.getFullYear() === currentMonth.getFullYear() &&
          item.date.getMonth() === currentMonth.getMonth()
        );
      });
    }

    if (selectedDate) {
      const dateParts = selectedDate.split("-").map(Number);
      if (dateParts.length === 3 && dateParts.every(p => !isNaN(p))) {
        const [day, month, year] = dateParts;
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year > 2000 && year < 2100) {
          const filterDate = new Date(year, month - 1, day);
          if (!isNaN(filterDate.getTime())) {
            filtered = filtered.filter((item) => {
              return (
                item.date.getDate() === filterDate.getDate() &&
                item.date.getMonth() === filterDate.getMonth() &&
                item.date.getFullYear() === filterDate.getFullYear()
              );
            });
          }
        }
      }
    }

    return filtered.sort((a, b) => {
      const dateDiff = b.date.getTime() - a.date.getTime();
      if (dateDiff !== 0) return dateDiff;
      const hourA = a.hour === "N/A" ? 0 : parseInt(a.hour, 10);
      const hourB = b.hour === "N/A" ? 0 : parseInt(b.hour, 10);
      return hourA - hourB;
    });
  }, [processedData, selectedSubject, selectedMonth, selectedDate, currentMonth]);

  // Group data by date
  const groupedByDate = useMemo(() => {
    const grouped = {};
    filteredData.forEach((item) => {
      const dateKey = item.dateStr;
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          date: item.date,
          dateStr: item.dateStr,
          weekday: item.weekday,
          weekdayShort: item.weekdayShort,
          items: [],
        };
      }
      grouped[dateKey].items.push(item);
    });
    return Object.values(grouped).sort((a, b) => b.date - a.date);
  }, [filteredData]);

  const currentMonthDisplay = useMemo(() => {
    return currentMonth.toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });
  }, [currentMonth]);

  const goToPreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
    setSelectedMonth(null);
    setSelectedDate("");
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
    setSelectedMonth(null);
    setSelectedDate("");
  };

  const handleReset = () => {
    setSelectedSubject("All Subjects");
    setSelectedMonth(null);
    setSelectedDate("");
    setCurrentMonth(new Date());
  };

  return (
    <div className="w-full min-h-screen bg-white pb-6 relative">
      {/* Background Pattern - Matching main page */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem]">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[radial-gradient(circle_800px_at_100%_200px,#d5c5ff,transparent)]"></div>
      </div>
      
      {/* Compact Header with Month Navigation */}
      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-40 shadow-sm relative">
        {/* Top Bar - Always Visible */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900 truncate">
              Attendance Details
            </h2>
            <p className="text-xs text-gray-600 truncate">
              {userName.toUpperCase()}
            </p>
          </div>
          
          {/* Month Navigation - Compact Inline */}
          <div className="flex items-center gap-2 ml-3">
            <button
              onClick={goToPreviousMonth}
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors active:bg-gray-200 touch-manipulation"
              aria-label="Previous month"
            >
              <svg
                className="w-4 h-4 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <span className="text-xs sm:text-sm font-semibold text-gray-900 px-2 text-center min-w-[100px] sm:min-w-[140px]">
              {currentMonthDisplay}
            </span>
            <button
              onClick={goToNextMonth}
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors active:bg-gray-200 touch-manipulation"
              aria-label="Next month"
            >
              <svg
                className="w-4 h-4 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Collapsible Filters */}
        <div className="bg-gray-50/50 border-t border-gray-200/50">
          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full px-3 py-2 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-100/50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <svg
                className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}
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
              Filters
              {(selectedSubject !== "All Subjects" || selectedMonth || selectedDate) && (
                <span className="bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  Active
                </span>
              )}
            </span>
            {(selectedSubject !== "All Subjects" || selectedMonth || selectedDate) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReset();
                }}
                className="text-xs text-purple-600 hover:text-purple-700 font-medium"
              >
                Clear
              </button>
            )}
          </button>

          {/* Collapsible Filter Content */}
          {showFilters && (
            <div className="px-3 py-2.5 space-y-2 border-t border-gray-200">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-2.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500 bg-white appearance-none"
                >
                  {uniqueSubjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject.length > 30 ? subject.substring(0, 30) + "..." : subject}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Month
                  </label>
                  <select
                    value={
                      selectedMonth
                        ? `${selectedMonth.getFullYear()}-${selectedMonth.getMonth()}`
                        : ""
                    }
                    onChange={(e) => {
                      if (e.target.value) {
                        const [year, month] = e.target.value.split("-").map(Number);
                        setSelectedMonth(new Date(year, month, 1));
                        setCurrentMonth(new Date(year, month, 1));
                      } else {
                        setSelectedMonth(null);
                      }
                    }}
                    className="w-full px-2.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500 bg-white appearance-none"
                  >
                    <option value="">All</option>
                    {uniqueMonths.map((month, idx) => (
                      <option
                        key={idx}
                        value={`${month.getFullYear()}-${month.getMonth()}`}
                      >
                        {month.toLocaleDateString("en-GB", {
                          month: "short",
                          year: "numeric",
                        })}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="text"
                    value={selectedDate}
                    onChange={(e) => {
                      let value = e.target.value;
                      value = value.replace(/[^\d-]/g, "");
                      if (value.length > 2 && value.charAt(2) !== "-") {
                        value = value.slice(0, 2) + "-" + value.slice(2);
                      }
                      if (value.length > 5 && value.charAt(5) !== "-") {
                        value = value.slice(0, 5) + "-" + value.slice(5);
                      }
                      if (value.length <= 10) {
                        setSelectedDate(value);
                      }
                    }}
                    placeholder="dd-mm-yyyy"
                    className="w-full px-2.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500 bg-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content - Card Based Layout */}
      <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        {groupedByDate.length === 0 ? (
          <div className="bg-black/5 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-lg shadow-slate-600/20 p-6 sm:p-8 text-center border border-gray-200/50">
            <p className="text-gray-500 text-sm sm:text-base">No attendance records found for the selected filters.</p>
          </div>
        ) : (
          groupedByDate.map((dateGroup) => (
            <div key={dateGroup.dateStr} className="bg-black/5 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-lg shadow-slate-600/20 overflow-hidden border border-gray-200/50">
              {/* Date Header */}
              <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-200/50 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base sm:text-lg font-bold text-gray-900">
                      {dateGroup.dateStr}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 mt-0.5">
                      {dateGroup.weekday}
                    </div>
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-gray-700 bg-white/80 backdrop-blur-sm px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-sm border border-gray-200/50">
                    {dateGroup.items.length} {dateGroup.items.length === 1 ? "class" : "classes"}
                  </div>
                </div>
              </div>

              {/* Classes List */}
              <div className="divide-y divide-gray-200/50">
                {dateGroup.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="px-3 sm:px-4 py-3 sm:py-4 hover:bg-white/30 transition-colors bg-white/5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Subject */}
                        <div className="text-sm sm:text-base font-semibold text-gray-900 mb-1.5 leading-tight">
                          {item.subject}
                        </div>
                        
                        {/* Faculty */}
                        <div className="text-xs sm:text-sm text-gray-600 mb-2">
                          {item.faculty}
                        </div>

                        {/* Hour & Status Row */}
                        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="text-xs font-medium text-gray-500 uppercase">Hour</span>
                            <span className="text-sm sm:text-base font-bold text-gray-900 bg-gray-100 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md">
                              {item.hour}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <span
                              className={`h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full ${
                                item.isPresent ? "bg-green-500" : "bg-red-500"
                              }`}
                            ></span>
                            <span
                              className={`text-xs sm:text-sm font-semibold ${
                                item.isPresent ? "text-green-700" : "text-red-700"
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
