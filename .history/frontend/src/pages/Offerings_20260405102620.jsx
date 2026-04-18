import React, { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import Navbar from '../components/common/Navbar'
import api from '../services/api'

const Offerings = () => {
  const { language } = useLanguage()
  const [offerings, setOfferings] = useState([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    amount: '',
    offering_type: 'tithe',
    payment_method: 'cash'
  })

  useEffect(() => {
    fetchOfferings()
  }, [])

  const fetchOfferings = async () => {
    try {
      const response = await api.get('/offerings/')
      setOfferings(response.data)
    } catch (error) {
      console.error('Error fetching offerings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/offerings/', formData)
      setFormData({ amount: '', offering_type: 'tithe', payment_method: 'cash' })
      fetchOfferings()
    } catch (error) {
      console.error('Error creating offering:', error)
    }
  }

  const totalOfferings = offerings.reduce((sum, o) => sum + parseFloat(o.amount || 0), 0)

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
          {language === 'sw' ? 'Matoleo' : 'Offerings'}
        </h1>

        {/* Summary Card */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-lg shadow-lg p-6 mb-8">
          <h3 className="text-white text-lg mb-2">
            {language === 'sw' ? 'Jumla ya Matoleo' : 'Total Offerings'}
          </h3>
          <p className="text-white text-4xl font-bold">
            TZS {totalOfferings.toLocaleString()}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Add Offering Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {language === 'sw' ? 'Ongeza Mchango' : 'Add Offering'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'sw' ? 'Kiasi (TZS)' : 'Amount (TZS)'}
                </label>
                <input
                  type="number"
                  required
                  className="input"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'sw' ? 'Aina ya Mchango' : 'Offering Type'}
                </label>
                <select
                  className="input"
                  value={formData.offering_type}
                  onChange={(e) => setFormData({ ...formData, offering_type: e.target.value })}
                >
                  <option value="tithe">Zaka</option>
                  <option value="offering">Sadaka</option>
                  <option value="building">Mchango wa Jengo</option>
                  <option value="mission">Mchango wa Misheni</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {language === 'sw' ? 'Njia ya Malipo' : 'Payment Method'}
                </label>
                <select
                  className="input"
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                >
                  <option value="cash">Cash</option>
                  <option value="mobile">Mobile Money</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>
              <button type="submit" className="btn-primary w-full">
                {language === 'sw' ? 'Wasilisha Mchango' : 'Submit Offering'}
              </button>
            </form>
          </div>

          {/* Offerings List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {language === 'sw' ? 'Matoleo ya Hivi Karibuni' : 'Recent Offerings'}
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {offerings.slice(0, 10).map((offering) => (
                <div key={offering.id} className="border-b border-gray-200 dark:border-gray-700 pb-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">
                      {new Date(offering.created_at).toLocaleDateString()}
                    </span>
                    <span className="font-bold text-primary-600">
                      TZS {parseFloat(offering.amount).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {offering.offering_type} - {offering.payment_method}
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

export default Offerings