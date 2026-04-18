import React, { useState, useEffect } from 'react'
import { FaTimes } from 'react-icons/fa'
import { useLanguage } from '../../contexts/LanguageContext'
import api from '../../services/api'

const PopupNews = ({ onClose }) => {
  const { language } = useLanguage()
  const [news, setNews] = useState(null)

  useEffect(() => {
    fetchPopupNews()
  }, [])

  const fetchPopupNews = async () => {
    try {
      const response = await api.get('/events/?is_popup_news=true')
      if (response.data.length > 0) {
        setNews(response.data[0])
      }
    } catch (error) {
      console.error('Error fetching popup news:', error)
    }
  }

  if (!news) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {language === 'sw' ? 'Tangazo' : 'Announcement'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FaTimes />
          </button>
        </div>
        {news.images && news.images[0] && (
          <img src={news.images[0]} alt={news.title} className="w-full h-48 object-cover" />
        )}
        <div className="p-4">
          <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{news.title}</h4>
          <p className="text-gray-600 dark:text-gray-300">{news.description}</p>
          {news.event_date && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
              📅 {new Date(news.event_date).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="p-4 border-t dark:border-gray-700">
          <button onClick={onClose} className="btn-primary w-full">
            {language === 'sw' ? 'Funga' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PopupNews