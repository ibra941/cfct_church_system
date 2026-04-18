import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import api from '../services/api'

const MemberDetails = () => {
  const { id } = useParams()
  const { language } = useLanguage()
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchMember() }, [id])

  const fetchMember = async () => {
    try {
      const response = await api.get(`/members/${id}/`)
      setMember(response.data)
    } catch (error) { console.error(error) } finally { setLoading(false) }
  }

  if (loading) return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{member.full_name || member.username}</h1>
            <div className="grid md:grid-cols-2 gap-6"><div><p className="text-gray-600 dark:text-gray-300"><strong>{language === 'sw' ? 'Jina Kamili' : 'Full Name'}:</strong> {member.full_name}</p><p><strong>Email:</strong> {member.email}</p><p><strong>{language === 'sw' ? 'Simu' : 'Phone'}:</strong> {member.phone}</p></div><div><p><strong>{language === 'sw' ? 'Nafasi' : 'Role'}:</strong> {member.role}</p><p><strong>{language === 'sw' ? 'Hali' : 'Status'}:</strong> {member.is_active ? (language === 'sw' ? 'Inatumika' : 'Active') : (language === 'sw' ? 'Haijatumika' : 'Inactive')}</p><p><strong>{language === 'sw' ? 'Tarehe ya Kujiunga' : 'Joined'}:</strong> {new Date(member.created_at).toLocaleDateString()}</p></div></div>
    </div>
  )
}

export default MemberDetails