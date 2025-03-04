// src/pages/auth/ForgotPassword.tsx
import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Lock, Send, AlertCircle, Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { Layout } from '../../components/Layout'

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const { resetPassword } = useAuth()
  const navigate = useNavigate()

  // Trigger animation on mount
  useEffect(() => {
    setIsAnimating(true)
  }, [])

  // Countdown timer for redirect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0 && success) {
      navigate('/login')
    }
  }, [countdown, success, navigate])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      await resetPassword(email)
      setSuccess('Link de redefinição de senha enviado. Verifique seu email.')
      setCountdown(5) // Start 5 second countdown for redirect
    } catch (err: any) {
      setError(getErrorMessage(err.code))
    } finally {
      setIsLoading(false)
    }
  }

  // More specific error messages
  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'Nenhum usuário encontrado com este email.'
      case 'auth/invalid-email':
        return 'O email fornecido é inválido.'
      case 'auth/missing-email':
        return 'Por favor, insira um endereço de email.'
      case 'auth/too-many-requests':
        return 'Muitas tentativas. Tente novamente mais tarde.'
      default:
        console.error("Unhandled Firebase error code:", errorCode)
        return 'Erro ao redefinir senha. Tente novamente. Se o problema persistir, entre em contato com o suporte.'
    }
  }

  return (
    <Layout hideNavigation={true} isLoading={false}>
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-12">
        <div 
          className={`w-full max-w-md transition-all duration-700 transform ${isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
        >
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg mb-4">
              <Lock className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-1">Redefinir Senha</h1>
            <p className="text-gray-600">Vem Simbora - Gestão de Tarefas</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Card Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 text-white">
              <h2 className="text-xl font-semibold text-center">Recuperação de Conta</h2>
            </div>

            {/* Success Message */}
            {success && (
              <div className="mx-4 mt-4 bg-green-50 border-l-4 border-green-500 p-4 flex items-start">
                <CheckCircle className="text-green-500 mr-3 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-green-700 text-sm">{success}</p>
                  {countdown > 0 && (
                    <p className="text-green-600 text-xs mt-1">
                      Redirecionando para o login em {countdown} segundos...
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mx-4 mt-4 bg-red-50 border-l-4 border-red-500 p-4 flex items-start">
                <AlertCircle className="text-red-500 mr-3 flex-shrink-0 mt-0.5" size={18} />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Reset Password Form */}
            <form onSubmit={handleResetPassword} className="p-6 space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Digite seu email"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required
                    autoComplete="email"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Enviaremos um link para redefinir sua senha.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading || !!success}
                className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enviando...
                  </div>
                ) : (
                  <>
                    <Send className="mr-2" size={20} /> Enviar Link de Recuperação
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <Link 
                to="/login" 
                className="flex items-center justify-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                <ArrowLeft size={16} className="mr-1" /> Voltar para Login
              </Link>
            </div>
          </div>

          {/* Version */}
          <div className="text-center mt-6">
            <p className="text-xs text-gray-500">Vem Simbora v1.0.0 © 2023</p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
