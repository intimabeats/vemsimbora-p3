import React, { useState, useEffect, useRef } from 'react';
import { TaskAction } from '../types/firestore-schema';
import { 
  Save, X, Plus, Trash2, FileText, Type, List, 
  Calendar, Image, Video, Mic, Info, Check,
  Upload, AlertCircle, Loader2, Camera, File,
  Paperclip
} from 'lucide-react';
import { storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface ActionViewProps {
  action: TaskAction;
  onComplete: (actionId: string, data?: any) => void;
  onCancel: () => void;
  taskId: string;
  isOpen: boolean;
  isEditMode?: boolean;
}

export const ActionView: React.FC<ActionViewProps> = ({
  action,
  onComplete,
  onCancel,
  taskId,
  isOpen,
  isEditMode = false
}) => {
  const [editedAction, setEditedAction] = useState<TaskAction>({...action});
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    setEditedAction({...action});
    setFiles([]);
    setError(null);
    setUploadProgress(0);
  }, [action]);

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
    }
  }, [editedAction.description, editedAction.infoDescription]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const firstInput = document.querySelector('.action-view-modal input, .action-view-modal textarea') as HTMLElement;
        if (firstInput) firstInput.focus();
      }, 100);
    }
  }, [isOpen]);
  
  const handleChange = (field: keyof TaskAction, value: any) => {
    setEditedAction(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleSave = async () => {
    if (!validateForm()) return;
    
    setIsUploading(true);
    setError(null);
    
    try {
      const data: any = { ...editedAction };
      
      if (files.length > 0) {
        const uploadedFiles = await Promise.all(files.map(file => uploadFile(file)));
        data.attachments = uploadedFiles;
      }
      
      onComplete(editedAction.id, data);
    } catch (err: any) {
      setError(err.message || 'Failed to save action');
    } finally {
      setIsUploading(false);
    }
  };

  const validateForm = (): boolean => {
    if (!editedAction.title.trim()) {
      setError('Title is required');
      return false;
    }
    
    if (editedAction.type === 'info') {
      if (!editedAction.infoTitle?.trim()) {
        setError('Info title is required');
        return false;
      }
      if (!editedAction.infoDescription?.trim()) {
        setError('Info description is required');
        return false;
      }
    } else if (!editedAction.description?.trim()) {
      setError('Description is required');
      return false;
    }
    
    if (editedAction.type === 'info' && editedAction.hasAttachments && files.length === 0 && !editedAction.data?.fileURLs?.length) {
      setError('Please attach at least one file');
      return false;
    }
    
    return true;
  };

  const uploadFile = async (file: File): Promise<{ id: string; name: string; url: string; type: string }> => {
    const storageRef = ref(storage, `tasks/${taskId}/attachments/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    
    return {
      id: Date.now().toString(),
      name: file.name,
      url: downloadURL,
      type: file.type.split('/')[0] // 'image', 'video', etc.
    };
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image size={16} className="text-blue-500" />;
    if (file.type.startsWith('video/')) return <Video size={16} className="text-red-500" />;
    if (file.type.startsWith('audio/')) return <Mic size={16} className="text-purple-500" />;
    return <File size={16} className="text-gray-500" />;
  };

  const renderTypeSpecificFields = () => {
    switch (editedAction.type) {
      case 'info':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título da Informação
              </label>
              <input
                type="text"
                value={editedAction.infoTitle || ''}
                onChange={(e) => handleChange('infoTitle', e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
                placeholder="Ex: Instruções Importantes"
                readOnly={!isEditMode}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição Detalhada
              </label>
              <textarea
                ref={textAreaRef}
                value={editedAction.infoDescription || ''}
                onChange={(e) => handleChange('infoDescription', e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300 min-h-[100px]"
                placeholder="Descreva as informações importantes aqui..."
                readOnly={!isEditMode}
              />
            </div>
            {(isEditMode || editedAction.hasAttachments) && (
              <div className="flex items-center">
                {isEditMode && (
                  <input
                    type="checkbox"
                    id="hasAttachments"
                    checked={editedAction.hasAttachments || false}
                    onChange={(e) => handleChange('hasAttachments', e.target.checked)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                )}
                <label htmlFor="hasAttachments" className="text-sm text-gray-700">
                  {editedAction.hasAttachments ? "Anexos necessários" : "Sem anexos"}
                </label>
              </div>
            )}
            
            {editedAction.hasAttachments && (
              <div className="mt-2 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Anexos
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition flex items-center text-sm"
                  >
                    <Upload size={14} className="mr-1" />
                    Adicionar Arquivo
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                  />
                </div>
                
                {/* Display existing files from data */}
                {editedAction.data?.fileURLs && editedAction.data.fileURLs.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Arquivos Existentes:</p>
                    {editedAction.data.fileURLs.map((url: string, index: number) => (
                      <div key={`existing-${index}`} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                        <div className="flex items-center">
                          <FileText size={16} className="text-blue-500 mr-2" />
                          <span className="text-sm text-gray-700 truncate max-w-[200px]">
                            {url.split('/').pop() || `File ${index + 1}`}
                          </span>
                        </div>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Ver
                        </a>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Display newly added files */}
                {files.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Novos Arquivos:</p>
                    {files.map((file, index) => (
                      <div key={`new-${index}`} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                        <div className="flex items-center">
                          {getFileIcon(file)}
                          <span className="ml-2 text-sm text-gray-700 truncate max-w-[200px]">{file.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Upload progress */}
                {isUploading && uploadProgress > 0 && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-right">{uploadProgress}% concluído</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
        
      case 'text':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {editedAction.title || "Texto"}
            </label>
            <input
              type="text"
              value={editedAction.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
              placeholder="Digite o texto aqui..."
            />
          </div>
        );

      case 'long_text':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {editedAction.title || "Texto Longo"}
            </label>
            <textarea
              ref={textAreaRef}
              value={editedAction.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300 min-h-[150px]"
              placeholder="Digite o texto detalhado aqui..."
            />
          </div>
        );

      case 'file_upload':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {editedAction.title || "Upload de Arquivo"}
            </label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-3 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Clique para fazer upload</span> ou arraste e solte
                  </p>
                  <p className="text-xs text-gray-500">
                    SVG, PNG, JPG ou GIF (MAX. 10MB)
                  </p>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={handleFileSelect}
                  multiple
                />
              </label>
            </div>
            
            {/* File list */}
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                    <div className="flex items-center">
                      {getFileIcon(file)}
                      <span className="ml-2 text-sm text-gray-700 truncate max-w-[200px]">{file.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'date':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {editedAction.title || "Data"}
            </label>
            <input
              type="date"
              value={editedAction.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
            />
          </div>
        );
      
      case 'document':
        if (editedAction.data?.steps && Array.isArray(editedAction.data.steps)) {
          return (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-800">{editedAction.title}</h3>
              {editedAction.data.steps.map((step: any, index: number) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-700 mb-2">{step.title || `Etapa ${index + 1}`}</h4>
                  {step.type === 'text' ? (
                    <input
                      type="text"
                      value={step.value || ''}
                      onChange={(e) => {
                        const newSteps = [...editedAction.data!.steps];
                        newSteps[index].value = e.target.value;
                        handleChange('data', { ...editedAction.data, steps: newSteps });
                      }}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
                      placeholder={step.placeholder || "Digite aqui..."}
                    />
                  ) : step.type === 'long_text' ? (
                    <textarea
                      value={step.value || ''}
                      onChange={(e) => {
                        const newSteps = [...editedAction.data!.steps];
                        newSteps[index].value = e.target.value;
                        handleChange('data', { ...editedAction.data, steps: newSteps });
                      }}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300 min-h-[100px]"
                      placeholder={step.placeholder || "Digite o texto detalhado aqui..."}
                    />
                  ) : (
                    <p className="text-gray-600">{step.description}</p>
                  )}
                </div>
              ))}
            </div>
          );
        }
        return null;
      
      default:
        return null;
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 action-view-modal">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            {isEditMode ? (
              <>
                <Edit size={20} className="mr-2 text-blue-600" />
                Editar Ação
              </>
            ) : (
              <>
                <Check size={20} className="mr-2 text-green-600" />
                Completar Ação
              </>
            )}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-center">
            <AlertCircle size={18} className="mr-2 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}
        
        <div className="space-y-4">
          {!isEditMode && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
              <h3 className="font-medium text-blue-800 mb-1">{editedAction.title}</h3>
              {editedAction.description && (
                <p className="text-sm text-blue-700">{editedAction.description}</p>
              )}
            </div>
          )}
          
          {isEditMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título
              </label>
              <input
                type="text"
                value={editedAction.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
                placeholder="Título da ação"
              />
            </div>
          )}
          
          {/* Type selection - only visible in edit mode */}
          {isEditMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { type: 'text', label: 'Texto', icon: <Type size={16} /> },
                  { type: 'long_text', label: 'Texto Longo', icon: <FileText size={16} /> },
                  { type: 'info', label: 'Informação', icon: <Info size={16} /> },
                  { type: 'file_upload', label: 'Arquivo', icon: <Image size={16} /> },
                  { type: 'date', label: 'Data', icon: <Calendar size={16} /> }
                ].map(item => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => handleChange('type', item.type)}
                    className={`p-2 rounded-md flex flex-col items-center justify-center ${
                      editedAction.type === item.type 
                        ? 'bg-blue-100 text-blue-700 border-blue-300 border' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {item.icon}
                    <span className="text-xs mt-1">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Type-specific fields */}
          {renderTypeSpecificFields()}
          
          {/* Action buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isUploading}
              className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition flex items-center ${
                isUploading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  {isEditMode ? 'Salvar Alterações' : 'Completar Ação'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add missing Edit icon
const Edit = ({ size, className }: { size: number, className?: string }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  );
};
