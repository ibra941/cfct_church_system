import api from '../services/api'

export const exportData = async (type, format = 'excel') => {
  try {
    const response = await api.get(`/reports/export/${type}/?format=${format}`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${type}_export.${format === 'excel' ? 'xlsx' : 'csv'}`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (error) { console.error('Export failed:', error) }
}