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
  Paperclip
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
        
        // Add completedBy IDs from actions
        fetchedTask.actions.forEach(action => {
          if (action.completedBy) {
            userIds.push(action.completedBy)
          }
        })
        
        // Add comment author IDs
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
