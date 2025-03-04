// src/services/TaskService.ts
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  QueryConstraint
} from 'firebase/firestore'
import { auth, storage } from '../config/firebase'
import { TaskSchema, ProjectSchema, TaskAction } from '../types/firestore-schema'
import { systemSettingsService } from './SystemSettingsService'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { notificationService } from './NotificationService'
import { projectService } from './ProjectService'
import { userManagementService } from './UserManagementService'
import { activityService } from './ActivityService'
import { actionTemplateService } from './ActionTemplateService'

export class TaskService {
  private db = getFirestore()

  // Criar nova tarefa
  async createTask(
    taskData: Omit<TaskSchema, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<TaskSchema> {
    try {
      const taskRef = doc(collection(this.db, 'tasks'))
      const settings = await systemSettingsService.getSettings()

      // Calcular recompensa baseada na dificuldade
      const coinsReward = Math.round(
        taskData.difficultyLevel * 
        settings.taskCompletionBase * 
        settings.complexityMultiplier
      )

      const newTask: TaskSchema = {
        id: taskRef.id,
        ...taskData,
        createdBy: auth.currentUser?.uid || '',
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        coinsReward,
        subtasks: taskData.subtasks || [],
        comments: taskData.comments || [],
        attachments: taskData.attachments || [],
        actions: taskData.actions || []
      }

      await setDoc(taskRef, newTask)

      // Notificar usuário atribuído
      if (taskData.assignedTo) {
        await notificationService.createNotification(
          taskData.assignedTo,
          {
            type: 'task_assigned',
            title: 'Nova Tarefa Atribuída',
            message: `Você foi atribuído à tarefa "${taskData.title}"`,
            relatedEntityId: newTask.id
          }
        )
      }

      // Log activity
      const projectData = await projectService.getProjectById(newTask.projectId)
      await activityService.logActivity({
        userId: auth.currentUser?.uid || '',
        userName: auth.currentUser?.displayName || 'Unknown User',
        type: 'task_created',
        projectId: newTask.projectId,
        projectName: projectData.name,
        taskId: newTask.id,
        taskName: newTask.title,
      })

      return newTask
    } catch (error) {
      console.error('Erro ao criar tarefa:', error)
      throw error
    }
  }

  // Buscar tarefas com filtros e paginação
  async fetchTasks(options?: {
    projectId?: string
    assignedTo?: string
    status?: TaskSchema['status']
    priority?: TaskSchema['priority']
    limit?: number
    page?: number
    startAfter?: any
  }): Promise<{
    data: TaskSchema[]
    totalTasks: number
    totalPages: number
  }> {
    try {
      const constraints: QueryConstraint[] = []
      
      // Adicionar filtros
      if (options?.projectId) {
        constraints.push(where('projectId', '==', options.projectId))
      }
      
      if (options?.assignedTo) {
        constraints.push(where('assignedTo', '==', options.assignedTo))
      }
      
      if (options?.status) {
        constraints.push(where('status', '==', options.status))
      }
      
      if (options?.priority) {
        constraints.push(where('priority', '==', options.priority))
      }
      
      // Ordenação
      constraints.push(orderBy('createdAt', 'desc'))
      
      // Paginação
      if (options?.limit) {
        constraints.push(limit(options.limit))
      }
      
      if (options?.startAfter) {
        constraints.push(startAfter(options.startAfter))
      }
      
      // Executar consulta
      const q = query(collection(this.db, 'tasks'), ...constraints)
      const snapshot = await getDocs(q)
      
      // Mapear resultados
      const tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TaskSchema))
      
      // Calcular total de tarefas e páginas
      const totalTasks = tasks.length
      const totalPages = options?.limit 
        ? Math.ceil(totalTasks / options.limit) 
        : 1
      
      return {
        data: tasks,
        totalTasks,
        totalPages
      }
    } catch (error) {
      console.error('Erro ao buscar tarefas:', error)
      throw error
    }
  }

  // Buscar tarefa por ID
  async getTaskById(taskId: string): Promise<TaskSchema> {
    try {
      const taskRef = doc(this.db, 'tasks', taskId)
      const taskSnap = await getDoc(taskRef)

      if (taskSnap.exists()) {
        return {
          id: taskSnap.id,
          ...taskSnap.data()
        } as TaskSchema
      } else {
        throw new Error('Tarefa não encontrada')
      }
    } catch (error) {
      console.error('Erro ao buscar tarefa por ID:', error)
      throw error
    }
  }

  // Atualizar tarefa
  async updateTask(
    taskId: string, 
    updates: Partial<TaskSchema>
  ): Promise<TaskSchema> {
    try {
      const taskRef = doc(this.db, 'tasks', taskId)
      
      await updateDoc(taskRef, {
        ...updates,
        updatedAt: Date.now()
      })

      // Log activity for task update
      const updatedTask = await this.getTaskById(taskId);
      const projectData = await projectService.getProjectById(updatedTask.projectId);
      
      await activityService.logActivity({
        userId: auth.currentUser?.uid || '',
        userName: auth.currentUser?.displayName || 'Unknown User',
        type: 'task_updated',
        projectId: updatedTask.projectId,
        projectName: projectData.name,
        taskId: updatedTask.id,
        taskName: updatedTask.title,
      });

      // If status was updated, log that specifically
      if (updates.status) {
        await activityService.logActivity({
          userId: auth.currentUser?.uid || '',
          userName: auth.currentUser?.displayName || 'Unknown User',
          type: 'task_status_update',
          projectId: updatedTask.projectId,
          projectName: projectData.name,
          taskId: updatedTask.id,
          taskName: updatedTask.title,
          newStatus: updates.status
        });
      }

      return updatedTask;
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error)
      throw error
    }
  }

  // Excluir tarefa
  async deleteTask(taskId: string): Promise<void> {
    try {
      const taskRef = doc(this.db, 'tasks', taskId)
      await deleteDoc(taskRef)
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error)
      throw error
    }
  }

  // Completar ação de tarefa
  async completeTaskAction(
    taskId: string, 
    actionId: string,
    data?: any
  ): Promise<void> {
    try {
      const taskRef = doc(this.db, 'tasks', taskId)
      const taskSnap = await getDoc(taskRef)

      if (!taskSnap.exists()) {
        throw new Error('Tarefa não encontrada')
      }

      const taskData = taskSnap.data() as TaskSchema
      const updatedActions = taskData.actions.map(action => {
        if (action.id === actionId) {
          return {
            ...action,
            completed: true,
            completedAt: Date.now(),
            completedBy: auth.currentUser?.uid,
            ...(data ? { data: { ...action.data, ...data } } : {})
          }
        }
        return action
      })

      await updateDoc(taskRef, {
        actions: updatedActions,
        updatedAt: Date.now()
      })
    } catch (error) {
      console.error('Erro ao completar ação de tarefa:', error)
      throw error
    }
  }

  // Descompletar ação de tarefa
  async uncompleteTaskAction(
    taskId: string, 
    actionId: string
  ): Promise<void> {
    try {
      const taskRef = doc(this.db, 'tasks', taskId)
      const taskSnap = await getDoc(taskRef)

      if (!taskSnap.exists()) {
        throw new Error('Tarefa não encontrada')
      }

      const taskData = taskSnap.data() as TaskSchema
      const updatedActions = taskData.actions.map(action => {
        if (action.id === actionId) {
          const { completed, completedAt, completedBy, ...rest } = action
          return {
            ...rest,
            completed: false
          }
        }
        return action
      })

      await updateDoc(taskRef, {
        actions: updatedActions,
        updatedAt: Date.now()
      })
    } catch (error) {
      console.error('Erro ao descompletar ação de tarefa:', error)
      throw error
    }
  }

  // Upload de anexo para tarefa
  async uploadTaskAttachment(
    taskId: string, 
    file: File
  ): Promise<string> {
    try {
      const storageRef = ref(storage, `tasks/${taskId}/attachments/${file.name}`)
      await uploadBytes(storageRef, file)
      
      const downloadURL = await getDownloadURL(storageRef)
      return downloadURL
    } catch (error) {
      console.error('Erro ao fazer upload de anexo:', error)
      throw error
    }
  }

  // Adicionar comentário à tarefa
  async addTaskComment(
    taskId: string, 
    comment: {
      userId: string
      text: string
      attachments?: string[]
    }
  ): Promise<void> {
    try {
      const taskRef = doc(this.db, 'tasks', taskId)
      const taskSnap = await getDoc(taskRef)

      if (!taskSnap.exists()) {
        throw new Error('Tarefa não encontrada')
      }

      const taskData = taskSnap.data() as TaskSchema
      const comments = taskData.comments || []

      const newComment = {
        id: Date.now().toString(),
        ...comment,
        createdAt: Date.now()
      }

      await updateDoc(taskRef, {
        comments: [...comments, newComment],
        updatedAt: Date.now()
      })
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error)
      throw error
    }
  }

  // New method to create a task with action template
  async createTaskWithTemplate(
    taskData: Omit<TaskSchema, 'id' | 'createdAt' | 'updatedAt'>,
    templateId: string
  ): Promise<TaskSchema> {
    try {
      const taskRef = doc(collection(this.db, 'tasks'))
      const settings = await systemSettingsService.getSettings()

      const template = await actionTemplateService.getActionTemplateById(templateId)
      if (!template) {
        throw new Error('Template not found')
      }

      const actions = this.createActionsFromTemplate(template)

      const coinsReward = Math.round(
        taskData.difficultyLevel *
        settings.taskCompletionBase *
        settings.complexityMultiplier
      )

      const newTask: TaskSchema = {
        id: taskRef.id,
        ...taskData,
        createdBy: auth.currentUser?.uid || '',
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        coinsReward,
        subtasks: taskData.subtasks || [],
        comments: taskData.comments || [],
        attachments: taskData.attachments || [],
        actions: actions
      }

      await setDoc(taskRef, newTask)

      // Log activity
      const projectData = await projectService.getProjectById(newTask.projectId)
      await activityService.logActivity({
        userId: auth.currentUser?.uid || '',
        userName: auth.currentUser?.displayName || 'Unknown User',
        type: 'task_created',
        projectId: newTask.projectId,
        projectName: projectData.name,
        taskId: newTask.id,
        taskName: newTask.title,
      })

      return newTask
    } catch (error) {
      console.error('Error creating task with template:', error)
      throw error
    }
  }

  private createActionsFromTemplate(template: any): TaskAction[] {
    return template.elements.map((element: any, index: number) => ({
      id: `action_${index}_${Date.now()}`,
      title: element.label,
      type: element.type,
      completed: false,
      description: element.description || '',
      required: element.required || false,
      data: {
        ...element,
        value: element.defaultValue
      }
    }))
  }
}

export const taskService = new TaskService()
