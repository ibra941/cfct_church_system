import React from 'react'
import { FaUsers, FaDonate, FaChurch, FaCalendarAlt } from 'react-icons/fa'
import { useLanguage } from '../../contexts/LanguageContext'
import LoadingSpinner from '../common/LoadingSpinner'

const DashboardCards = ({ stats, loading }) => {
  const { language } = useLanguage()

  if (loading) return <LoadingSpinner />

  const cards = [
    { title: language === 'sw' ? 'Wanachama' : 'Members', value: stats.totalMembers, icon: <FaUsers />, color: 'bg-blue-500' },
    { title: language === 'sw' ? 'Matoleo' : 'Offerings', value: `TZS ${stats.totalOfferings.toLocaleString()}`, icon: <FaDonate />, color: 'bg-green-500' },
    { title: language === 'sw' ? 'Makanisa' : 'Churches', value: stats.totalChurches, icon: <FaChurch />, color: 'bg-purple-500' },
    { title: language === 'sw' ? 'Matukio' : 'Events', value: stats.totalEvents, icon: <FaCalendarAlt />, color: 'bg-yellow-500' }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 transform hover:scale-105 transition duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{card.value}</p>
            </div>
            <div className={`${card.color} p-3 rounded-full text-white`}>{card.icon}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default DashboardCards