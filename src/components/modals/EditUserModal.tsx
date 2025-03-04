// src/components/modals/EditUserModal.tsx
import React, { useState, useEffect, useRef } from 'react'
import {
  UserCog,
  X,
  CheckCircle,
  AlertTriangle,
  Camera
} from 'lucide-react'
import { userManagementService } from '../../services/UserManagementService'
import { Validation } from '../../utils/validation'
import { UserSchema } from '../../types/firestore-schema'

interface EditUserModalProps {
  user: UserSchema
  isOpen: boolean
  onClose: () => void
  onUserUpdated: (updatedUser: UserSchema) => void
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  user,
  isOpen,
  onClose,
  onUserUpdated
}) => {
  const [formData, setFormData] = useState<Partial<UserSchema>>({
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // State for selected file
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input

  // Resetar estado quando o usuário mudar ou o modal fechar
  useEffect(() => {
      if(isOpen){
        setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
        });
    }
    setErrors({})
    setServerError(null)
    setSelectedFile(null); // Reset file selection
  }, [user, isOpen])

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!Validation.isValidName(formData.name || '')) {
      newErrors.name = 'Nome inválido. Digite nome e sobrenome.'
    }

    if (!Validation.isValidEmail(formData.email || '')) {
      newErrors.email = 'Email inválido.'
    }

    const validRoles: UserSchema['role'][] = ['admin', 'manager', 'employee']
    if (!formData.role || !validRoles.includes(formData.role)) {
      newErrors.role = 'Função inválida.'
    }

    const validStatuses: UserSchema['status'][] = ['active', 'inactive', 'suspended']
    if (!formData.status || !validStatuses.includes(formData.status)) {
      newErrors.status = 'Status inválido.'
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
      const updateData: Partial<UserSchema> = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        status: formData.status
      }

      Object.keys(updateData).forEach(key => {
        if (updateData[key] === user[key]) {
          delete updateData[key]
        }
      })

      // Pass the selectedFile to updateUser, but ensure it's undefined (not null) when no file is selected
      const updatedUser = await userManagementService.updateUser(user.id, updateData, selectedFile || undefined);
      onUserUpdated(updatedUser);
      onClose()
    } catch (error: any) {
      setServerError(
        error.message ||
        'Erro ao atualizar usuário. Tente novamente.'
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

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setSelectedFile(event.target.files[0]);
        }
    };

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold flex items-center">
            <UserCog className="mr-2 text-blue-600" />
            Editar Usuário
          </h2>
          <button
            onClick={onClose}
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
              value={formData.name || ''}
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
              value={formData.email || ''}
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
              htmlFor="role"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Função
            </label>
            <select
              id="role"
              name="role"
              value={formData.role || ''}
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

          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status || ''}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none
                ${errors.status
                  ? 'border-red-500 focus:ring-red-500'
                  : 'focus:ring-2 focus:ring-blue-500'
                }`}
            >
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="suspended">Suspenso</option>
            </select>
            {errors.status && (
              <p className="text-red-500 text-xs mt-1">{errors.status}</p>
            )}
          </div>

            {/* File Input */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                Foto de Perfil
                </label>
                <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="hidden"
                />
                <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                <Camera className="mr-2" />
                {selectedFile ? selectedFile.name : 'Selecionar Imagem'}
                </button>
            </div>

          <div className="pt-4 flex space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2 rounded-lg text-white transition
                ${isLoading
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              {isLoading ? 'Atualizando...' : 'Atualizar Usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
