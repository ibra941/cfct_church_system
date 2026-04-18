import React from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import Navbar from '../components/common/Navbar'
import Sidebar from '../components/common/Sidebar'

const Settings = () => {
  const { language, toggleLanguage } = useLanguage()
  const { user } = useAuth()
  const { darkMode, toggleDarkMode } = useTheme()

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{language === 'sw' ? 'Mipangilio' : 'Settings'}</h1>
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"><h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{language === 'sw' ? 'Mwonekano' : 'Appearance'}</h2><div className="flex justify-between items-center"><span className="text-gray-700 dark:text-gray-300">{language === 'sw' ? 'Hali ya Giza' : 'Dark Mode'}</span><button onClick={toggleDarkMode} className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${darkMode ? 'bg-primary-600' : 'bg-gray-300'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${darkMode ? 'translate-x-6' : 'translate-x-1'}`} /></button></div></div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"><h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{language === 'sw' ? 'Lugha' : 'Language'}</h2><div className="flex justify-between items-center"><span className="text-gray-700 dark:text-gray-300">{language === 'sw' ? 'Badilisha Lugha' : 'Change Language'}</span><button onClick={toggleLanguage} className="btn-secondary">{language === 'sw' ? 'Switch to English' : 'Badilisha Kiswahili'}</button></div></div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"><h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{language === 'sw' ? 'Akaunti' : 'Account'}</h2><div className="space-y-3"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{language === 'sw' ? 'Jina la Mtumiaji' : 'Username'}</label><p className="mt-1 text-gray-900 dark:text-white">{user?.username}</p></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label><p className="mt-1 text-gray-900 dark:text-white">{user?.email}</p></div></div></div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Settings