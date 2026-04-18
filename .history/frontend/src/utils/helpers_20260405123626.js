export const debounce = (func, wait) => { let timeout; return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func(...args), wait) } }
export const capitalize = (str) => str?.charAt(0).toUpperCase() + str?.slice(1).toLowerCase()
export const truncate = (str, length) => str?.length > length ? str.substring(0, length) + '...' : str