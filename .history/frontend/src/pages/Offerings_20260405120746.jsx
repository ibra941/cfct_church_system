import React, { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import Navbar from '../components/common/Navbar'
import Sidebar from '../components/common/Sidebar'
import api from '../services/api'
import toast from 'react-hot-toast'

const Offerings = () => {
  const { language } = useLanguage()
  const [offerings, setOfferings] = useState([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({ amount: '', offering_type: 'tithe', payment_method: 'cash', member: '' })
  const [members, setMembers] = useState([])

  useEffect(() => { fetchOfferings(); fetchMembers() }, [])

  const fetchOfferings = async () => {
    try { const response = await api.get('/offerings/'); setOfferings(response.data) } catch (error) { console.error(error) } finally { setLoading(false) }
  }
  const fetchMembers = async () => {
    try { const response = await api.get('/members/'); setMembers(response.data) } catch (error) { console.error(error) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/offerings/', formData)
      toast.success(language === 'sw' ? 'Mchango umehifadhiwa!' : 'Offering saved!')
      setFormData({ amount: '', offering_type: 'tithe', payment_method: 'cash', member: '' })
      fetchOfferings()
    } catch (error) { toast.error(language === 'sw' ? 'Hitilafu imetokea' : 'An error occurred') }
  }

  const totalOfferings = offerings.reduce((sum, o) => sum + parseFloat(o.amount || 0), 0)

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{language === 'sw' ? 'Matoleo' : 'Offerings'}</h1>
          <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-lg shadow-lg p-6 mb-6"><h3 className="text-white text-lg mb-2">{language === 'sw' ? 'Jumla ya Matoleo' : 'Total Offerings'}</h3><p className="text-white text-4xl font-bold">TZS {totalOfferings.toLocaleString()}</p></div>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"><h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{language === 'sw' ? 'Ongeza Mchango' : 'Add Offering'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4"><select className="input" value={formData.member} onChange={(e) => setFormData({ ...formData, member: e.target.value })} required><option value="">{language === 'sw' ? 'Chagua Mwanachama' : 'Select Member'}</option>{members.map((m) => (<option key={m.id} value={m.id}>{m.full_name || m.username}</option>))}</select>
              <input type="number" placeholder={language === 'sw' ? 'Kiasi (TZS)' : 'Amount (TZS)'} className="input" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
              <select className="input" value={formData.offering_type} onChange={(e) => setFormData({ ...formData, offering_type: e.target.value })}><option value="tithe">Zaka</option><option value="offering">Sadaka</option><option value="building">Mchango wa Jengo</option><option value="mission">Mchango wa Misheni</option></select>
              <select className="input" value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}><option value="cash">Cash</option><option value="mobile">Mobile Money</option><option value="bank">Bank Transfer</option></select>
              <button type="submit" className="btn-primary w-full">{language === 'sw' ? 'Wasilisha Mchango' : 'Submit Offering'}</button></form></div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"><h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{language === 'sw' ? 'Matoleo ya Hivi Karibuni' : 'Recent Offerings'}</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">{offerings.slice(0, 10).map((offering) => (<div key={offering.id} className="border-b border-gray-200 dark:border-gray-700 pb-3"><div className="flex justify-between"><span className="text-gray-600 dark:text-gray-300">{new Date(offering.created_at).toLocaleDateString()}</span><span className="font-bold text-primary-600">TZS {parseFloat(offering.amount).toLocaleString()}</span></div><div className="text-sm text-gray-500 dark:text-gray-400">{offering.offering_type} - {offering.payment_method}</div></div>))}</div></div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Offerings