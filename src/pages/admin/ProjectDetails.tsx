// src/pages/admin/ProjectDetails.tsx
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Layout } from '../../components/Layout'
import {
  BarChart2,
  CheckCircle,
  Clock,
  MessageCircle,
  File,
  Image,
  Video,
  FileText,
  Download,
  ArrowLeft,
  Music,
  Plus,
  Edit,
  Eye,
  Calendar,
  Users as UsersIcon,
  AlertTriangle,
  Zap,
  Star,
  Bookmark,
  Trash2,
  AlertCircle
} from 'lucide-react'
import { projectService } from '../../services/ProjectService'
import { taskService } from '../../services/TaskService'
import { userManagementService } from '../../services/UserManagementService'
import { useAuth } from '../../context/AuthContext'
import { ProjectSchema, TaskSchema } from '../../types/firestore-schema'
import { getDefaultProfileImage } from '../../utils/user'

// FileItem Component
const FileItem: React.FC<{
  attachment: {
    id: string
    name: string
    url: string
    type: 'image' | 'video' | 'document' | 'link' | 'other' | 'audio'
    size?: number
  }
}> = ({ attachment }) => {
  const getAttachmentIcon = () => {
    switch (attachment.type) {
      case 'image':
        return <Image size={48} className="text-blue-500" />;
      case 'video':
        return <Video size={48} className="text-red-500" />;
      case 'document':
        return <FileText size={48} className="text-green-500" />;
      case 'audio':
        return <Music size={48} className="text-purple-500" />;
      default:
        return <File size={48} className="text-gray-500" />;
    }
  };

  return (
    <div className="flex flex-col items-center w-48 p-4 bg-white rounded-lg shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
      {getAttachmentIcon()}
      <a
        href={attachment.url}
        download={attachment.name}
        className="mt-2 text-sm text-gray-700 hover:underline truncate text-center w-full"
        title={attachment.name}
      >
        {attachment.name}
      </a>
      <a
        href={attachment.url}
        download={attachment.name}
        className="mt-2 px-4 py-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-colors flex items-center"
      >
        <Download size={14} className="mr-1" /> Download
      </a>
    </div>
  )
}

export const ProjectDetails: React.FC = () =>
{
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  // State
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [project, setProject] = useState<ProjectSchema | null>(null)
  const [tasks, setTasks] = useState<TaskSchema[]>([])
  const [users, setUsers] = useState<{ [key: string]: { name: string, profileImage?: string } }>({})
  const [attachments, setAttachments] = useState<any[]>([]);
  const [tasksByStatus, setTasksByStatus] = useState<{[key: string]: TaskSchema[]}>({
    pending: [],
    in_progress: [],
    waiting_approval: [],
    completed: []
  });

  // Load project data
  useEffect(() => {
    const loadProjectData = async () => {
      try {
        if (!projectId) {
          throw new Error('Project ID is required')
        }

        setIsLoading(true)
        setError(null)

        const projectData = await projectService.getProjectById(projectId)
        const tasksResponse = await taskService.fetchTasks({ projectId: projectId })
        const usersResponse = await userManagementService.fetchUsers()

        const userMap = usersResponse.data.reduce((acc, user) => {
          acc[user.id] = { name: user.name, profileImage: user.profileImage };
          return acc;
        }, {} as { [key: string]: { name: string; profileImage?: string } })

        const projectMessages = await projectService.getProjectMessages(projectId);
        const extractedAttachments = projectMessages.reduce((acc: any[], message) => {
          if (message.attachments && message.attachments.length > 0) {
            return acc.concat(message.attachments);
          }
          return acc;
        }, []);

        // Group tasks by status
        const grouped = tasksResponse.data.reduce((acc, task) => {
          const status = task.status;
          if (!acc[status]) {
            acc[status] = [];
          }
          acc[status].push(task);
          return acc;
        }, {} as {[key: string]: TaskSchema[]});

        setProject(projectData)
        setTasks(tasksResponse.data)
        setUsers(userMap)
        setAttachments(extractedAttachments);
        setTasksByStatus(grouped);

      } catch (err: any) {
        console.error('Error loading project data:', err)
        setError(err.message || 'Failed to load project details')
      } finally {
        setIsLoading(false)
      }
    }

    loadProjectData()
  }, [projectId])

  // Access control
  const canViewProject = () => {
    if (!currentUser) return false
    if (currentUser.role === 'admin') return true
    if (
      currentUser.role === 'manager' &&
      project?.managers.includes(currentUser.uid)
    ) return true
    return false
  }

  // Calculation methods
  const calculateProjectProgress = () => {
    if (!tasks.length) return 0
    const completedTasks = tasks.filter(task => task.status === 'completed').length
    return Math.round((completedTasks / tasks.length) * 100)
  }

  const getProjectManagerNames = () => {
    if (!project || !project.managers) {
      return 'Sem gestores';
    }
    return project.managers
      .map(managerId => {
        const manager = users[managerId];
        return manager ? manager.name : `Unknown User (${managerId})`;
      })
      .join(', ');
  };

  // Get status icon
  const getStatusIcon = (status: ProjectSchema['status']) => {
    switch (status) {
      case 'planning':
        return <Bookmark className="text-amber-500" />;
      case 'active':
        return <Zap className="text-emerald-500" />;
      case 'completed':
        return <Star className="text-blue-500" />;
      case 'paused':
        return <Clock className="text-slate-500" />;
      case 'cancelled':
        return <AlertCircle className="text-rose-500" />;
      case 'archived':
        return <File className="text-gray-500" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Layout role="admin" isLoading={true}>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout role="admin" isLoading={false}>
        <div className="container mx-auto p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <AlertCircle className="mr-2" />
            {error}
          </div>
        </div>
      </Layout>
    )
  }

  if (!canViewProject()) {
    return (
      <Layout role="admin" isLoading={false}>
        <div className="container mx-auto p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Acesso Negado: </strong>
            <span className="block sm:inline">Você não tem permissão para visualizar este projeto</span>
          </div>
        </div>
      </Layout>
    )
  }

  if (!project) {
    return (
      <Layout role="admin" isLoading={false}>
        <div className="container mx-auto p-6">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Aviso: </strong>
            <span className="block sm:inline">Projeto não encontrado</span>
          </div>
        </div>
      </Layout>
    )
  }

  const StatusBadge: React.FC<{ status: ProjectSchema['status'] }> = ({ status }) => {
    const statusStyles = {
      planning: 'bg-amber-100 text-amber-800 border border-amber-200',
      active: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      completed: 'bg-blue-100 text-blue-800 border border-blue-200',
      paused: 'bg-slate-100 text-slate-800 border border-slate-200',
      cancelled: 'bg-rose-100 text-rose-800 border border-rose-200',
      archived: 'bg-gray-400 text-white border border-gray-500'
    }

    const statusLabels = {
      planning: 'Planejamento',
      active: 'Ativo',
      completed: 'Concluído',
      paused: 'Pausado',
      cancelled: 'Cancelado',
      archived: 'Arquivado'
    }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyles[status]}`}>
        {statusLabels[status]}
      </span>
    )
  }

  const TaskStatusBadge: React.FC<{ status: TaskSchema['status'] }> = ({ status }) => {
    const statusStyles = {
      pending: 'bg-amber-100 text-amber-800 border border-amber-200',
      in_progress: 'bg-blue-100 text-blue-800 border border-blue-200',
      waiting_approval: 'bg-purple-100 text-purple-800 border border-purple-200',
      completed: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      blocked: 'bg-rose-100 text-rose-800 border border-rose-200'
    }

    const statusLabels = {
      pending: 'Pendente',
      in_progress: 'Em Andamento',
      waiting_approval: 'Aguardando Aprovação',
      completed: 'Concluída',
      blocked: 'Bloqueada'
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status]}`}>
        {statusLabels[status]}
      </span>
    )
  }

  return (
    <Layout role="admin" isLoading={false}>
      <div className="container mx-auto p-6">
        {/* Back Button */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigate('/admin/projects')}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="mr-2" /> Voltar para Projetos
          </button>
          <button
            onClick={() => navigate(`/admin/projects/${projectId}/chat`)}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition shadow-sm"
          >
            <MessageCircle className="mr-2" size={20} />
            Chat do Projeto
          </button>
        </div>

        {/* Project Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                {getStatusIcon(project.status)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                <p className="text-gray-600 mt-2">{project.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <StatusBadge status={project.status} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="flex items-center space-x-2">
              <Calendar className="text-blue-500" />
              <div>
                <span className="text-sm text-gray-500">Data de Início</span>
                <p className="font-medium">
                  {new Date(project.startDate).toLocaleDateString()}
                </p>
              </div>
            </div>
            {project.endDate && (
              <div className="flex items-center space-x-2">
                <Calendar className="text-red-500" />
                <div>
                  <span className="text-sm text-gray-500">Data de Término</span>
                  <p className="font-medium">
                    {new Date(project.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
            <div>
              <span className="text-sm text-gray-500 block mb-2">Gestores</span>
              <div className="flex items-center mt-1">
                {project.managers.map((managerId) => {
                  const manager = users[managerId];
                  return (
                    <div key={managerId} className="relative w-8 h-8 rounded-full overflow-hidden mr-2 group">
                      <img
                        src={manager?.profileImage || getDefaultProfileImage(manager?.name || null)}
                        alt={manager?.name || 'Unknown Manager'}
                        className='object-cover w-full h-full'
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity"></div>
                      <span className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs text-center py-0.5 opacity-0 group-hover:opacity-100 transition-opacity truncate">
                        {manager?.name?.split(' ')[0] || 'Unknown'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500">Progresso do Projeto</span>
              <span className="text-sm font-medium text-blue-600">
                {calculateProjectProgress()}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${calculateProjectProgress()}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tasks Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold flex items-center">
              <CheckCircle className="mr-2 text-blue-600" /> Tarefas do Projeto
            </h2>
            {/* Create Task Button - Link to the new page */}
            <Link
              to={`/admin/projects/${projectId}/create-task`}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg flex items-center hover:from-blue-700 hover:to-indigo-700 transition shadow-sm"
            >
              <Plus className="mr-2" /> Criar Tarefa
            </Link>
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
              <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">Nenhuma tarefa encontrada</h3>
              <p className="mt-1 text-sm text-gray-500">Comece criando uma nova tarefa para este projeto.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Pending Tasks */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                  <Clock className="mr-2 text-amber-500" size={18} />
                  Pendentes ({tasksByStatus.pending?.length || 0})
                </h3>
                <div className="space-y-3">
                  {tasksByStatus.pending?.map(task => (
                    <div
                      key={task.id}
                      className="bg-white p-3 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <Link 
                          to={`/tasks/${task.id}`} 
                          className="font-medium text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          {task.title}
                        </Link>
                        <div className="flex space-x-1">
                          <Link
                            to={`/tasks/${task.id}`}
                            className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                            title="Ver Detalhes"
                          >
                            <Eye size={16} />
                          </Link>
                          <Link
                            to={`/admin/projects/${projectId}/edit-task/${task.id}`}
                            className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                            title="Editar Tarefa"
                          >
                            <Edit size={16} />
                          </Link>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 mb-2">{task.description}</p>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                        <div className="flex items-center">
                          <span className="text-amber-600 font-medium mr-1">{task.coinsReward}</span>
                          <span>🪙</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!tasksByStatus.pending || tasksByStatus.pending.length === 0) && (
                    <p className="text-center text-gray-500 text-sm py-2">Nenhuma tarefa pendente</p>
                  )}
                </div>
              </div>

              {/* In Progress Tasks */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                  <BarChart2 className="mr-2 text-blue-500" size={18} />
                  Em Andamento ({tasksByStatus.in_progress?.length || 0})
                </h3>
                <div className="space-y-3">
                  {tasksByStatus.in_progress?.map(task => (
                    <div
                      key={task.id}
                      className="bg-white p-3 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <Link 
                          to={`/tasks/${task.id}`} 
                          className="font-medium text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          {task.title}
                        </Link>
                        <div className="flex space-x-1">
                          <Link
                            to={`/tasks/${task.id}`}
                            className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                            title="Ver Detalhes"
                          >
                            <Eye size={16} />
                          </Link>
                          <Link
                            to={`/admin/projects/${projectId}/edit-task/${task.id}`}
                            className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                            title="Editar Tarefa"
                          >
                            <Edit size={16} />
                          </Link>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 mb-2">{task.description}</p>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                        <div className="flex items-center">
                          <span className="text-amber-600 font-medium mr-1">{task.coinsReward}</span>
                          <span>🪙</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!tasksByStatus.in_progress || tasksByStatus.in_progress.length === 0) && (
                    <p className="text-center text-gray-500 text-sm py-2">Nenhuma tarefa em andamento</p>
                  )}
                </div>
              </div>

              {/* Waiting Approval Tasks */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                  <Clock className="mr-2 text-purple-500" size={18} />
                  Aguardando Aprovação ({tasksByStatus.waiting_approval?.length || 0})
                </h3>
                <div className="space-y-3">
                  {tasksByStatus.waiting_approval?.map(task => (
                    <div
                      key={task.id}
                      className="bg-white p-3 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <Link 
                          to={`/tasks/${task.id}`} 
                          className="font-medium text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          {task.title}
                        </Link>
                        <div className="flex space-x-1">
                          <Link
                            to={`/tasks/${task.id}`}
                            className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                            title="Ver Detalhes"
                          >
                            <Eye size={16} />
                          </Link>
                          <Link
                            to={`/admin/projects/${projectId}/edit-task/${task.id}`}
                            className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                            title="Editar Tarefa"
                          >
                            <Edit size={16} />
                          </Link>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 mb-2">{task.description}</p>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                        <div className="flex items-center">
                          <span className="text-amber-600 font-medium mr-1">{task.coinsReward}</span>
                          <span>🪙</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!tasksByStatus.waiting_approval || tasksByStatus.waiting_approval.length === 0) && (
                    <p className="text-center text-gray-500 text-sm py-2">Nenhuma tarefa aguardando aprovação</p>
                  )}
                </div>
              </div>

              {/* Completed Tasks */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                  <CheckCircle className="mr-2 text-emerald-500" size={18} />
                  Concluídas ({tasksByStatus.completed?.length || 0})
                </h3>
                <div className="space-y-3">
                  {tasksByStatus.completed?.map(task => (
                    <div
                      key={task.id}
                      className="bg-white p-3 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <Link 
                          to={`/tasks/${task.id}`} 
                          className="font-medium text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          {task.title}
                        </Link>
                        <div className="flex space-x-1">
                          <Link
                            to={`/tasks/${task.id}`}
                            className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                            title="Ver Detalhes"
                          >
                            <Eye size={16} />
                          </Link>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 mb-2">{task.description}</p>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500">
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                        <div className="flex items-center">
                          <span className="text-amber-600 font-medium mr-1">{task.coinsReward}</span>
                          <span>🪙</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!tasksByStatus.completed || tasksByStatus.completed.length === 0) && (
                    <p className="text-center text-gray-500 text-sm py-2">Nenhuma tarefa concluída</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Files Section */}
        {attachments.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-100">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <File className="mr-2 text-blue-600" /> Arquivos do Projeto
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {attachments.map((attachment: any, index: number) => (
                <FileItem key={index} attachment={attachment} />
              ))}
            </div>
          </div>
        )}

        {/* Team Members Section */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <UsersIcon className="mr-2 text-blue-600" /> Equipe do Projeto
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {project.managers.map((managerId) => {
              const manager = users[managerId];
              return (
                <div key={managerId} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
                  <img
                    src={manager?.profileImage || getDefaultProfileImage(manager?.name)}
                    alt={manager?.name || 'Unknown Manager'}
                    className="w-10 h-10 rounded-full mr-3 object-cover"
                  />
                  <div>
                    <p className="font-medium text-gray-800">{manager?.name || 'Unknown Manager'}</p>
                    <p className="text-xs text-gray-500">Gestor</p>
                  </div>
                </div>
              );
            })}
            {/* Display team members who are assigned to tasks but aren't managers */}
            {tasks.map(task => task.assignedTo).filter((userId, index, self) => 
              userId && !project.managers.includes(userId) && self.indexOf(userId) === index
            ).map(userId => {
              const user = users[userId];
              return (
                <div key={userId} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
                  <img
                    src={user?.profileImage || getDefaultProfileImage(user?.name)}
                    alt={user?.name || 'Unknown User'}
                    className="w-10 h-10 rounded-full mr-3 object-cover"
                  />
                  <div>
                    <p className="font-medium text-gray-800">{user?.name || 'Unknown User'}</p>
                    <p className="text-xs text-gray-500">Membro</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  )
}
