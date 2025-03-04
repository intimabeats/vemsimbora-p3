import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Layout } from '../../components/Layout'
import { taskService } from '../../services/TaskService'
import { projectService } from '../../services/ProjectService'
import { userManagementService } from '../../services/UserManagementService'
import { TaskSchema, TaskAction } from '../../types/firestore-schema'
import { ActionView } from '../../components/ActionView'
import { ActionDocument } from '../../components/ActionDocument'
import Confetti from 'react-confetti'
import {
  CheckCircle,
  XCircle,
  Clock,
  File,
  User,
  Calendar,
  Check,
  X,
  FileText,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  MoreVertical,
  CornerUpLeft,
  Info,
  Edit,
  Eye,
  Award,
  BarChart2,
  Briefcase,
  Tag,
  CornerDownRight
} from 'lucide-react'
import { pulseKeyframes } from '../../utils/animation'
import { getDefaultProfileImage } from '../../utils/user'
import { AttachmentDisplay } from '../../components/AttachmentDisplay'
import { useAuth } from '../../context/AuthContext'

export const TaskDetails: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const [task, setTask] = useState<TaskSchema | null>(null)
  const [project, setProject] = useState<{ name: string } | null>(null)
  const [users, setUsers] = useState<{ [key: string]: { name: string, profileImage?: string } }>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAction, setSelectedAction] = useState<TaskAction | null>(null)
  const [statusChanged, setStatusChanged] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [fadeOut, setFadeOut] = useState(false)
  const { currentUser } = useAuth()
  const [isActionViewOpen, setIsActionViewOpen] = useState(false)
  const [isDocumentViewOpen, setIsDocumentViewOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  useEffect(() => {
    const loadTask = async () => {
      setIsLoading(true)
      setError(null)
      try {
        if (!taskId) {
          throw new Error('O ID da tarefa é obrigatório.')
        }
        const fetchedTask = await taskService.getTaskById(taskId)
        setTask(fetchedTask)

        const fetchedProject = await projectService.getProjectById(fetchedTask.projectId)
        setProject({ name: fetchedProject.name })

        const userIds = [fetchedTask.assignedTo, fetchedTask.createdBy]
        
        // Add completedBy IDs from actions
        fetchedTask.actions.forEach(action => {
          if (action.completedBy) {
            userIds.push(action.completedBy)
          }
        })
        
        const uniqueUserIds = Array.from(new Set(userIds)).filter(Boolean)

        const usersData = await userManagementService.fetchUsers({ userIds: uniqueUserIds })
        const userMap = usersData.data.reduce((acc, user) => {
          acc[user.id] = { name: user.name, profileImage: user.profileImage }
          return acc
        }, {} as { [key: string]: { name: string; profileImage?: string } })
        setUsers(userMap)

      } catch (err: any) {
        setError(err.message || 'Falha ao carregar a tarefa.')
      } finally {
        setIsLoading(false)
      }
    }

    loadTask()
  }, [taskId])

  const handleActionComplete = async (actionId: string, data?: any) => {
    try {
      await taskService.completeTaskAction(taskId!, actionId, data)
      const updatedTask = await taskService.getTaskById(taskId!)
      setTask({ ...updatedTask })
      setSelectedAction(null)
      setIsActionViewOpen(false)
      setIsEditMode(false)
    } catch (error) {
      console.error('Error completing action:', error)
    }
  }

  const handleActionUncomplete = async (actionId: string) => {
    try {
      await taskService.uncompleteTaskAction(taskId!, actionId)
      const updatedTask = await taskService.getTaskById(taskId!)
      setTask({ ...updatedTask })
    } catch (error) {
      console.error('Error uncompleting action:', error)
    }
  }

  const handleSubmitForApproval = async () => {
    try {
      const updatedTask = await taskService.updateTask(taskId!, { status: 'waiting_approval' })
      setTask(updatedTask)
      if (updatedTask) {
        await projectService.addSystemMessageToProjectChat(
          updatedTask.projectId,
          {
            userId: 'system',
            userName: 'Sistema',
            content: `A tarefa "${updatedTask.title}" foi enviada para aprovação por ${users[updatedTask.assignedTo]?.name || 'Usuário Desconhecido'}.`,
            timestamp: Date.now(),
            messageType: 'task_submission',
            quotedMessage: {
              userName: 'Sistema',
              content: `Tarefa: ${updatedTask.title} - [Ver Tarefa](/tasks/${updatedTask.id})`,
            },
          }
        )
      }
    } catch (error) {
      console.error("Error submitting for approval:", error)
      setError("Failed to submit the task for approval.")
    }
  }

  const handleCompleteTask = async () => {
    try {
      const updatedTask = await taskService.updateTask(taskId!, { status: 'completed' })
      setTask(updatedTask)
      setStatusChanged(true)
      setShowConfetti(true)
      setTimeout(() => {
        setStatusChanged(false)
        setFadeOut(true)
        setTimeout(() => setShowConfetti(false), 1000)
      }, 4000)

      if (updatedTask) {
        const projectMessages = await projectService.getProjectMessages(updatedTask.projectId)
        const submissionMessage: any = projectMessages.find(
          (msg: any) => msg.messageType === 'task_submission' && msg.quotedMessage?.content.includes(`/tasks/${updatedTask.id}`)
        )

        if (submissionMessage) {
          const submittedAt = new Date(submissionMessage.timestamp).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
          const approvedAt = new Date().toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })

          const updatedContent = `A tarefa "${updatedTask.title}" foi enviada para aprovação por ${users[updatedTask.assignedTo]?.name || 'Usuário Desconhecido'} no dia ${submittedAt}, e aprovada por ${currentUser?.displayName || 'Administrador'} no dia ${approvedAt}.`

          await projectService.addSystemMessageToProjectChat(
            updatedTask.projectId,
            {
              userId: 'system',
              userName: 'Sistema',
              content: updatedContent,
              timestamp: Date.now(),
              messageType: 'task_approval',
              originalMessageId: submissionMessage.id,
              quotedMessage: {
                userName: 'Sistema',
                content: `Tarefa: ${updatedTask.title} - [Ver Tarefa](/tasks/${updatedTask.id})`,
              },
            }
          )
        } else {
          console.warn("Could not find original submission message to update.")
        }
      }
    } catch (error) {
      console.error("Error completing task:", error)
      setError("Failed to complete the task.")
    }
  }

  const handleRevertToPending = async () => {
    try {
      await taskService.updateTask(taskId!, { status: 'pending' })
      const updatedTask = await taskService.getTaskById(taskId!)
      setTask(updatedTask)
    } catch (error) {
      console.error("Error reverting task to pending:", error)
      setError("Failed to revert task to pending.")
    }
  }

  const handleEditAction = (action: TaskAction) => {
    setSelectedAction(action)
    setIsEditMode(true)
    setIsActionViewOpen(true)
    setIsDocumentViewOpen(false)
  }

  const handleViewActionDocument = (action: TaskAction) => {
    setSelectedAction(action)
    setIsDocumentViewOpen(true)
    setIsActionViewOpen(false)
  }

  if (isLoading) {
    return (
      <Layout role={currentUser?.role || 'employee'} isLoading={true}>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout role={currentUser?.role || 'employee'}>
        <div className="p-4 bg-red-100 text-red-700 border border-red-400 rounded flex items-center">
          <AlertTriangle className="mr-2" size={20} />
          {error}
        </div>
      </Layout>
    )
  }

  if (!task) {
    return (
      <Layout role={currentUser?.role || 'employee'}>
        <div className="p-4 bg-yellow-100 text-yellow-700 border border-yellow-400 rounded flex items-center">
          <AlertTriangle className="mr-2" size={20} />
          Tarefa não encontrada.
        </div>
      </Layout>
    )
  }

  const completedActions = task.actions?.filter(action => action.completed).length ?? 0
  const totalActions = task.actions?.length ?? 0
  const progress = totalActions > 0 ? (completedActions / totalActions) * 100 : 0

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('pt-BR')
  }

  // Calculate allActionsCompleted
  const allActionsCompleted = task.actions?.length > 0 && task.actions.every(action => action.completed)

  // Get priority color
  const getPriorityColor = (priority: TaskSchema['priority']) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-blue-100 text-blue-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Get status color and label
  const getStatusInfo = (status: TaskSchema['status']) => {
    switch (status) {
      case 'pending':
        return { color: 'bg-yellow-100 text-yellow-800', label: 'Pendente', icon: <Clock size={16} className="mr-1" /> }
      case 'in_progress':
        return { color: 'bg-blue-100 text-blue-800', label: 'Em Andamento', icon: <BarChart2 size={16} className="mr-1" /> }
      case 'waiting_approval':
        return { color: 'bg-purple-100 text-purple-800', label: 'Aguardando Aprovação', icon: <CheckCircle size={16} className="mr-1" /> }
      case 'completed':
        return { color: 'bg-green-100 text-green-800', label: 'Concluída', icon: <Check size={16} className="mr-1" /> }
      case 'blocked':
        return { color: 'bg-red-100 text-red-800', label: 'Bloqueada', icon: <X size={16} className="mr-1" /> }
      default:
        return { color: 'bg-gray-100 text-gray-800', label: 'Desconhecido', icon: <Info size={16} className="mr-1" /> }
    }
  }

  const statusInfo = getStatusInfo(task.status)

  return (
    <Layout role={currentUser?.role || 'employee'}>
      <style>{pulseKeyframes}</style>
      <div className="container mx-auto p-6">
        {showConfetti && <Confetti onConfettiComplete={() => setFadeOut(false)} className={fadeOut ? 'fade-out-confetti' : ''} />}
        
        {/* Task Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <button onClick={() => navigate(-1)} className="text-gray-600 hover:text-blue-600 p-2 -ml-2 rounded-full hover:bg-blue-50 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${statusInfo.color} ${statusChanged ? 'animate-pulse' : ''}`}
            >
              {statusInfo.icon}
              {statusInfo.label}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">{task.title}</h1>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${getPriorityColor(task.priority)}`}>
              <Tag size={14} className="mr-1" />
              Prioridade: {task.priority === 'low' ? 'Baixa' : task.priority === 'medium' ? 'Média' : task.priority === 'high' ? 'Alta' : 'Crítica'}
            </span>
            
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 flex items-center">
              <Award size={14} className="mr-1" />
              {task.coinsReward} moedas
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="flex items-center">
              <Calendar size={18} className="text-gray-500 mr-2" />
              <div>
                <p className="text-xs text-gray-500">Data de Vencimento</p>
                <p className="text-sm font-medium">{formatDate(task.dueDate)}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <User size={18} className="text-gray-500 mr-2" />
              <div>
                <p className="text-xs text-gray-500">Responsável</p>
                <div className="flex items-center">
                  <img
                    src={users[task.assignedTo]?.profileImage || getDefaultProfileImage(users[task.assignedTo]?.name || null)}
                    alt={users[task.assignedTo]?.name || 'Usuário Desconhecido'}
                    className="w-5 h-5 rounded-full mr-1 object-cover"
                  />
                  <p className="text-sm font-medium">{users[task.assignedTo]?.name || 'Usuário Desconhecido'}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center">
              <Briefcase size={18} className="text-gray-500 mr-2" />
              <div>
                <p className="text-xs text-gray-500">Projeto</p>
                <p className="text-sm font-medium">
                  <Link to={`/admin/projects/${task.projectId}`} className="text-blue-600 hover:underline">
                    {project?.name || 'Projeto Desconhecido'}
                  </Link>
                </p>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-gray-700">Progresso</span>
              <span className="text-sm text-gray-600">{completedActions} de {totalActions} ações</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="mt-4 border-t pt-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Descrição</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
          </div>
        </div>

        {/* Actions Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <CheckCircle className="mr-2 text-blue-600" />
            Ações
          </h2>
          
          <div className="space-y-4">
            {task.actions?.map((action) => (
              <div 
                key={action.id} 
                className={`border rounded-lg p-4 transition-all ${
                  action.completed 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full ${action.completed ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                      {action.completed ? <Check size={18} /> : <Clock size={18} />}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{action.title}</h3>
                      {action.completed && action.completedAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Concluído em {new Date(action.completedAt).toLocaleString('pt-BR')} por {
                            action.completedBy ? users[action.completedBy]?.name || 'Usuário' : 'Usuário'
                          }
                        </p>
                      )}
                      {action.type === 'info' && (
                        <div className="mt-2 text-sm text-gray-600">
                          <p className="font-medium">{action.infoTitle}</p>
                          <p className="line-clamp-2">{action.infoDescription}</p>
                          {action.hasAttachments && action.data?.fileURLs?.length > 0 && (
                            <p className="text-xs text-blue-600 mt-1">{action.data.fileURLs.length} arquivo(s) anexado(s)</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    {task.status !== 'waiting_approval' && task.status !== 'completed' && (
                      <>
                        {action.completed ? (
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleViewActionDocument(action)}
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition flex items-center"
                              title="Visualizar"
                            >
                              <Eye size={16} className="mr-1" />
                              <span className="text-xs">Visualizar</span>
                            </button>
                            <button
                              onClick={() => handleEditAction(action)}
                              className="px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition flex items-center"
                              title="Editar"
                            >
                              <Edit size={16} className="mr-1" />
                              <span className="text-xs">Editar</span>
                            </button>
                            <button
                              onClick={() => handleActionUncomplete(action.id)}
                              className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition flex items-center"
                              title="Desfazer"
                            >
                              <CornerUpLeft size={16} className="mr-1" />
                              <span className="text-xs">Desfazer</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedAction(action)
                              setIsActionViewOpen(true)
                              setIsEditMode(false)
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center"
                          >
                            <CornerDownRight size={16} className="mr-1" />
                            <span className="text-sm">Completar</span>
                          </button>
                        )}
                      </>
                    )}
                    
                    {(task.status === 'waiting_approval' || task.status === 'completed') && action.completed && (
                      <button
                        onClick={() => handleViewActionDocument(action)}
                        className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition flex items-center"
                        title="Visualizar"
                      >
                        <Eye size={16} className="mr-1" />
                        <span className="text-xs">Visualizar</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {task.actions?.length === 0 && (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                <p className="text-gray-500">Nenhuma ação definida para esta tarefa.</p>
              </div>
            )}
          </div>
        </div>

        {/* Attachments Section */}
        {task.attachments && task.attachments.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <File className="mr-2 text-blue-600" />
              Anexos
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {task.attachments.map((attachmentUrl, index) => (
                <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <AttachmentDisplay
                    attachment={{
                      id: index.toString(),
                      name: attachmentUrl.substring(attachmentUrl.lastIndexOf('/') + 1),
                      url: attachmentUrl,
                      type: 'other',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="bg-white rounded-xl shadow-md p-6">
          {allActionsCompleted && task.status !== 'waiting_approval' && task.status !== 'completed' && (
            <button
              onClick={handleSubmitForApproval}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center"
            >
              <CheckCircle className="mr-2" />
              Enviar para Aprovação
            </button>
          )}

          {currentUser?.role === 'admin' && task.status === 'waiting_approval' && (
            <div className="space-y-3">
              <button
                onClick={handleCompleteTask}
                className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center"
              >
                <CheckCircle className="mr-2" />
                Aprovar Tarefa ({task.coinsReward} Moedas)
              </button>
              <button
                onClick={handleRevertToPending}
                className="w-full py-3 px-4 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition flex items-center justify-center"
              >
                <CornerUpLeft className="mr-2" />
                Voltar para Pendente
              </button>
            </div>
          )}
        </div>

        {/* Action View Modal */}
        {selectedAction && (
          <ActionView
            action={selectedAction}
            onComplete={handleActionComplete}
            onCancel={() => {
              setSelectedAction(null)
              setIsActionViewOpen(false)
              setIsEditMode(false)
            }}
            taskId={taskId!}
            isOpen={isActionViewOpen}
            isEditMode={isEditMode}
          />
        )}

        {/* Action Document Modal */}
        {selectedAction && (
          <ActionDocument
            action={selectedAction}
            onClose={() => {
              setSelectedAction(null)
              setIsDocumentViewOpen(false)
            }}
            taskTitle={task.title}
            projectName={project?.name || 'Projeto Desconhecido'}
            userName={selectedAction.completedBy ? users[selectedAction.completedBy]?.name : undefined}
            userPhotoURL={selectedAction.completedBy ? users[selectedAction.completedBy]?.profileImage : undefined}
            isOpen={isDocumentViewOpen}
          />
        )}
      </div>
    </Layout>
  )
}
