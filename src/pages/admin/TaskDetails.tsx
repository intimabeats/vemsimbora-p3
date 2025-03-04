// src/pages/admin/TaskDetails.tsx
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
  CornerDownRight,
  MessageSquare,
  Send,
  Paperclip,
  Download
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
  const [activeSection, setActiveSection] = useState<'details' | 'actions' | 'comments'>('details')
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState<any[]>([])
  const [currentStep, setCurrentStep] = useState(0)

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
        setComments(fetchedTask.comments || [])

        const fetchedProject = await projectService.getProjectById(fetchedTask.projectId)
        setProject({ name: fetchedProject.name })

        const userIds = [fetchedTask.assignedTo, fetchedTask.createdBy]
        
        fetchedTask.actions.forEach(action => {
          if (action.completedBy) {
            userIds.push(action.completedBy)
          }
        })
        
        if (fetchedTask.comments) {
          fetchedTask.comments.forEach(comment => {
            if (comment.userId) {
              userIds.push(comment.userId)
            }
          })
        }
        
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

        // Move task files to project after approval
        await taskService.moveFilesToProjectAfterApproval(taskId!, updatedTask.projectId)
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

  const handleAddComment = async () => {
    if (!comment.trim() || !taskId || !currentUser) return;
    
    try {
      const newComment = {
        id: Date.now().toString(),
        userId: currentUser.uid,
        text: comment,
        createdAt: Date.now()
      };
      
      const updatedComments = [...comments, newComment];
      setComments(updatedComments);
      setComment('');
      
      await taskService.updateTask(taskId, { comments: updatedComments });
    } catch (error) {
      console.error("Error adding comment:", error);
      setError("Failed to add comment.");
    }
  };

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

  const allActionsCompleted = task.actions?.length > 0 && task.actions.every(action => action.completed)

  const getPriorityColor = (priority: TaskSchema['priority']) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-blue-100 text-blue-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

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
      <div className="container mx-auto p-6">
        {/* Back Button */}
        <div className="flex items-center mb-6">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" /> Voltar
          </button>
        </div>

        {/* Task Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-800 mr-3">{task.title}</h1>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                  <div className="flex items-center">
                    {statusInfo.icon}
                    {statusInfo.label}
                  </div>
                </div>
              </div>
              <p className="text-gray-600 mt-2">{task.description}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {task.status === 'pending' && allActionsCompleted && (
                <button
                  onClick={handleSubmitForApproval}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
                >
                  <CheckCircle size={18} className="mr-2" /> Enviar para Aprovação
                </button>
              )}
              {task.status === 'waiting_approval' && currentUser?.role === 'admin' && (
                <button
                  onClick={handleCompleteTask}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center"
                >
                  <CheckCircle size={18} className="mr-2" /> Aprovar Tarefa
                </button>
              )}
              {task.status === 'waiting_approval' && currentUser?.role === 'admin' && (
                <button
                  onClick={handleRevertToPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center"
                >
                  <XCircle size={18} className="mr-2" /> Rejeitar
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="flex items-center space-x-2">
              <User className="text-blue-500" />
              <div>
                <span className="text-sm text-gray-500">Responsável</span>
                <p className="font-medium">{users[task.assignedTo]?.name || 'Não atribuído'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="text-green-500" />
              <div>
                <span className="text-sm text-gray-500">Data de Início</span>
                <p className="font-medium">{formatDate(task.startDate)}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="text-red-500" />
              <div>
                <span className="text-sm text-gray-500">Data de Vencimento</span>
                <p className="font-medium">{formatDate(task.dueDate)}</p>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500">Progresso da Tarefa</span>
              <span className="text-sm font-medium text-blue-600">
                {progress.toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeSection === 'details'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveSection('details')}
          >
            Detalhes
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeSection === 'actions'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveSection('actions')}
          >
            Ações ({completedActions}/{totalActions})
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeSection === 'comments'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveSection('comments')}
          >
            Comentários ({comments.length})
          </button>
        </div>

        {/* Details Section */}
        {activeSection === 'details' && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-100">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FileText className="mr-2 text-blue-600" /> Detalhes da Tarefa
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Informações Gerais</h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Projeto</p>
                      <p className="font-medium">{project?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Prioridade</p>
                      <p className={`font-medium px-2 py-1 rounded-full text-xs inline-block ${getPriorityColor(task.priority)}`}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Criado por</p>
                      <p className="font-medium">{users[task.createdBy]?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Criado em</p>
                      <p className="font-medium">{formatDate(task.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Recompensa</h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Moedas</p>
                      <p className="font-medium text-amber-600 flex items-center">
                        <Award className="mr-1" size={16} />
                        {task.coinsReward}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Nível de Dificuldade</p>
                      <p className="font-medium">{task.difficultyLevel}/9</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions Section */}
        {activeSection === 'actions' && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-100">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <CheckCircle className="mr-2 text-blue-600" /> Ações da Tarefa
            </h2>
            
            {task.actions.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">Nenhuma ação encontrada</h3>
                <p className="mt-1 text-sm text-gray-500">Esta tarefa não possui ações definidas.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {task.actions.map((action, index) => (
                  <div 
                    key={action.id} 
                    className={`border rounded-lg overflow-hidden transition-all ${
                      action.completed 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-full ${
                            action.completed 
                              ? 'bg-green-100 text-green-600' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {action.completed ? <CheckCircle size={20} /> : <Clock size={20} />}
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{action.title}</h3>
                            <p className="text-sm text-gray-500 mt-1">
                              {action.type === 'document' 
                                ? `Documento com ${action.data?.steps?.length || 0} campos` 
                                : action.description}
                            </p>
                            {action.completed && (
                              <div className="flex items-center mt-2 text-xs text-green-600">
                                <CheckCircle size={14} className="mr-1" />
                                <span>
                                  Concluído em {action.completedAt ? new Date(action.completedAt).toLocaleString() : 'N/A'}
                                  {action.completedBy && ` por ${users[action.completedBy]?.name || 'Usuário'}`}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          {action.completed ? (
                            <>
                              <button
                                onClick={() => handleViewActionDocument(action)}
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                title="Ver Documento"
                              >
                                <Eye size={18} />
                              </button>
                              {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                                <button
                                  onClick={() => handleActionUncomplete(action.id)}
                                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                  title="Marcar como Não Concluído"
                                >
                                  <XCircle size={18} />
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedAction(action);
                                  setIsActionViewOpen(true);
                                }}
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                title="Completar Ação"
                              >
                                <CheckCircle size={18} />
                              </button>
                              {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
                                <button
                                  onClick={() => handleEditAction(action)}
                                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                  title="Editar Ação"
                                >
                                  <Edit size={18} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Display attachments for info type actions */}
                      {action.type === 'info' && action.data?.fileURLs && action.data.fileURLs.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Anexos:</h4>
                          <div className="flex flex-wrap gap-2">
                            {action.data.fileURLs.map((url, idx) => (
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                <Paperclip size={16} className="mr-2 text-gray-600" />
                                <span className="text-sm text-gray-700">Anexo {idx + 1}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Display uploaded files for file_upload type actions */}
                      {action.type === 'file_upload' && action.data?.uploadedFiles && action.data.uploadedFiles.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Arquivos Carregados:</h4>
                          <div className="flex flex-wrap gap-2">
                            {action.data.uploadedFiles.map((file, idx) => (
                              <a
                                key={idx}
                                href={file.url}
                                download={file.name}
                                className="flex items-center px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                <Download size={16} className="mr-2 text-gray-600" />
                                <span className="text-sm text-gray-700">{file.name}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Comments Section */}
        {activeSection === 'comments' && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-100">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <MessageSquare className="mr-2 text-blue-600" /> Comentários
            </h2>
            
            <div className="mb-4">
              <div className="flex space-x-2">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Adicione um comentário..."
                  className="flex-grow px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                />
                <button
                  onClick={handleAddComment}
                  disabled={!comment.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center self-end disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={18} className="mr-2" /> Enviar
                </button>
              </div>
            </div>
            
            {comments.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">Nenhum comentário</h3>
                <p className="mt-1 text-sm text-gray-500">Seja o primeiro a comentar nesta tarefa.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-start space-x-3">
                      <img
                        src={users[comment.userId]?.profileImage || getDefaultProfileImage(users[comment.userId]?.name)}
                        alt={users[comment.userId]?.name || 'Usuário'}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-grow">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium text-gray-900">{users[comment.userId]?.name || 'Usuário'}</h4>
                          <span className="text-xs text-gray-500">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-700 mt-1">{comment.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action View Modal */}
      {selectedAction && (
        <ActionView
          action={selectedAction}
          onComplete={handleActionComplete}
          onCancel={() => {
            setSelectedAction(null);
            setIsActionViewOpen(false);
            setIsEditMode(false);
          }}
          taskId={task.id}
          isOpen={isActionViewOpen}
          isEditMode={isEditMode}
        />
      )}

      {/* Action Document View Modal */}
      {selectedAction && (
        <ActionDocument
          action={selectedAction}
          onClose={() => {
            setSelectedAction(null);
            setIsDocumentViewOpen(false);
          }}
          taskTitle={task.title}
          projectName={project?.name || 'Projeto'}
          userName={selectedAction.completedBy ? users[selectedAction.completedBy]?.name : undefined}
          userPhotoURL={selectedAction.completedBy ? users[selectedAction.completedBy]?.profileImage : undefined}
          isOpen={isDocumentViewOpen}
        />
      )}

      {/* Confetti for task completion */}
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={!fadeOut}
          numberOfPieces={200}
          className={fadeOut ? 'fade-out-confetti' : ''}
        />
      )}
    </Layout>
  )
}
