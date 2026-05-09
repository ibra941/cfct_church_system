import { useEffect, useRef, useState } from "react";
import {
  FaBars,
  FaGlobe,
  FaMoon,
  FaSignOutAlt,
  FaSun,
  FaUser,
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTheme } from "../../contexts/ThemeContext";
import Sidebar from "./Sidebar";

const Navbar = ({ showSidebarToggle = true, onMenuClick }) => {
  const { user, logout } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const { darkMode, toggleDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const navigate = useNavigate();

  const handleLogout = () => {
    setProfileMenuOpen(false);
    logout();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const isAuthenticated = !!user;

  return (
    <>
      <nav className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {isAuthenticated && (showSidebarToggle || !!onMenuClick) && (
                <button
                  onClick={() => {
                    if (onMenuClick) {
                      onMenuClick();
                    } else {
                      setSidebarOpen(!sidebarOpen);
                    }
                  }}
                  className="mr-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
                  aria-label={language === "sw" ? "Fungua menu" : "Open menu"}
                >
                  <FaBars className="text-gray-600 dark:text-gray-300" />
                </button>
              )}
              <Link to="/" className="flex-shrink-0 flex items-center">
                <img
                  className="h-8 w-auto"
                  src="/icons/icon-72x72.png"
                  alt="CFCT"
                />
                <span className="ml-2 text-xl font-bold text-primary-600 dark:text-primary-400">
                  CFCT
                </span>
              </Link>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <button
                onClick={toggleLanguage}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <FaGlobe className="text-gray-600 dark:text-gray-300" />
                <span className="ml-1 text-sm">
                  {language === "sw" ? "EN" : "SW"}
                </span>
              </button>

              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {darkMode ? (
                  <FaSun className="text-yellow-500" />
                ) : (
                  <FaMoon className="text-gray-600" />
                )}
              </button>

              {isAuthenticated ? (
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={() => setProfileMenuOpen((prev) => !prev)}
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 min-w-0"
                  >
                    {user?.profile_picture_url ? (
                      <img
                        src={user.profile_picture_url}
                        alt={user?.full_name || user?.username || "Profile"}
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    ) : (
                      <FaUser className="text-gray-600 dark:text-gray-300" />
                    )}
                    <span className="hidden sm:block text-gray-700 dark:text-gray-200 truncate max-w-[11rem]">
                      {user.full_name || user.username}
                    </span>
                  </button>
                  <div
                    className={`absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg ${profileMenuOpen ? "block" : "hidden"}`}
                  >
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <FaSignOutAlt className="inline mr-2" />
                      {language === "sw" ? "Ondoka" : "Logout"}
                    </button>
                  </div>
                </div>
              ) : (
                <Link to="/login" className="btn-primary">
                  {language === "sw" ? "Ingia" : "Login"}
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      {isAuthenticated && showSidebarToggle && !onMenuClick && sidebarOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setSidebarOpen(false)}
          ></div>
          <div className="fixed left-0 top-0 h-full w-64">
            <Sidebar />
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
