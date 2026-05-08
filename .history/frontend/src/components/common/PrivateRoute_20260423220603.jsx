import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import LoadingSpinner from './LoadingSpinner'

const ROLE_LEVELS = {
  local_member: 0,
  local_leader: 1,
  district_leader: 2,
  regional_leader: 3,
  zone_leader: 4,
  national_leader: 5,
}

const PrivateRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  if (requiredRole) {
    const userLevel = ROLE_LEVELS[user.role] ?? -1
    const requiredLevel = ROLE_LEVELS[requiredRole] ?? -1
    if (userLevel < requiredLevel) {
      return <Navigate to="/dashboard" />
    }
  }

  return children
}

export default PrivateRoute