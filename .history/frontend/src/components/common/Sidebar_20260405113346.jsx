import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { 
  FaHome, FaUsers, FaDonate, FaCalendarAlt, 
  FaChartLine, FaCog, FaPray, FaExchangeAlt, 
  FaClipboardList, FaCheckDouble 
} from 'react-icons/fa'

const Sidebar = () => {
  const { user } = useAuth()
  const { language } = useLanguage()
  const location = useLocation()

  const menuItems = [
    { path: '/dashboard', icon: <FaHome />, label: language === 'sw' ? 'Dashibodi' : 'Dashboard', roles: ['national_leader', 'zone_leader', 'regional_leader', 'district_leader'] },
    { path: '/members', icon: <FaUsers />, label: language === 'sw' ? 'Wanachama' : 'Members', roles: ['national_leader', 'zone_leader', 'regional_leader', 'district_leader'] },
    { path: '/offerings', icon: <FaDonate />, label: language === 'sw' ? 'Matoleo' : 'Offerings', roles: ['national_leader', 'finance_team'] },
    { path: '/events', icon: <FaCalendarAlt />, label: language === 'sw' ? 'Matukio' : 'Events', roles: ['national_leader', 'zone_leader', 'regional_leader', 'district_leader'] },
    { path: '/finance', icon: <FaChartLine />, label: language === 'sw' ? 'Fedha' : 'Finance', roles: ['national_leader', 'finance_team'] },
    { path: '/prayers', icon: <FaPray />, label: language === 'sw' ? 'Maombi' : 'Prayers', roles: ['national_leader', 'zone_leader', 'regional_leader', 'district_leader', 'local_member'] },
    { path: '/transfers', icon: <FaExchangeAlt />, label: language === 'sw' ? 'Uhamisho' : 'Transfers', roles: ['national_leader', 'zone_leader'] },
    { path: '/audit-logs', icon: <FaClipboardList />, label: language === 'sw' ? 'Rekodi' : 'Audit Logs', roles: ['national_leader'] },
    { path: '/approvals', icon: <FaCheckDouble />, label: language === 'sw' ? 'Idhini' : 'Approvals', roles: ['national_leader', 'zone_leader', 'regional_leader', 'district_leader'] },
    { path: '/settings', icon: <FaCog />, label: language === 'sw' ? 'Mipangilio' : 'Settings', roles: ['national_leader', 'zone_leader', 'regional_leader', 'district_leader'] },
  ]

  const filteredMenu = menuItems.filter(item => item.roles.includes(user?.role))

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 shadow-lg h-screen sticky top-0 overflow-y-auto">
      <div className="p-4 border-b dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <img src="/icons/icon-72x72.png" alt="CFCT" className="w-8 h-8" />
          <span className="text-xl font-bold text-primary-600">CFCT</span>
        </div>
      </div>
      <nav className="p-4">
        {filteredMenu.map((item, index) => (
          <Link
            key={index}
            to={item.path}
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg mb-1 transition ${
              location.pathname === item.path
                ? 'bg-primary-600 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar