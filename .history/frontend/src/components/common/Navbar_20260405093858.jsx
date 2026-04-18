import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { useTheme } from '../../contexts/ThemeContext'
import { FaSun, FaMoon, FaGlobe, FaUser, FaSignOutAlt } from 'react-icons/fa'

const Navbar = () => {
  const { user, logout } = useAuth()
  const { language, toggleLanguage } = useLanguage()
  const { darkMode, toggleDarkMode } = useTheme()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <img className="h-8 w-auto" src="/icons/icon-72x72.png" alt="CFCT" />
              <span className="ml-2 text-xl font-bold text-primary-600 dark:text-primary-400">
                CFCT
              </span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Switch language"
            >
              <FaGlobe className="text-gray-600 dark:text-gray-300" />
              <span className="ml-1 text-sm">{language === 'sw' ? 'EN' : 'SW'}</span>
            </button>

            {/* Dark/Light Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Toggle theme"
            >
              {darkMode ? (
                <FaSun className="text-yellow-500" />
              ) : (
                <FaMoon className="text-gray-600" />
              )}
            </button>

            {/* User Menu */}
            {user ? (
              <div className="relative group">
                <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                  <FaUser className="text-gray-600 dark:text-gray-300" />
                  <span className="text-gray-700 dark:text-gray-200">{user.full_name}</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg hidden group-hover:block">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <FaSignOutAlt className="inline mr-2" />
                    {language === 'sw' ? 'Ondoka' : 'Logout'}
                  </button>
                </div>
              </div>
            ) : (
              <Link
                to="/login"
                className="btn-primary"
              >
                {language === 'sw' ? 'Ingia' : 'Login'}
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar