export const formatCurrency = (amount) => `TZS ${amount?.toLocaleString() || 0}`
export const formatDate = (date) => new Date(date).toLocaleDateString()
export const formatDateTime = (date) => new Date(date).toLocaleString()
export const formatPhone = (phone) => phone?.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')