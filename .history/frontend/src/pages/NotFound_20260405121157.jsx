import React from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import Navbar from '../components/common/Navbar'

const NotFound = () => {
  const { language } = useLanguage()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="flex flex-col justify-center items-center h-screen -mt-16">
        <h1 className="text-9xl font-bold text-primary-600">404</h1>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mt-4">{language === 'sw' ? 'Ukurasa Haupatikani' : 'Page Not Found'}</h2>
        <p className="text-gray-600 dark:text-gray-300 mt-2">{language === 'sw' ? 'Samahani, ukurasa uliouitwa haupo.' : 'Sorry, the page you requested does not exist.'}</p>
        <Link to="/" className="btn-primary mt-8">{language === 'sw' ? 'Rudi Nyumbani' : 'Go Back Home'}</Link>
      </div>
    </div>
  )
}

export default NotFound