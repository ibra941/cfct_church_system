import api from './api'

export const getOfferings = async (params) => { const response = await api.get('/offerings/', { params }); return response.data }
export const createOffering = async (data) => { const response = await api.post('/offerings/', data); return response.data }
export const getMonthlySummary = async () => { const response = await api.get('/finance/monthly-summary/'); return response.data }