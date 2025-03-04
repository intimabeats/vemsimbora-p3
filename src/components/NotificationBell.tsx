import React, { useState, useEffect, useRef } from 'react'
import { Bell, CheckCircle, AlertCircle, X, Clock } from 'lucide-react'
import { NotificationSchema } from '../types/firestore-schema'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'

// Import the service as a class instance, not as a type
import { notificationService } from '../services/NotificationService'

export const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationSchema[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { currentUser } = useAuth()
  const dropdownRef = useRef<HTMLDivElement>(null) // Ref for the dropdown

  useEffect(() => {
    if (currentUser) {
      fetchNotifications()
    }
  }, [currentUser])

  const fetchNotifications = async () => {
    if (!currentUser) return
    
    try {
      setIsLoading(true)
      setError(null)
      
      // Use the instance method, not the static method
      const userNotifications = await notificationService.getUserNotifications(
        currentUser.uid,
        { limit: 5, unreadOnly: true }
      )
      
      setNotifications(userNotifications)
    } catch (error: any) {
      console.error('Erro ao buscar notificações:', error)
      setError('Não foi possível carregar as notificações')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    if (!currentUser) return
    
    try {
      // Use the instance method, not the static method
      await notificationService.markNotificationAsRead(
        currentUser.uid,
        notificationId
      )
      
      // Update the local state to reflect the change
      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      )
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!currentUser || notifications.length === 0) return
    
    try {
      // Use the instance method, not the static method
      await notificationService.markAllNotificationsAsRead(currentUser.uid)
      
      // Clear all notifications from the local state
      setNotifications([])
    } catch (error) {
      console.error('Erro ao marcar todas notificações como lidas:', error)
    }
  }

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleBellClick = (event: React.MouseEvent) => {
    event.stopPropagation() // Stop event propagation
    setIsOpen(!isOpen)       // Toggle isOpen state
  }

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_created':
      case 'task_completed':
        return <CheckCircle className="text-green-500" size={16} />
      case 'task_assigned':
      case 'task_updated':
        return <Clock className="text-blue-500" size={16} />
      case 'system_alert':
        return <AlertCircle className="text-red-500" size={16} />
      default:
        return <Bell className="text-gray-500" size={16} />
    }
  }

  // Format timestamp to relative time (e.g., "2 hours ago")
  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days} ${days === 1 ? 'dia' : 'dias'} atrás`
    if (hours > 0) return `${hours} ${hours === 1 ? 'hora' : 'horas'} atrás`
    if (minutes > 0) return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} atrás`
    return 'Agora mesmo'
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleBellClick}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Notificações"
      >
        <Bell className="text-gray-600" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
            {notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border z-50 max-h-[80vh] overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
            <h3 className="font-semibold">Notificações</h3>
            <button
              onClick={handleMarkAllAsRead}
              disabled={notifications.length === 0 || isLoading}
              className={`text-blue-600 text-sm hover:text-blue-800 transition-colors ${
                notifications.length === 0 || isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Marcar todas como lidas
            </button>
          </div>

          {isLoading ? (
            <div className="p-4 text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-500">Carregando notificações...</p>
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-500">
              <AlertCircle className="mx-auto mb-2" size={24} />
              {error}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500 flex flex-col items-center">
              <Bell className="mb-2 text-gray-400" size={32} />
              <p>Sem novas notificações</p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 border-b hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start">
                      <div className="mt-1 mr-3">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 text-sm">{notification.title}</h4>
                        <p className="text-sm text-gray-600 mb-1">
                          {notification.message}
                        </p>
                        <span className="text-xs text-gray-400">
                          {formatRelativeTime(notification.timestamp)}
                        </span>
                        {notification.relatedEntityId && (
                          <Link
                            to={`/tasks/${notification.relatedEntityId}`}
                            className="block mt-1 text-xs text-blue-600 hover:underline"
                            onClick={() => setIsOpen(false)}
                          >
                            Ver detalhes
                          </Link>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                      title="Marcar como lida"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
