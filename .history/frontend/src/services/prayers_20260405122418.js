import api from './api'

export const getPrayers = async () => { const response = await api.get('/prayers/'); return response.data }
export const createPrayer = async (data) => { const response = await api.post('/prayers/', data); return response.data }
export const prayForRequest = async (id) => { const response = await api.post(`/prayers/${id}/pray/`); return response.data }
