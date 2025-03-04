import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '../../components/Layout'
import {
  MessageCircle,
  Paperclip,
  Send,
  ArrowLeft,
  X,
  Users,
  Image as ImageIcon,
  FileText,
  Video,
  File,
  Music,
  Info,
  Smile, // Substituído EmojiHappy por Smile
  Mic,
  ChevronDown,
  Search
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { projectService } from '../../services/ProjectService'
import { userManagementService } from '../../services/UserManagementService'
import { storage } from '../../config/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { Message } from '../../components/Message'
import { DeleteConfirmationModal } from '../../components/modals/DeleteConfirmationModal'
import { getDefaultProfileImage } from '../../utils/user'

interface MessageType {
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
  originalMessageId?: string;
  messageType?: 'task_submission' | 'task_approval' | 'general';
}

// Functional component for the Managers Modal
const ManagersModal: React.FC<{ managers: any[]; onClose: () => void }> = ({ managers, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Gestores do Projeto</h2>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <ul className="space-y-3">
              {managers.map((manager) => (
                <li key={manager.id} className="flex items-center p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  <img
                    src={manager.profileImage || getDefaultProfileImage(manager.name)}
                    alt={manager.name}
                    className="w-10 h-10 rounded-full object-cover mr-3"
                  />
                  <div>
                    <span className="font-semibold text-gray-800">{manager.name}</span>
                    <p className="text-xs text-gray-500">Gestor</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
};

// Emoji Picker Component
const EmojiPicker: React.FC<{ onSelectEmoji: (emoji: string) => void; onClose: () => void }> = ({ onSelectEmoji, onClose }) => {
  const commonEmojis = ['😀', '😂', '😊', '❤️', '👍', '🎉', '🔥', '⭐', '✅', '🚀', '🤔', '👏', '🙏', '💯', '🌟'];
  
  return (
    <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border p-2 w-64">
      <div className="flex justify-between items-center mb-2 pb-2 border-b">
        <h3 className="text-sm font-medium">Emojis</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {commonEmojis.map(emoji => (
          <button 
            key={emoji} 
            onClick={() => onSelectEmoji(emoji)}
            className="text-xl hover:bg-gray-100 p-1 rounded transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

// File Type Selector Component
const FileTypeSelector: React.FC<{ onSelect: (type: string) => void; onClose: () => void }> = ({ onSelect, onClose }) => {
  const fileTypes = [
    { type: 'image/*', label: 'Imagem', icon: <ImageIcon size={20} className="text-blue-500" /> },
    { type: 'video/*', label: 'Vídeo', icon: <Video size={20} className="text-red-500" /> },
    { type: 'audio/*', label: 'Áudio', icon: <Music size={20} className="text-purple-500" /> },
    { type: 'application/pdf', label: 'PDF', icon: <FileText size={20} className="text-orange-500" /> },
    { type: '*/*', label: 'Qualquer arquivo', icon: <File size={20} className="text-gray-500" /> },
  ];
  
  return (
    <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border p-2 w-64">
      <div className="flex justify-between items-center mb-2 pb-2 border-b">
        <h3 className="text-sm font-medium">Tipo de Arquivo</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>
      <div className="space-y-1">
        {fileTypes.map(fileType => (
          <button 
            key={fileType.type} 
            onClick={() => onSelect(fileType.type)}
            className="w-full flex items-center p-2 hover:bg-gray-100 rounded text-left transition-colors"
          >
            {fileType.icon}
            <span className="ml-2">{fileType.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export const ProjectChat: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const inputAreaRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [project, setProject] = useState<any>(null)
  const [messages, setMessages] = useState<MessageType[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [users, setUsers] = useState<{ [key: string]: { name: string; photoURL?: string } }>({})
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null)
  const [quotedMessage, setQuotedMessage] = useState<MessageType | null>(null)
  const [isManagersModalOpen, setIsManagersModalOpen] = useState(false);
  const [managers, setManagers] = useState<any[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFileTypeSelector, setShowFileTypeSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [filteredMessages, setFilteredMessages] = useState<MessageType[]>([]);

  const openManagersModal = () => setIsManagersModalOpen(true);
  const closeManagersModal = () => setIsManagersModalOpen(false);

  // Load project data, messages, and users
  useEffect(() => {
    const loadProjectData = async () => {
      try {
        if (!projectId) throw new Error('Project ID is required');
        setIsLoading(true);
        setError(null);

        const projectData = await projectService.getProjectById(projectId);
        setProject(projectData);

        const projectMessages = await projectService.getProjectMessages(projectId);
        setMessages(projectMessages);
        setFilteredMessages(projectMessages);

        const usersResponse = await userManagementService.fetchUsers();
        const userMap = usersResponse.data.reduce((acc, user) => {
          acc[user.id] = { name: user.name, photoURL: user.profileImage };
          return acc;
        }, {} as { [key: string]: { name: string; photoURL?: string } });
        setUsers(userMap);

        // Fetch manager data
        if (projectData && projectData.managers) {
          const managerData = await Promise.all(
            projectData.managers.map((managerId: string) => userManagementService.getUserById(managerId))
          );
          setManagers(managerData);
        }

      } catch (err: any) {
        console.error('Error loading project data:', err)
        setError(err.message || 'Failed to load project details')
      } finally {
        setIsLoading(false)
      }
    }

    loadProjectData()
  }, [projectId])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [filteredMessages])

  // Filter messages when search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredMessages(messages);
      return;
    }
    
    const filtered = messages.filter(message => 
      message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.userName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredMessages(filtered);
  }, [searchTerm, messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments(prev => [...prev, ...files])
  }

  const selectFileType = (fileType: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = fileType;
      fileInputRef.current.click();
    }
    setShowFileTypeSelector(false);
  };

  const uploadFile = async (file: File) => {
    const storageRef = ref(storage, `projects/${projectId}/chat/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytes(storageRef, file);

    return new Promise<{
      id: string;
      name: string;
      url: string;
      type: 'image' | 'video' | 'document' | 'link' | 'other' | 'audio';
      size?: number;
    }>((resolve, reject) => {
      uploadTask.then(async (snapshot) => {
        const url = await getDownloadURL(snapshot.ref);
        const getFileType = (file: File) => {
          if (file.type.startsWith('image/')) return 'image';
          if (file.type.startsWith('video/')) return 'video';
          if (file.type.startsWith('audio/')) return 'audio';
          if (file.type.includes('document') || file.type.includes('pdf')) return 'document';
          return 'other';
        };

        resolve({
          id: Date.now().toString(),
          name: file.name,
          url,
          type: getFileType(file),
          size: file.size,
        });
      }).catch(reject);
    });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;
    
    setIsLoading(true);
    setError(null);

    try {
      setUploadProgress(0);
      let uploadedAttachments: {
        id: string;
        name: string;
        url: string;
        type: 'image' | 'video' | 'document' | 'link' | 'other' | 'audio';
        size?: number;
      }[] = [];

      if (attachments.length > 0) {
        const uploadPromises = attachments.map((file) => uploadFile(file));
        uploadedAttachments = await Promise.all(uploadPromises);
      }

      const newMessageObj: MessageType = {
        id: Date.now().toString(),
        userId: currentUser!.uid,
        userName: currentUser!.displayName || users[currentUser!.uid]?.name || 'Usuário',
        content: newMessage,
        timestamp: Date.now(),
        messageType: 'general'
      };

      // Only add attachments if there are any
      if (uploadedAttachments.length > 0) {
        newMessageObj.attachments = uploadedAttachments;
      }

      // Only add quotedMessage if there is one
      if (quotedMessage) {
        newMessageObj.quotedMessage = {
          userName: quotedMessage.userName,
          content: quotedMessage.content,
          attachments: quotedMessage.attachments
        };
      }

      // Add the new message to Firestore
      await projectService.addProjectMessage(projectId!, newMessageObj);

      // Update local state
      setMessages((prevMessages) => [...prevMessages, newMessageObj]);
      setFilteredMessages((prevMessages) => [...prevMessages, newMessageObj]);
      setNewMessage('');
      setAttachments([]);
      setUploadProgress(0);
      setQuotedMessage(null);
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMessage = async () => {
    if (!messageToDelete) return;

    try {
      // Filter out the message to be deleted
      const updatedMessages = messages.filter((msg) => msg.id !== messageToDelete);

      // Update the messages in the state
      setMessages(updatedMessages);
      setFilteredMessages(updatedMessages.filter(message => 
        !searchTerm.trim() || 
        message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.userName.toLowerCase().includes(searchTerm.toLowerCase())
      ));

      // Update the messages in Firestore
      await projectService.updateProject(projectId!, { messages: updatedMessages });

    } catch (error) {
      console.error("Error deleting message:", error);
      setError("Failed to delete message.");
    } finally {
      setIsDeleteModalOpen(false);
      setMessageToDelete(null);
    }
  }

  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  // Dynamic height calculation
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      if (chatContainerRef.current && headerRef.current && inputAreaRef.current) {
        const headerHeight = headerRef.current.offsetHeight;
        const inputAreaHeight = inputAreaRef.current.offsetHeight;
        const windowHeight = window.innerHeight;

        // Calculate available height for chat container
        const chatContainerHeight = windowHeight - headerHeight - inputAreaHeight;

        chatContainerRef.current.style.height = `${chatContainerHeight}px`;
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    });

    if (chatContainerRef.current) {
      resizeObserver.observe(chatContainerRef.current);
    }

    return () => {
      if (chatContainerRef.current) {
        resizeObserver.unobserve(chatContainerRef.current);
      }
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter to send message
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        handleSendMessage();
      }
      
      // Escape to clear quoted message
      if (e.key === 'Escape' && quotedMessage) {
        setQuotedMessage(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [newMessage, attachments, quotedMessage]);

  if (isLoading && !project) {
    return (
      <Layout role="admin">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout role={currentUser?.role || 'employee'}>
        <div className="p-4 bg-red-100 text-red-700 border border-red-400 rounded flex items-center">
        <Info className="mr-2" size={20} />
          {error}
        </div>
      </Layout>
    )
  }

  const MAX_MANAGERS_DISPLAY = 5;
  const displayedManagers = managers.slice(0, MAX_MANAGERS_DISPLAY);
  const remainingManagersCount = managers.length - MAX_MANAGERS_DISPLAY;

  return (
    <Layout role={currentUser?.role || 'employee'}>
      <div className="flex flex-col h-screen">
        {/* Fixed Header */}
        <div ref={headerRef} className="bg-white shadow-md p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(`/admin/projects/${projectId}`)}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-semibold text-gray-900 text-center flex-grow">
              {project?.name}
            </h1>
            <div className="relative">
              <button 
                onClick={() => setIsSearching(!isSearching)}
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                <Search size={20} />
              </button>
            </div>
          </div>
          
          {isSearching && (
            <div className="mt-2 relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar mensagens..."
                className="w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          )}
          
          {/* Display Managers */}
          <div className="flex items-center justify-center mt-2 cursor-pointer" onClick={openManagersModal}>
            {displayedManagers.map((manager) => (
              <div key={manager.id} className="relative group">
                <img
                  src={manager.profileImage || getDefaultProfileImage(manager.name)}
                  alt={manager.name}
                  className="w-8 h-8 rounded-full object-cover border-2 border-white ml-[-0.5rem]"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 text-white text-xs text-center py-0.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-b-full truncate">
                  {manager.name.split(' ')[0]}
                </div>
              </div>
            ))}
            {remainingManagersCount > 0 && (
              <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center ml-[-0.5rem]">
                +{remainingManagersCount}
              </div>
            )}
          </div>
        </div>

        {/* Chat Container (scrollable) */}
        <div
          className="flex-1 overflow-y-auto bg-gray-50 p-4"
          ref={chatContainerRef}
        >
          {filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              {searchTerm ? (
                <>
                  <Search size={48} className="mb-2 text-gray-400" />
                  <p>Nenhuma mensagem encontrada para "{searchTerm}"</p>
                </>
              ) : (
                <>
                  <MessageCircle size={48} className="mb-2 text-gray-400" />
                  <p>Nenhuma mensagem ainda. Seja o primeiro a enviar!</p>
                </>
              )}
            </div>
          ) : (
            filteredMessages.map((message, index) => (
              <Message
                key={message.id}
                message={message}
                onDelete={(messageId) => {
                  setMessageToDelete(messageId);
                  setIsDeleteModalOpen(true);
                }}
                onQuote={(message) => setQuotedMessage({ 
                  id: '', 
                  userId: '', 
                  timestamp: 0, 
                  userName: message.userName, 
                  content: message.content, 
                  attachments: message.attachments 
                })}
                isFirstMessage={index === 0}
                users={users}
              />
            ))
          )}
        </div>

        {/* Input Area */}
        <div ref={inputAreaRef} className="bg-white p-4 shadow-md flex-shrink-0 sticky bottom-0">
          {/* Quoted Message Display */}
          {quotedMessage && (
            <div className="mb-4 p-3 bg-gray-100 rounded-lg flex items-center justify-between">
              <div className="flex-1 pr-4">
                <div className="font-semibold text-gray-700 flex items-center">
                  <span className="w-1 h-full bg-blue-500 mr-2"></span>
                  Respondendo a {quotedMessage.userName}
                </div>
                <div className="text-gray-600 line-clamp-1">{quotedMessage.content}</div>
              </div>
              <button 
                onClick={() => setQuotedMessage(null)} 
                className="text-gray-500 hover:text-red-500 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Attachment Preview */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4 p-2 bg-gray-50 rounded-lg border border-gray-200">
              {attachments.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-2 bg-white rounded-lg px-3 py-2 border border-gray-200"
                >
                  <File size={16} className="text-gray-500" />
                  <span className="text-sm text-gray-700 truncate" style={{ maxWidth: '150px' }}>
                    {file.name}
                  </span>
                  <button
                    onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== index))}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {attachments.length > 1 && (
                <button
                  onClick={() => setAttachments([])}
                  className="text-xs text-red-500 hover:text-red-700 transition-colors ml-2"
                >
                  Remover todos
                </button>
              )}
            </div>
          )}

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFileTypeSelector(!showFileTypeSelector)}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors"
                title="Anexar arquivo"
              >
                <Paperclip size={20} />
              </button>
              {showFileTypeSelector && (
                <div 
                  className="fixed transform -translate-x-1/2 bg-white rounded-lg shadow-lg border p-2 w-64 z-30"
                  style={{
                    bottom: `${inputAreaRef.current?.offsetHeight ? inputAreaRef.current.offsetHeight + 10 : 70}px`,
                    left: '50%',
                    maxWidth: 'calc(100vw - 20px)'
                  }}
                >
                  <div className="flex justify-between items-center mb-2 pb-2 border-b">
                    <h3 className="text-sm font-medium">Tipo de Arquivo</h3>
                    <button onClick={() => setShowFileTypeSelector(false)} className="text-gray-400 hover:text-gray-600">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {[
                      { type: 'image/*', label: 'Imagem', icon: <ImageIcon size={20} className="text-blue-500" /> },
                      { type: 'video/*', label: 'Vídeo', icon: <Video size={20} className="text-red-500" /> },
                      { type: 'audio/*', label: 'Áudio', icon: <Music size={20} className="text-purple-500" /> },
                      { type: 'application/pdf', label: 'PDF', icon: <FileText size={20} className="text-orange-500" /> },
                      { type: '*/*', label: 'Qualquer arquivo', icon: <File size={20} className="text-gray-500" /> },
                    ].map(fileType => (
                      <button 
                        key={fileType.type} 
                        onClick={() => {
                          selectFileType(fileType.type);
                          setShowFileTypeSelector(false);
                        }}
                        className="w-full flex items-center p-2 hover:bg-gray-100 rounded text-left transition-colors"
                      >
                        {fileType.icon}
                        <span className="ml-2">{fileType.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 text-gray-500 hover:text-yellow-500 hover:bg-gray-100 rounded-full transition-colors"
                title="Inserir emoji"
              >
                <Smile size={20} />
              </button>
              {showEmojiPicker && (
                <div 
                  className="fixed transform -translate-x-1/2 bg-white rounded-lg shadow-lg border p-2 w-64 z-30"
                  style={{
                    bottom: `${inputAreaRef.current?.offsetHeight ? inputAreaRef.current.offsetHeight + 10 : 70}px`,
                    left: '50%',
                    maxWidth: 'calc(100vw - 20px)'
                  }}
                >
                  <div className="flex justify-between items-center mb-2 pb-2 border-b">
                    <h3 className="text-sm font-medium">Emojis</h3>
                    <button onClick={() => setShowEmojiPicker(false)} className="text-gray-400 hover:text-gray-600">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {['😀', '😂', '😊', '❤️', '👍', '🎉', '🔥', '⭐', '✅', '🚀', '🤔', '👏', '🙏', '💯', '🌟'].map(emoji => (
                      <button 
                        key={emoji} 
                        onClick={() => {
                          addEmoji(emoji);
                          setShowEmojiPicker(false);
                        }}
                        className="text-xl hover:bg-gray-100 p-1 rounded transition-colors"
                      >
                        {emoji}
</button>
                    ))}
                  </div>
                </div>
              )}
            </div>



            <div className="flex-1 relative">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                style={{ maxHeight: '120px', minHeight: '42px' }}
                rows={Math.min(5, Math.max(1, newMessage.split('\n').length))}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                ref={inputRef}
              />
            </div>

            <button
              onClick={handleSendMessage}
              disabled={(!newMessage.trim() && attachments.length === 0) || isLoading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteMessage}
        itemName="esta mensagem"
        warningMessage="Esta ação não poderá ser desfeita."
      />

      {/* Managers Modal */}
      {isManagersModalOpen && (
        <ManagersModal managers={managers} onClose={closeManagersModal} />
      )}
    </Layout>
  )
}
