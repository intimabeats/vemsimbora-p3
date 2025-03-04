import { describe, it, expect, beforeEach, vi } from 'vitest'
import { notificationService } from '../services/NotificationService'
import { NotificationSchema } from '../types/firestore-schema'

// Mock Firestore functions
vi.mock('firebase/firestore', () => {
  const updateDocMock = vi.fn().mockResolvedValue(undefined);
  const writeBatchMock = vi.fn().mockReturnValue({
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn().mockResolvedValue(true)
  });
  
  return {
    getFirestore: vi.fn(),
    collection: vi.fn(),
    addDoc: vi.fn().mockResolvedValue({ id: 'new-notification-id' }),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    getDocs: vi.fn().mockResolvedValue({
      docs: [
        { 
          id: 'notification1', 
          data: () => ({
            userId: 'test-user-id',
            type: 'task_created',
            title: 'Nova Tarefa',
            message: 'Tarefa criada',
            timestamp: Date.now(),
            read: false
          }) 
        }
      ]
    }),
    updateDoc: updateDocMock,
    deleteDoc: vi.fn(),
    doc: vi.fn(),
    writeBatch: writeBatchMock
  };
});

describe('NotificationService', () => {
  const userId = 'test-user-id'
  const mockNotification = {
    type: 'task_created' as NotificationSchema['type'],
    title: 'Test Notification',
    message: 'Test Message'
  }

  it('should create a notification', async () => {
    const result = await notificationService.createNotification(
      userId, 
      mockNotification
    )

    expect(result).toHaveProperty('id')
    expect(result.title).toBe(mockNotification.title)
    expect(result.read).toBe(false)
  })

  it('should fetch user notifications', async () => {
    const notifications = await notificationService.getUserNotifications(userId)
    
    expect(notifications).toHaveLength(1)
    expect(notifications[0]).toHaveProperty('id', 'notification1')
  })

  it('should mark notification as read', async () => {
    const { updateDoc } = await import('firebase/firestore');
    await notificationService.markNotificationAsRead(userId, 'notification1')
    
    // Verify updateDoc was called
    expect(updateDoc).toHaveBeenCalled()
  })

  it('should mark all notifications as read', async () => {
    const { writeBatch } = await import('firebase/firestore');
    await notificationService.markAllNotificationsAsRead(userId)
    
    // Verify batch operations were performed
    expect(writeBatch).toHaveBeenCalled()
  })

  it('should create task notification', () => {
    const notification = notificationService.createTaskNotification(
      'user123',
      'Test Task',
      'task123'
    )

    expect(notification.type).toBe('task_created')
    expect(notification.userId).toBe('user123')
    expect(notification.relatedEntityId).toBe('task123')
  })

  it('should create reward notification', () => {
    const notification = notificationService.createRewardNotification(
      'user123',
      50
    )

    expect(notification.type).toBe('reward_earned')
    expect(notification.userId).toBe('user123')
    expect(notification.message).toContain('50 moedas')
  })
})
