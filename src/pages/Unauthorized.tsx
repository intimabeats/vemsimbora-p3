import React from 'react'
import { Shield, Home } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const Unauthorized: React.FC = () => {
  const navigate = useNavigate()
  const { currentUser, logout } = useAuth()

  const handleReturn = () => {
    switch (currentUser?.role) {
      case 'admin':
        navigate('/admin/dashboard')
        break
      case 'manager':
        navigate('/manager/dashboard')
        break
      case 'employee':
        navigate('/employee/dashboard')
        break
      default:
        navigate('/login')
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-10 rounded-xl shadow-2xl text-center max-w-md w-full">
        <div className="flex justify-center mb-6">
          <Shield 
            className="text-red-500" 
            size={64} 
            strokeWidth={1.5} 
          />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Acesso Não Autorizado
        </h1>
        
        <p className="text-gray-600 mb-6">
          Você não tem permissão para acessar esta página. 
          Verifique suas credenciais ou entre em contato com o administrador.
        </p>

        {currentUser && (
          <div className="mb-6">
            <p className="text-gray-700">
              Usuário Atual: <span className="font-semibold">{currentUser.displayName}</span>
            </p>
            <p className="text-gray-700">
              Função: <span className="font-semibold capitalize">{currentUser.role}</span>
            </p>
          </div>
        )}

        <div className="flex justify-center space-x-4">
          <button
            onClick={handleReturn}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition flex items-center"
          >
            <Home className="mr-2" size={20} /> 
            Voltar para Dashboard
          </button>
          
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition"
          >
            Fazer Logout
          </button>
        </div>
      </div>
    </div>
  )
}
