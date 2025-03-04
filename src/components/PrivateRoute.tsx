import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type PrivateRouteProps = {
  children: React.ReactNode
  allowedRoles?: ('admin' | 'manager' | 'employee')[]
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ 
  children, 
  allowedRoles 
}) => {
  const { currentUser } = useAuth()

  // Não está logado
  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  // Verificar roles permitidas
  if (allowedRoles && !allowedRoles.includes(currentUser.role as any)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
