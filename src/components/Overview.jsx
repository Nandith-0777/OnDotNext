"use client";

export default function Overview({ courseSummary, userName, isEligibleForCondonation }) {
  if (!courseSummary) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="text-center text-gray-500">
          <p>No attendance data available. Please check your attendance first.</p>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const courses = Object.entries(courseSummary.courses);
  const safeCourses = courses.filter(([_, stats]) => stats.percentage >= 75);
  const dangerCourses = courses.filter(([_, stats]) => stats.percentage < 75 && !stats.disabledReason);
  const disabledCourses = courses.filter(([_, stats]) => stats.disabledReason);

  const totalCourses = courses.length;
  const safePercentage = totalCourses > 0 ? (safeCourses.length / totalCourses) * 100 : 0;

  // Calculate total classes and attended
  const totalStats = courses.reduce(
    (acc, [_, stats]) => {
      acc.totalAttended += stats.attendedClasses;
      acc.totalOverall += stats.totalClasses;
      return acc;
    },
    { totalAttended: 0, totalOverall: 0 }
  );

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {/* Welcome Section */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {userName}!
        </h2>
        <p className="text-gray-600">Here's your attendance overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Attendance Card */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Overall Attendance</h3>
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {courseSummary.totalPercentage.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {totalStats.totalAttended} / {totalStats.totalOverall} classes
          </p>
        </div>

        {/* Safe Courses Card */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Safe Courses</h3>
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{safeCourses.length}</p>
          <p className="text-sm text-gray-500 mt-1">
            {safePercentage.toFixed(0)}% of total courses
          </p>
        </div>

        {/* At Risk Courses Card */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">At Risk</h3>
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{dangerCourses.length}</p>
          <p className="text-sm text-gray-500 mt-1">Need attention</p>
        </div>

        {/* Total Condonation Card */}
        {isEligibleForCondonation && courseSummary.totalCondonation > 0 && (
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Condonation</h3>
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-red-600">₹{courseSummary.totalCondonation}</p>
            <p className="text-sm text-gray-500 mt-1">Total fee</p>
          </div>
        )}
      </div>

      {/* Course Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Safe Courses List */}
        {safeCourses.length > 0 && (
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-green-500"></span>
              Safe Courses ({safeCourses.length})
            </h3>
            <div className="space-y-3">
              {safeCourses.map(([courseName, stats]) => (
                <div key={courseName} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{courseName}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {stats.attendedClasses}/{stats.totalClasses} classes
                    </p>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-lg font-bold text-green-600">{stats.percentage.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">Skips: {stats.statusValue}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* At Risk Courses List */}
        {dangerCourses.length > 0 && (
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-amber-500"></span>
              At Risk Courses ({dangerCourses.length})
            </h3>
            <div className="space-y-3">
              {dangerCourses.map(([courseName, stats]) => (
                <div key={courseName} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{courseName}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {stats.attendedClasses}/{stats.totalClasses} classes
                    </p>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-lg font-bold text-amber-600">{stats.percentage.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">Need: {stats.statusValue}</p>
                    {isEligibleForCondonation && stats.condonation > 0 && (
                      <p className="text-xs text-red-600 font-semibold">₹{stats.condonation}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Disabled Courses (if any) */}
      {disabledCourses.length > 0 && (
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-6 border border-gray-200 mt-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-gray-400"></span>
            Disabled Courses ({disabledCourses.length})
          </h3>
          <div className="space-y-3">
            {disabledCourses.map(([courseName, stats]) => (
              <div key={courseName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg opacity-60">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{courseName}</p>
                  <p className="text-xs text-gray-500 mt-1 italic">{stats.disabledReason}</p>
                </div>
                <div className="ml-4 text-right">
                  <p className="text-lg font-bold text-gray-500">{stats.percentage.toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
