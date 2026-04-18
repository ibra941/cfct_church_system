import React, { useState, useEffect } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import Navbar from '../common/Navbar'
import Sidebar from '../common/Sidebar'
import DashboardCards from './DashboardCards'
import api from '../../services/api'

const NationalDashboard = () => {
  const { language } = useLanguage()
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalOfferings: 0,
    totalChurches: 0,
    totalEvents: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const [members, offerings, churches, events] = await Promise.all([
        api.get('/members/'),
        api.get('/offerings/'),
        api.get('/churches/'),
        api.get('/events/')
      ])
      setStats({
        totalMembers: members.data.length,
        totalOfferings: offerings.data.reduce((sum, o) => sum + parseFloat(o.amount || 0), 0),
        totalChurches: churches.data.length,
        totalEvents: events.data.length
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {language === 'sw' ? 'Dashibodi ya Taifa' : 'National Dashboard'}
          </h1>
          <DashboardCards stats={stats} loading={loading} />
        </main>
      </div>
    </div>
  )
}

export default NationalDashboard