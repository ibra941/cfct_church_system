import { useAuth } from '../contexts/AuthContext'

const roleHierarchy = { national_leader: 5, zone_leader: 4, regional_leader: 3, district_leader: 2, local_leader: 1, local_member: 0 }

export const useRoleAccess = () => {
  const { user } = useAuth()
  const hasRole = (requiredRole) => { if (!user) return false; return roleHierarchy[user.role] >= roleHierarchy[requiredRole] }
  const isAtLeast = (level) => hasRole(level)
  return { userRole: user?.role, hasRole, isAtLeast }
}