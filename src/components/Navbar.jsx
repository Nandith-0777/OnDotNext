"use client";
import { useState, useEffect } from "react";

export default function Navbar({ activeSection, onSectionChange, onLogout, userName }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show navbar at top or when scrolling up
      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
        // Scrolling down - hide navbar
        setIsVisible(false);
      } else {
        // Scrolling up - show navbar
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const sections = [
    { id: "attendance", label: "Attendance" },
    { id: "overview", label: "Overview" },
    { id: "feedback", label: "Feedback" },
  ];

  const handleFeedbackClick = () => {
    window.open("https://vidyafeedback.vercel.app/", "_blank");
  };

  return (
    <nav className={`w-full sticky top-0 z-50 transition-transform duration-300 ${
      isVisible ? 'translate-y-0' : '-translate-y-full'
    }`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-1">
        <div className="bg-white/40 backdrop-blur-xl rounded-2xl border border-white/30 shadow-lg shadow-black/5 px-3 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Left: Logo */}
          <button
            onClick={() => onSectionChange("attendance")}
            className="flex-shrink-0 flex items-center gap-2 hover:opacity-80 transition-opacity"
            aria-label="Home"
          >
            <div className="relative">
              <img
                src="/OnDotNext.png"
                alt="OnDot Logo"
                className="h-7 w-7 sm:h-8 sm:w-8 object-contain"
                onError={(e) => {
                  // Hide broken image and show fallback
                  e.target.style.display = 'none';
                  const fallback = e.target.parentElement?.querySelector('.logo-fallback');
                  if (fallback) {
                    fallback.style.display = 'flex';
                  }
                }}
              />
              {/* Fallback icon if logo doesn't load */}
              <div className="logo-fallback hidden w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 items-center justify-center">
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5 text-white"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>

          {/* Center: Navigation Links */}
          <div className="flex-1 flex justify-center items-center gap-1 sm:gap-2 px-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  if (section.id === "feedback") {
                    handleFeedbackClick();
                  } else {
                    onSectionChange(section.id);
                    setIsMenuOpen(false);
                  }
                }}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  activeSection === section.id
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-700 hover:bg-gray-100 active:bg-gray-200"
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>

          {/* Right: Log Out Button */}
          <button
            onClick={onLogout}
            className="flex-shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 active:bg-gray-700 transition-colors shadow-sm"
          >
            <span className="hidden sm:inline">Log Out</span>
            <span className="sm:hidden">Out</span>
          </button>
        </div>
        </div>
      </div>
    </nav>
  );
}
