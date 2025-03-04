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
  limit
} from 'firebase/firestore'
import { auth, storage } from '../config/firebase'
import { TaskSchema, ProjectSchema, TaskAction, ActionTemplateSchema } from '../types/firestore-schema'
import { systemSettingsService } from './SystemSettingsService'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { notificationService } from './NotificationService'
import { projectService } from './ProjectService'
import { userManagementService } from './UserManagementService'
import { activityService } from './ActivityService'
import { actionTemplateService } from './ActionTemplateService'

export class TaskService {
  private db = getFirestore()

  // ... (previous methods remain unchanged)

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

  private createActionsFromTemplate(template: ActionTemplateSchema): TaskAction[] {
    return template.elements.map((element, index) => ({
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

  // Update method to complete a task action
  async completeTaskAction(taskId: string, actionId: string, data: any): Promise<void> {
    try {
      const taskRef = doc(this.db, 'tasks', taskId)
      const taskSnap = await getDoc(taskRef)

      if (!taskSnap.exists()) {
        throw new Error('Task not found')
      }

      const taskData = taskSnap.data() as TaskSchema
      const updatedActions = taskData.actions.map(action => {
        if (action.id === actionId) {
          return {
            ...action,
            completed: true,
            completedAt: Date.now(),
            completedBy: auth.currentUser?.uid,
            data: {
              ...action.data,
              value: data.value
            }
          }
        }
        return action
      })

      await updateDoc(taskRef, {
        actions: updatedActions,
        updatedAt: Date.now()
      })
      
      console.log('Task action completed successfully')
    } catch (error) {
      console.error('Error completing task action:', error)
      throw error
    }
  }

  // ... (other methods remain unchanged)
}

export const taskService = new TaskService()
