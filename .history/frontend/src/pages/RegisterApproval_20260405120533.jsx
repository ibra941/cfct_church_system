import React, { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import Navbar from '../components/common/Navbar'
import Sidebar from '../components/common/Sidebar'
import api from '../services/api'
import toast from 'react-hot-toast'

const RegisterApproval = () => {
  const { language } = useLanguage()
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchRegistrations() }, [])

  const fetchRegistrations = async () => {
    try {
      const response = await api.get('/members/registrations/pending/')
      setRegistrations(response.data)
    } catch (error) { console.error(error) } finally { setLoading(false) }
  }

  const handleApproval = async (id, action) => {
    try {
      await api.post(`/members/registrations/${id}/${action}/`)
      toast.success(language === 'sw' ? `Ombi lime${action === 'approve' ? 'kubaliwa' : 'kataliwa'}` : `Request ${action === 'approve' ? 'approved' : 'rejected'}`)
      fetchRegistrations()
    } catch (error) { toast.error(language === 'sw' ? 'Hitilafu imetokea' : 'An error occurred') }
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{language === 'sw' ? 'Idhini ya Wanachama' : 'Member Approvals'}</h1>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{language === 'sw' ? 'Jina' : 'Name'}</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{language === 'sw' ? 'Simu' : 'Phone'}</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{language === 'sw' ? 'Kitendo' : 'Action'}</th></tr></thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {registrations.map((reg) => (
                  <tr key={reg.id}><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{reg.personal_info.full_name}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{reg.personal_info.email}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{reg.personal_info.phone}</td><td className="px-6 py-4 whitespace-nowrap text-sm space-x-2"><button onClick={() => handleApproval(reg.id, 'approve')} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded">{language === 'sw' ? 'Kubali' : 'Approve'}</button><button onClick={() => handleApproval(reg.id, 'reject')} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">{language === 'sw' ? 'Kataa' : 'Reject'}</button></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  )
}

export default RegisterApproval