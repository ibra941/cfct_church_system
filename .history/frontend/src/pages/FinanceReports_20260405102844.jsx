import React, { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import Navbar from '../components/common/Navbar'
import api from '../services/api'

const FinanceReports = () => {
  const { language } = useLanguage()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      const response = await api.get('/finance/reports/')
      setReports(response.data)
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setLoading(false)
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
          {language === 'sw' ? 'Ripoti za Fedha' : 'Finance Reports'}
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {language === 'sw' ? 'Muhtasari wa Fedha' : 'Financial Summary'}
          </h2>
          <div className="space-y-4">
            {reports.map((report, index) => (
              <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {report.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(report.date).toLocaleDateString()}
                    </p>
                  </div>
                  <button className="text-primary-600 hover:text-primary-700">
                    {language === 'sw' ? 'Pakua' : 'Download'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FinanceReports