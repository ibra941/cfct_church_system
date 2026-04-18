import React from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { FaSun, FaMoon } from 'react-icons/fa'

const DarkLightToggle = () => {
  const { darkMode, toggleDarkMode } = useTheme()

  return (
    <button onClick={toggleDarkMode} className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition">
      {darkMode ? <FaSun className="text-yellow-500 w-5 h-5" /> : <FaMoon className="text-gray-600 w-5 h-5" />}
    </button>
  )
}

export default DarkLightToggle