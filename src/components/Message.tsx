// src/components/Message.tsx
import React from 'react'
import { Trash2, CornerDownLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { AttachmentDisplay } from './AttachmentDisplay'
import { getDefaultProfileImage } from '../utils/user'
import { Link } from 'react-router-dom'; // Import Link

interface MessageProps {
  message: {
    id: string
    userId: string
    userName: string
    content: string
    timestamp: number
    attachments?: {
      id: string
      name: string
      url: string
      type: 'image' | 'video' | 'document' | 'link' | 'other' | 'audio'
      size?: number
    }[]
    quotedMessage?: {
      userName: string;
      content: string;
      attachments?: any[];
    }
    originalMessageId?: string; // Add originalMessageId
    messageType?: 'task_submission' | 'task_approval' | 'general'; // Add messageType
  }
  onDelete: (messageId: string) => void
  onQuote: (message: { userName: string; content: string, attachments?: any[] }) => void
  isFirstMessage: boolean;
  users: { [key: string]: { name: string; photoURL?: string } }; // Receive users prop
}

export const Message: React.FC<MessageProps> = ({ message, onDelete, onQuote, isFirstMessage, users }) => {
  const { currentUser } = useAuth()
  const isCurrentUserMessage = message.userId === currentUser?.uid
  const isSystemMessage = message.userId === 'system'; // Check if it's a system message

    const user = users ? users[message.userId] : null;

  return (
    <div
      className={`group flex items-start gap-3 mb-4 ${ // Added px-4 here
        isCurrentUserMessage ? 'flex-row-reverse' : ''
      } ${isFirstMessage ? 'mt-4' : ''}`}
    >
      {!isSystemMessage && ( // Only show user image if NOT a system message
        <img
          src={user?.photoURL || getDefaultProfileImage(user?.name || message.userName || '')}
          alt={message.userName}
          className="w-10 h-10 rounded-full object-cover"
        />
      )}
      <div
        className={`max-w-[70%] p-3 rounded-lg shadow ${
          isCurrentUserMessage
            ? 'bg-blue-600 text-white rounded-br-none'
            : isSystemMessage
            ? 'bg-gray-200 text-gray-800 rounded-bl-none' // Style for system messages
            : 'bg-white text-gray-700 rounded-bl-none'
        }`}
      >
        {!isCurrentUserMessage && !isSystemMessage && (
          <div className="text-sm font-medium text-gray-600">
            {message.userName}
          </div>
        )}

        {/* Display Quoted Message */}
        {message.quotedMessage && (
          <div className="mb-2 p-2 bg-gray-100 rounded-lg text-sm">
            <div className="font-semibold text-gray-700">{message.quotedMessage.userName}</div>
            {/* Check if the quoted message content contains a link */}
            {message.quotedMessage.content.includes('[Ver Tarefa]') ? (
              <div className="text-gray-600">
                {/* Render the content with a link */}
                {message.quotedMessage.content.split('[Ver Tarefa]').map((part, index) => {
                  if (index === 1) {
                    const url = part.match(/\(([^)]+)\)/)?.[1]; // Extract URL
                    return (
                      <React.Fragment key={index}>
                        <Link to={url || '#'} className="text-blue-600 hover:underline">
                          [Ver Tarefa]
                        </Link>
                        {part.replace(/\([^)]+\)/, '')} {/* Remove the URL part from the text */}
                      </React.Fragment>
                    );
                  }
                  return part;
                })}
              </div>
            ) : (
              <div className="text-gray-600">{message.quotedMessage.content}</div>
            )}
            {/* Display attachments in quoted message */}
            {message.quotedMessage.attachments && message.quotedMessage.attachments.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {message.quotedMessage.attachments.map((attachment) => (
                  <AttachmentDisplay key={attachment.id} attachment={attachment} color="text-blue-600" />
                ))}
              </div>
            )}
          </div>
        )}

        <div>{message.content}</div>

        {/* Attachments Table-like Layout */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 bg-gray-100 rounded-lg p-2">
            <div className="flex flex-col gap-1">
              {message.attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center">
                  <AttachmentDisplay attachment={attachment} color="text-blue-600" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          className={`text-xs mt-1 ${
            isCurrentUserMessage ? 'text-blue-200' : 'text-gray-500'
          }`}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
       <div className="flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity">
          {isCurrentUserMessage && (
            <button
              onClick={() => onDelete(message.id)}
              className="p-1 text-gray-500 hover:text-red-600"
            >
              <Trash2 size={16} />
            </button>
          )}
          {!isSystemMessage && (  // Don't allow quoting system messages
          <button
            onClick={() => onQuote({ userName: message.userName, content: message.content, attachments: message.attachments })}
            className='p-1 text-gray-500 hover:text-blue-600'
          >
            <CornerDownLeft size={16} />
          </button>
          )}
        </div>
    </div>
  )
}
