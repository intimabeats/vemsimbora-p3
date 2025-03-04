import React, { useState, useEffect } from 'react'
import { Layout } from '../../components/Layout'
import { UserPlus, Users, AlertTriangle, CheckCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export const UserRegistration: React.FC = () => { // Named export
  const [isLoading, setIsLoading] = useState(true); // Add loading state.
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'manager' | 'employee'>('employee')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  const { register } = useAuth()

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500); // Simulate a 0.5-second delay

    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validate inputs
    if (!name.trim()) {
      setError('Nome é obrigatório')
      return
    }

    if (!email.trim()) {
      setError('Email é obrigatório')
      return
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    // Validate inputs
    if (password !== confirmPassword) {
      setError('Senhas não coincidem')
      return
    }

    try {
      await register(name, email, password, role)
      setSuccess(`Usuário ${name} criado com sucesso!`)

      // Reset form
      setName('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setRole('employee')
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate('/admin/user-management')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar usuário')
    }
  }

  return (
    <Layout role="admin" isLoading={isLoading}>
      <div className="container mx-auto p-6">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center">
              <Users className="mr-4 text-blue-600" /> Registro de Usuários
            </h1>
            <button 
              onClick={() => navigate('/admin/user-management')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Voltar
            </button>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-md max-w-xl mx-auto">
            <div className="text-center mb-6">
              <UserPlus className="mx-auto mb-4 text-blue-600" size={48} />
              <h2 className="text-2xl font-bold text-gray-800">Novo Usuário</h2>
              <p className="text-gray-500">Adicionar usuário ao sistema</p>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 flex items-center">
                <AlertTriangle className="mr-2 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4 flex items-center">
                <CheckCircle className="mr-2 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Função
                </label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'admin' | 'manager' | 'employee')}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="employee">Funcionário</option>
                  <option value="manager">Gestor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Senha
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  A senha deve ter pelo menos 6 caracteres.
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar Senha
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center mt-6"
              >
                <UserPlus className="mr-2" size={20} />
                Criar Usuário
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  )
}
