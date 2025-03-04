import React, { useState } from 'react'
import {
  UserPlus,
  X,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react'
import { userManagementService } from '../../services/UserManagementService'
import { Validation } from '../../utils/validation'
import { UserSchema } from '../../types/firestore-schema'

interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onUserCreated: (user: UserSchema) => void
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onUserCreated
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'employee' as UserSchema['role'],
    password: '' // Added password field
  })
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false) // Added for password visibility toggle

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {}

    // Validar nome
    if (!Validation.isValidName(formData.name)) {
      newErrors.name = 'Nome inválido. Digite nome e sobrenome.'
    }

    // Validar email
    if (!Validation.isValidEmail(formData.email)) {
      newErrors.email = 'Email inválido.'
    }

    // Validar role
    const validRoles: UserSchema['role'][] = ['admin', 'manager', 'employee']
    if (!validRoles.includes(formData.role)) {
      newErrors.role = 'Função inválida.'
    }

    // Validate password
    if (!Validation.isStrongPassword(formData.password)) {
      newErrors.password = 'Senha inválida. A senha deve ter pelo menos 8 caracteres, uma letra maiúscula, uma minúscula, um número e um caractere especial.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)

    if (!validateForm()) return

    setIsLoading(true)

    try {
      const newUser = await userManagementService.createUser({
        name: formData.name,
        email: formData.email,
        role: formData.role,
        status: 'active'
        // coins is handled by the service with a default value of 0
      }, formData.password) // Pass the password

      onUserCreated(newUser)
      onClose()
    } catch (error: any) {
      setServerError(
        error.message ||
        'Erro ao criar usuário. Tente novamente.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Limpar erro específico ao digitar
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = {...prev}
        delete newErrors[name]
        return newErrors
      })
    }
  }

  // Reset form when modal closes
  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      role: 'employee',
      password: ''
    });
    setErrors({});
    setServerError(null);
    onClose();
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold flex items-center">
            <UserPlus className="mr-2 text-blue-600" />
            Criar Novo Usuário
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {serverError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative flex items-center">
              <AlertTriangle className="mr-2" />
              {serverError}
            </div>
          )}

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Nome Completo
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Digite nome e sobrenome"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none 
                ${errors.name
                  ? 'border-red-500 focus:ring-red-500'
                  : 'focus:ring-2 focus:ring-blue-500'
                }`}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="usuario@empresa.com"
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none 
                ${errors.email
                  ? 'border-red-500 focus:ring-red-500'
                  : 'focus:ring-2 focus:ring-blue-500'
                }`}
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Senha"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none pr-10
                  ${errors.password
                    ? 'border-red-500 focus:ring-red-500'
                    : 'focus:ring-2 focus:ring-blue-500'
                  }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              A senha deve ter pelo menos 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais.
            </p>
          </div>

          <div>
            <label
              htmlFor="role"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Função
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none 
                ${errors.role
                  ? 'border-red-500 focus:ring-red-500'
                  : 'focus:ring-2 focus:ring-blue-500'
                }`}
            >
              <option value="employee">Funcionário</option>
              <option value="manager">Gestor</option>
              <option value="admin">Administrador</option>
            </select>
            {errors.role && (
              <p className="text-red-500 text-xs mt-1">{errors.role}</p>
            )}
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2 rounded-lg text-white transition 
                ${isLoading
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Criando...
                </div>
              ) : 'Criar Usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
