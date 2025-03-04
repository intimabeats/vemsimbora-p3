// src/pages/admin/TaskManagement.tsx
import React, { useState, useEffect, useCallback } from 'react'
import { Layout } from '../../components/Layout'
import {
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  AlertTriangle,
  RefreshCw,
  ListChecks
} from 'lucide-react'
import { taskService } from '../../services/TaskService'
import { projectService } from '../../services/ProjectService'
import { userManagementService } from '../../services/UserManagementService'
import { TaskSchema } from '../../types/firestore-schema'
import { DeleteConfirmationModal } from '../../components/modals/DeleteConfirmationModal'
import { Link, useNavigate } from 'react-router-dom'
import useDebounce from '../../utils/useDebounce';
import { PageHeader } from '../../components/PageHeader'

export const TaskManagement: React.FC = () => {
  // States
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tasks, setTasks] = useState<TaskSchema[]>([])
  const [projects, setProjects] = useState<{ id: string, name: string }[]>([])
  const [users, setUsers] = useState<{ [key: string]: string }>({})
  const [isRetrying, setIsRetrying] = useState(false)

  // Modal states
  const [selectedTask, setSelectedTask] = useState<TaskSchema | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  // Filter and pagination states
  const [projectFilter, setProjectFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const ITEMS_PER_PAGE = 9

  // useCallback to prevent unnecessary re-renders of fetchProjects
  const fetchProjects = useCallback(async () => {
    try {
      const fetchedProjects = await projectService.fetchProjects({excludeStatus: 'archived'});
      setProjects(fetchedProjects.data.map(p => ({ id: p.id, name: p.name})));
    } catch (error) {
      console.error('Erro ao buscar projetos:', error);
      setError('Erro ao buscar projetos.');
    }
  }, []);

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects]);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch users and tasks
      const [usersResponse, tasksResponse] = await Promise.all([
        userManagementService.fetchUsers(),
        taskService.fetchTasks({
          projectId: projectFilter || undefined,
          status: statusFilter as TaskSchema['status'] || undefined,
          limit: ITEMS_PER_PAGE,
          page: currentPage
        })
      ])

      // Map users
      const userMap = usersResponse.data.reduce((acc, user) => {
        acc[user.id] = user.name
        return acc
      }, {} as { [key: string]: string })
      setUsers(userMap)

      // Set tasks and total pages
      setTasks(tasksResponse.data)
      setTotalPages(tasksResponse.totalPages)
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err)
      setError(err.message || 'Falha ao carregar dados')
    } finally {
      setIsLoading(false)
      setIsRetrying(false)
    }
  }, [projectFilter, statusFilter, currentPage, ITEMS_PER_PAGE]);

  useEffect(() => {
    loadData()
  }, [loadData, debouncedSearchTerm]);

  // Filter tasks
  const filteredTasks = tasks.filter(task =>
    (searchTerm === '' ||
      task.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
  );

  // Task Status Badge Component
  const StatusBadgeTask: React.FC<{ status: TaskSchema['status'] }> = ({ status }) => {
    const statusStyles = {
      pending: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      in_progress: 'bg-blue-100 text-blue-800 border border-blue-200',
      waiting_approval: 'bg-purple-100 text-purple-800 border border-purple-200',
      completed: 'bg-green-100 text-green-800 border border-green-200',
      blocked: 'bg-red-100 text-red-800 border border-red-200'
    }

    const statusLabels = {
      pending: 'Pendente',
      in_progress: 'Em Andamento',
      waiting_approval: 'Aguardando Aprovação',
      completed: 'Concluída',
      blocked: 'Bloqueada'
    }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyles[status]}`}>
        {statusLabels[status]}
      </span>
    )
  }

  const handleDeleteTask = async () => {
    if (!selectedTask) return

    try {
      await taskService.deleteTask(selectedTask.id)
      setTasks(prev => prev.filter(task => task.id !== selectedTask.id))
      setIsDeleteModalOpen(false)
      setSelectedTask(null)
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir tarefa')
    }
  }

  const handleRetry = () => {
    setIsRetrying(true);
    loadData();
  };

  // Helper function to get task progress percentage based on status
  const getTaskProgress = (status: TaskSchema['status']): number => {
    switch (status) {
      case 'completed': return 100;
      case 'waiting_approval': return 75;
      case 'in_progress': return 50;
      case 'pending': return 25;
      case 'blocked': return 10;
      default: return 0;
    }
  };

  return (
    <Layout role="admin" isLoading={isLoading}>
      <div className="container mx-auto px-4 sm:px-6 py-6">
        <div className="space-y-4 sm:space-y-6">
          {/* Page Header */}
          <PageHeader
            title="Gerenciamento de Tarefas"
            description="Gerencie e acompanhe todas as tarefas do sistema"
            icon={ListChecks}
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
                  placeholder="Buscar tarefas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                />
              </div>

              {/* Project Filter */}
              <div className="relative w-full sm:w-auto">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="text-gray-400" size={18} />
                </div>
                <select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className="w-full sm:w-auto pl-10 pr-8 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 appearance-none"
                >
                  <option value="">Todos os Projetos</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="relative w-full sm:w-auto">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="text-gray-400" size={18} />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full sm:w-auto pl-10 pr-8 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 appearance-none"
                >
                  <option value="">Todos os Status</option>
                  <option value="pending">Pendente</option>
                  <option value="in_progress">Em Andamento</option>
                  <option value="waiting_approval">Aguardando Aprovação</option>
                  <option value="completed">Concluída</option>
                  <option value="blocked">Bloqueada</option>
                </select>
              </div>
            </div>
          </div>

          {/* Task Cards Grid */}
          {filteredTasks.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 text-center border border-gray-100">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-gray-400" size={24} />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhuma tarefa encontrada</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || projectFilter || statusFilter
                  ? 'Tente ajustar os filtros para encontrar o que está procurando.'
                  : 'Não há tarefas disponíveis no momento.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredTasks.map((task) => {
                const project = projects.find(p => p.id === task.projectId);
                const assignedUserName = users[task.assignedTo] || 'N/A';
                const progress = getTaskProgress(task.status);
                
                return (
                  <div 
                    key={task.id} 
                    className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition group"
                  >
                    {/* Task Header */}
                    <div className="p-4 sm:p-6 border-b border-gray-100">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                        <h2 className="text-base sm:text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition line-clamp-1">
                          <Link to={`/tasks/${task.id}`}>{task.title}</Link>
                        </h2>
                        <StatusBadgeTask status={task.status} />
                      </div>
                      <p className="text-gray-600 mb-4 line-clamp-2 text-sm">{task.description}</p>
                      
                      {/* Progress Bar with Gradient - Updated to match project style */}
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 to-indigo-600"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500 flex items-center">
                          {progress}% Completo
                        </span>
                        <span className="text-xs text-yellow-600 font-medium flex items-center">
                          {task.coinsReward} 🪙
                        </span>
                      </div>
                    </div>
                    
                    {/* Task Details */}
                    <div className="px-4 sm:px-6 py-4 bg-gray-50">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3">
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock size={16} className="mr-2 text-gray-500" />
                          <span>
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Users size={16} className="mr-2 text-gray-500" />
                          <span className="truncate max-w-[100px]">{assignedUserName}</span>
                        </div>
                      </div>
                      
                      {/* Project Name */}
                      <div className="mb-3 text-sm text-gray-600">
                        Projeto: {project ? project.name : 'N/A'}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex justify-end space-x-2 mt-2">
                        <Link
                          to={`/admin/projects/${task.projectId}/edit-task/${task.id}`}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                          title="Editar"
                        >
                          <Edit size={18} />
                        </Link>
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {filteredTasks.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <span className="text-sm text-gray-600 order-2 sm:order-1">
                Página {currentPage} de {totalPages}
              </span>
              <div className="flex space-x-2 w-full sm:w-auto justify-between sm:justify-start order-1 sm:order-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center hover:bg-gray-50 transition"
                >
                  <ChevronLeft className="mr-2" size={16} /> Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center hover:bg-gray-50 transition"
                >
                  Próximo <ChevronRight className="ml-2" size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          <DeleteConfirmationModal
            isOpen={isDeleteModalOpen}
            onClose={() => {
              setIsDeleteModalOpen(false)
              setSelectedTask(null)
            }}
            onConfirm={handleDeleteTask}
            itemName={selectedTask ? selectedTask.title : ''}
            warningMessage="A exclusão de uma tarefa removerá permanentemente todas as suas informações do sistema."
          />
        </div>
      </div>
    </Layout>
  )
}

export default TaskManagement
