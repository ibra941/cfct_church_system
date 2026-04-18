import React, { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import api from '../services/api'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const FinanceReports = () => {
  const { language } = useLanguage()
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const response = await api.get('/finance/monthly-summary/')
      setChartData(response.data)
    } catch (error) { console.error(error) } finally { setLoading(false) }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{language === 'sw' ? 'Ripoti za Fedha' : 'Finance Reports'}</h1>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"><h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{language === 'sw' ? 'Mapato ya Mwezi' : 'Monthly Income'}</h2><ResponsiveContainer width="100%" height={300}><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="amount" stroke="#2563eb" /></LineChart></ResponsiveContainer></div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"><h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{language === 'sw' ? 'Matoleo kwa Aina' : 'Offerings by Type'}</h2><ResponsiveContainer width="100%" height={300}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="type" /><YAxis /><Tooltip /><Legend /><Bar dataKey="amount" fill="#2563eb" /></BarChart></ResponsiveContainer></div>
      </div>
    </div>
  )
}

export default FinanceReports