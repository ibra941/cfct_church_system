import React, { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import Navbar from '../components/common/Navbar'
import api from '../services/api'

const PrayerRequests = () => {
  const { language } = useLanguage()
  const { user } = useAuth()
  const [prayers, setPrayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [requestText, setRequestText] = useState('')
  const [isPublic, setIsPublic] = useState(true)

  useEffect(() => {
    fetchPrayers()
  }, [])

  const fetchPrayers = async () => {
    try {
      const response = await api.get('/prayers/')
      setPrayers(response.data)
    } catch (error) {
      console.error('Error fetching prayers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/prayers/', {
        request: requestText,
        is_public: isPublic
      })
      setRequestText('')
      fetchPrayers()
    } catch (error) {
      console.error('Error submitting prayer:', error)
    }
  }

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          {language === 'sw' ? 'Maombi' : 'Prayer Requests'}
        </h1>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Submit Prayer Request */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {language === 'sw' ? 'Wasilisha Ombi la Maombi' : 'Submit Prayer Request'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <textarea
                  className="input"
                  rows="4"
                  placeholder={language === 'sw' 
                    ? 'Andika ombi lako la maombi hapa...'
                    : 'Write your prayer request here...'}
                  value={requestText}
                  onChange={(e) => setRequestText(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  {language === 'sw' 
                    ? 'Weka ombi langu hadharani (wengine wanaweza kuona)'
                    : 'Make my request public (others can see it)'}
                </label>
              </div>
              <button type="submit" className="btn-primary w-full">
                {language === 'sw' ? 'Wasilisha Ombi' : 'Submit Request'}
              </button>
            </form>
          </div>

          {/* Prayer Requests List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {language === 'sw' ? 'Maombi ya Hivi Karibuni' : 'Recent Prayer Requests'}
            </h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {prayers.map((prayer) => (
                <div key={prayer.id} className="border-b border-gray-200 dark:border-gray-700 pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-gray-900 dark:text-white">{prayer.request}</p>
                      <div className="flex items-center mt-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>🙏 {new Date(prayer.created_at).toLocaleDateString()}</span>
                        {prayer.prayer_count > 0 && (
                          <span className="ml-4">❤️ {prayer.prayer_count} {language === 'sw' ? 'walioomba' : 'prayed'}</span>
                        )}
                      </div>
                    </div>
                    <button className="text-primary-600 hover:text-primary-700 text-sm">
                      {language === 'sw' ? 'Nimeomba' : 'I Prayed'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrayerRequests