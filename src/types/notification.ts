export type NotificationType = 
  | 'task_created'
  | 'task_assigned'
  | 'task_completed'
  | 'task_approved'
  | 'project_update'
  | 'reward_earned'
  | 'system_alert'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: number
  read: boolean
  relatedEntityId?: string
  sender?: string
}
