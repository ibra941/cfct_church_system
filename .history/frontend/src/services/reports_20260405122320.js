import api from './api'

export const getFinancialReports = async () => { const response = await api.get('/finance/reports/'); return response.data }
export const exportReport = async (type, format) => { const response = await api.get(`/reports/export/${type}/?format=${format}`, { responseType: 'blob' }); return response.data }