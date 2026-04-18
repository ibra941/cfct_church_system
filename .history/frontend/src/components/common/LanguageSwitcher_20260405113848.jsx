import React from 'react'
import { useLanguage } from '../../contexts/LanguageContext'

const LanguageSwitcher = () => {
  const { language, toggleLanguage } = useLanguage()

  return (
    <button onClick={toggleLanguage} className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition">
      <span className="text-sm font-medium">{language === 'sw' ? 'Kiswahili' : 'English'}</span>
      <span className="text-xs text-gray-500 dark:text-gray-400">{language === 'sw' ? 'SW' : 'EN'}</span>
    </button>
  )
}

export default LanguageSwitcher