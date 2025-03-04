import React, { useState, useEffect, useCallback } from 'react'
import { Layout } from '../../components/Layout'
import {
  Plus,
  Edit,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  AlertTriangle,
  RefreshCw,
  Users as UsersIcon
} from 'lucide-react'
import { UserSchema } from '../../types/firestore-schema'
import { userManagementService } from '../../services/UserManagementService'
import { CreateUserModal } from '../../components/modals/CreateUserModal'
import { EditUserModal } from '../../components/modals/EditUserModal'
import { DeleteConfirmationModal } from '../../components/modals/DeleteConfirmationModal'
import useDebounce from '../../utils/useDebounce'
import { getDefaultProfileImage } from '../../utils/user'
import { PageHeader } from '../../components/PageHeader'

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserSchema[]>([])
  const [isLoading, setLoading] = useState(true)
  const [filter, setFilter] = useState<{
    role?: UserSchema['role']
    status?: UserSchema['status']
  }>({})
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 500)
  const [isRetrying, setIsRetrying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 10

  // Modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserSchema | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const fetchedUsers = await userManagementService.fetchUsers({
        role: filter.role,
        status: filter.status,
        limit: itemsPerPage,
        page: currentPage,
        searchTerm: debouncedSearchTerm
      })

      setUsers(fetchedUsers.data)
      setTotalPages(fetchedUsers.totalPages)
    } catch (error: any) {
      console.error('Erro ao buscar usuários:', error)
      setError(error.message || 'Falha ao carregar usuários. Por favor, tente novamente.')
    } finally {
      setLoading(false)
      setIsRetrying(false)
    }
  }, [filter.role, filter.status, currentPage, itemsPerPage, debouncedSearchTerm])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleDeleteUser = async () => {
    if (!selectedUser) return

    try {
      await userManagementService.deleteUser(selectedUser.id)
      setUsers(prevUsers =>
        prevUsers.filter(user => user.id !== selectedUser.id)
      )
      setSelectedUser(null)
      setIsDeleteModalOpen(false)
    } catch (error: any) {
      console.error('Erro ao excluir usuário:', error)
      setError(error.message || 'Falha ao excluir usuário. Por favor, tente novamente.')
    }
  }

  const handleEditUser = (user: UserSchema) => {
    setSelectedUser(user)
    setIsEditModalOpen(true)
  }

  const handleDeleteConfirmation = (user: UserSchema) => {
    setSelectedUser(user)
    setIsDeleteModalOpen(true)
  }

  const handleUserCreated = (newUser: UserSchema) => {
    setUsers(prevUsers => [newUser, ...prevUsers])
  }

  const handleUserUpdated = (updatedUser: UserSchema) => {
    setUsers(prevUsers =>
      prevUsers.map(user =>
        user.id === updatedUser.id ? updatedUser : user
      )
    )
  }

  const handleRetry = () => {
    setIsRetrying(true)
    fetchUsers()
  }

  const RoleBadge: React.FC<{ role: UserSchema['role'] }> = ({ role }) => {
    const roleStyles = {
      admin: 'bg-red-100 text-red-800 border border-red-200',
      manager: 'bg-blue-100 text-blue-800 border border-blue-200',
      employee: 'bg-green-100 text-green-800 border border-green-200'
    }

    const roleLabels = {
      admin: 'Administrador',
      manager: 'Gestor',
      employee: 'Funcionário'
    }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${roleStyles[role]}`}>
        {roleLabels[role]}
      </span>
    )
  }

  const StatusBadge: React.FC<{ status: UserSchema['status'] }> = ({ status }) => {
    const statusStyles = {
      active: 'bg-green-100 text-green-800 border border-green-200',
      inactive: 'bg-gray-100 text-gray-800 border border-gray-200',
      suspended: 'bg-yellow-100 text-yellow-800 border border-yellow-200'
    }

    const statusLabels = {
      active: 'Ativo',
      inactive: 'Inativo',
      suspended: 'Suspenso'
    }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyles[status]}`}>
        {statusLabels[status]}
      </span>
    )
  }

  return (
    <Layout role="admin" isLoading={isLoading}>
      <div className="container mx-auto px-4 sm:px-6 py-6">
        <div className="space-y-4 sm:space-y-6">
          {/* Page Header */}
          <PageHeader
            title="Gerenciamento de Usuários"
            description="Gerencie e acompanhe todos os usuários do sistema"
            icon={UsersIcon}
            actions={
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition shadow-sm w-full sm:w-auto justify-center"
              >
                <Plus className="mr-2" size={18} /> Adicionar Usuário
              </button>
            }
          />

          {/* Error Message with Retry Button */}
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center">
                <AlertTriangle className="mr-2 flex-shrink-0" size={20} />
                <p>{error}</p>
              </div>
              <button 
                onClick={handleRetry} 
                disabled={isRetrying}
                className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="mr-1 animate-spin" size={16} /> Tentando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-1" size={16} /> Tentar novamente
                  </>
                )}
              </button>
            </div>
          )}

          {/* Filters Section */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Input */}
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="text-gray-400" size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Buscar usuários..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                />
              </div>

              {/* Role Filter */}
              <div className="relative w-full sm:w-auto">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="text-gray-400" size={18} />
                </div>
                <select
                  value={filter.role || ''}
                  onChange={(e) =>
                    setFilter({
                      ...filter,
                      role: e.target.value as UserSchema['role'] || undefined
                    })
                  }
                  className="w-full sm:w-auto pl-10 pr-8 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 appearance-none"
                >
                  <option value="">Todos os Cargos</option>
                  <option value="admin">Administradores</option>
                  <option value="manager">Gestores</option>
                  <option value="employee">Funcionários</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="relative w-full sm:w-auto">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="text-gray-400" size={18} />
                </div>
                <select
                  value={filter.status || ''}
                  onChange={(e) =>
                    setFilter({
                      ...filter,
                      status: e.target.value as UserSchema['status'] || undefined
                    })
                  }
                  className="w-full sm:w-auto pl-10 pr-8 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 appearance-none"
                >
                  <option value="">Todos os Status</option>
                  <option value="active">Ativos</option>
                  <option value="inactive">Inativos</option>
                  <option value="suspended">Suspensos</option>
                </select>
              </div>
            </div>
          </div>

          {/* User Cards Grid */}
          {users.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 text-center border border-gray-100">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UsersIcon className="text-gray-400" size={24} />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhum usuário encontrado</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || filter.role || filter.status
                  ? 'Tente ajustar os filtros para encontrar o que está procurando.'
                  : 'Comece adicionando seu primeiro usuário.'}
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition inline-flex items-center"
              >
                <Plus size={18} className="mr-2" /> Adicionar Usuário
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition group"
                >
                  <div className="p-4 sm:p-6 border-b border-gray-100">
                    <div className="flex items-center mb-4">
                      <img
                        src={user.profileImage || getDefaultProfileImage(user.name)}
                        alt={`Foto de ${user.name}`}
                        className="w-12 h-12 rounded-full object-cover mr-4"
                      />
                      <div>
                        <h2 className="text-base sm:text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition">
                          {user.name}
                        </h2>
                        <p className="text-gray-600 text-sm">{user.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <RoleBadge role={user.role} />
                      <StatusBadge status={user.status} />
                    </div>
                  </div>
                  
                  <div className="px-4 sm:px-6 py-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Criado em: {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                          title="Editar"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteConfirmation(user)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {users.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <span className="text-sm text-gray-600 order-2 sm:order-1">
                Página {currentPage} de {totalPages}
              </span>
              <div className="flex space-x-2 w-full sm:w-auto justify-between sm:justify-start order-1 sm:order-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center hover:bg-gray-50 transition"
                >
                  <ChevronLeft className="mr-2" size={16} /> Anterior
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center hover:bg-gray-50 transition"
                >
                  Próximo <ChevronRight className="ml-2" size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Modals */}
          <CreateUserModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onUserCreated={handleUserCreated}
          />

          {selectedUser && (
            <>
              <EditUserModal
                user={selectedUser}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onUserUpdated={handleUserUpdated}
              />

              <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteUser}
                itemName={selectedUser.name}
                warningMessage="A exclusão de um usuário removerá permanentemente todas as suas informações do sistema."
              />
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default UserManagement
