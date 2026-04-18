import React, { createContext, useState, useContext, useEffect } from 'react'
import i18n from '../translations/i18n'

const LanguageContext = createContext()

export const useLanguage = () => useContext(LanguageContext)

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'sw')

  useEffect(() => {
    i18n.changeLanguage(language)
    localStorage.setItem('language', language)
  }, [language])

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'sw' ? 'en' : 'sw')
  }

  const value = {
    language,
    setLanguage,
    toggleLanguage,
    t: i18n.t
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}