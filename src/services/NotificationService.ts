import { 
  getFirestore, 
  collection, 
  doc,
  addDoc,
  query, 
  where, 
  orderBy, 
  limit,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  writeBatch
} from 'firebase/firestore'
import { NotificationSchema } from '../types/firestore-schema'
import { auth } from '../config/firebase'

export class NotificationService {
  private db = getFirestore()

  // Criar nova notificação para um usuário específico
  async createNotification(
    userId: string, 
    notification: Omit<NotificationSchema, 'id' | 'read' | 'timestamp' | 'userId'>
  ): Promise<NotificationSchema> {
    try {
      const notificationData: Omit<NotificationSchema, 'id'> = {
        userId,
        ...notification,
        read: false,
        timestamp: Date.now()
      }

      const docRef = await addDoc(
        collection(this.db, 'users', userId, 'notifications'), 
        notificationData
      )

      return {
        ...notificationData,
        id: docRef.id
      }
    } catch (error) {
      console.error('Erro ao criar notificação:', error)
      throw error
    }
  }

  // Buscar notificações de um usuário
  async getUserNotifications(
    userId: string, 
    options?: { 
      limit?: number, 
      unreadOnly?: boolean,
      type?: NotificationSchema['type']
    }
  ): Promise<NotificationSchema[]> {
    try {
      let notificationsQuery = query(
        collection(this.db, 'users', userId, 'notifications'),
        orderBy('timestamp', 'desc')
      )

      // Filtrar apenas não lidas
      if (options?.unreadOnly) {
        notificationsQuery = query(
          notificationsQuery, 
          where('read', '==', false)
        )
      }

      // Filtrar por tipo
      if (options?.type) {
        notificationsQuery = query(
          notificationsQuery,
          where('type', '==', options.type)
        )
      }

      // Limitar número de notificações
      if (options?.limit) {
        notificationsQuery = query(
          notificationsQuery, 
          limit(options.limit)
        )
      }

      const snapshot = await getDocs(notificationsQuery)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as NotificationSchema))
    } catch (error) {
      console.error('Erro ao buscar notificações:', error)
      throw error
    }
  }

  // Marcar notificação como lida
  async markNotificationAsRead(
    userId: string, 
    notificationId: string
  ): Promise<void> {
    try {
      const notificationRef = doc(
        this.db, 
        'users', 
        userId, 
        'notifications', 
        notificationId
      )

      await updateDoc(notificationRef, { read: true })
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error)
      throw error
    }
  }

  // Marcar todas as notificações como lidas
  async markAllNotificationsAsRead(userId: string): Promise<void> {
    try {
      const notificationsQuery = query(
        collection(this.db, 'users', userId, 'notifications'),
        where('read', '==', false)
      )

      const snapshot = await getDocs(notificationsQuery)
      
      const batch = writeBatch(this.db);
      
      snapshot.docs.forEach((document) => {
        const notificationRef = doc(
          this.db, 
          'users', 
          userId, 
          'notifications', 
          document.id
        )
        batch.update(notificationRef, { read: true });
      });

      await batch.commit();
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error)
      throw error
    }
  }

  // Limpar notificações antigas
  async clearOldNotifications(
    userId: string, 
    daysOld: number = 30
  ): Promise<void> {
    try {
      const thresholdTimestamp = Date.now() - (daysOld * 24 * 60 * 60 * 1000)
      
      const notificationsQuery = query(
        collection(this.db, 'users', userId, 'notifications'),
        where('timestamp', '<', thresholdTimestamp)
      )

      const snapshot = await getDocs(notificationsQuery)
      
      const batch = writeBatch(this.db);
      
      snapshot.docs.forEach((document) => {
        const notificationRef = doc(
          this.db, 
          'users', 
          userId, 
          'notifications', 
          document.id
        )
        batch.delete(notificationRef);
      });

      await batch.commit();
    } catch (error) {
      console.error('Erro ao limpar notificações antigas:', error)
      throw error
    }
  }

  // Criar notificações para múltiplos usuários
  async createBulkNotifications(
    userIds: string[], 
    notificationData: Omit<NotificationSchema, 'id' | 'read' | 'timestamp' | 'userId'>
  ): Promise<void> {
    try {
      const notificationPromises = userIds.map(userId => 
        this.createNotification(userId, notificationData)
      )

      await Promise.all(notificationPromises)
    } catch (error) {
      console.error('Erro ao criar notificações em massa:', error)
      throw error
    }
  }

  // Helper methods for creating common notification types
  createTaskNotification(
    userId: string, 
    taskTitle: string, 
    taskId: string
  ): Omit<NotificationSchema, 'id' | 'read' | 'timestamp'> {
    return {
      userId,
      type: 'task_created',
      title: 'Nova Tarefa',
      message: `Uma nova tarefa "${taskTitle}" foi criada`,
      relatedEntityId: taskId
    }
  }

  createTaskAssignmentNotification(
    userId: string, 
    taskTitle: string, 
    taskId: string
  ): Omit<NotificationSchema, 'id' | 'read' | 'timestamp'> {
    return {
      userId,
      type: 'task_assigned',
      title: 'Tarefa Atribuída',
      message: `Você foi atribuído à tarefa "${taskTitle}"`,
      relatedEntityId: taskId
    }
  }

  createRewardNotification(
    userId: string, 
    coins: number
  ): Omit<NotificationSchema, 'id' | 'read' | 'timestamp'> {
    return {
      userId,
      type: 'reward_earned',
      title: 'Recompensa Recebida',
      message: `Você ganhou ${coins} moedas!`
    }
  }
}

export const notificationService = new NotificationService()
