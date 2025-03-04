import React from 'react';
import { TaskAction } from '../types/firestore-schema';
import { 
  Download, 
  FileText, 
  Calendar, 
  User, 
  Clock, 
  CheckCircle, 
  X,
  Printer,
  Info,
  File,
  Image,
  Video,
  Music
} from 'lucide-react';
import { AttachmentDisplay } from './AttachmentDisplay';
import { getDefaultProfileImage } from '../utils/user';

interface ActionDocumentProps {
  action: TaskAction;
  onClose: () => void;
  taskTitle: string;
  projectName: string;
  userName?: string;
  userPhotoURL?: string;
  isOpen: boolean;
}

export const ActionDocument: React.FC<ActionDocumentProps> = ({
  action,
  onClose,
  taskTitle,
  projectName,
  userName = 'Usuário',
  userPhotoURL,
  isOpen
}) => {
  if (!isOpen) return null;

  const formatDate = (timestamp?: number | null) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Determine document type based on action type
  const getDocumentTitle = () => {
    switch (action.type) {
      case 'info':
        return 'Registro de Informações';
      case 'text':
      case 'long_text':
        return 'Registro de Texto';
      case 'file_upload':
        return 'Registro de Arquivos';
      case 'date':
        return 'Registro de Data';
      case 'document':
        return 'Documento de Processo';
      default:
        return 'Documento de Ação';
    }
  };

  // Get appropriate icon for attachment type
  const getAttachmentIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image size={20} className="text-blue-500" />;
      case 'video':
        return <Video size={20} className="text-red-500" />;
      case 'audio':
        return <Music size={20} className="text-purple-500" />;
      case 'document':
        return <FileText size={20} className="text-orange-500" />;
      default:
        return <File size={20} className="text-gray-500" />;
    }
  };

  // Render document content based on action type
  const renderActionContent = () => {
    if (action.type === 'info') {
      return (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <h5 className="font-semibold text-blue-800 mb-2">{action.infoTitle}</h5>
          <p className="text-gray-700 whitespace-pre-wrap">{action.infoDescription}</p>
        </div>
      );
    }

    if (action.type === 'document' && action.data?.steps) {
      return (
        <div className="space-y-4">
          {action.data.steps.map((step: any, index: number) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h5 className="font-semibold text-gray-800 mb-2">{step.label || step.title}</h5>
              {step.type === 'text' || step.type === 'long_text' ? (
                <div className="bg-white p-3 border border-gray-300 rounded-md">
                  <p className="text-gray-700">{step.value || 'Não preenchido'}</p>
                </div>
              ) : step.type === 'date' ? (
                <div className="bg-white p-3 border border-gray-300 rounded-md flex items-center">
                  <Calendar size={16} className="text-blue-500 mr-2" />
                  <p className="text-gray-700">{step.value || 'Data não selecionada'}</p>
                </div>
              ) : step.type === 'select' ? (
                <div className="bg-white p-3 border border-gray-300 rounded-md">
                  <p className="text-gray-700">{step.value || 'Opção não selecionada'}</p>
                </div>
              ) : step.type === 'checkbox' ? (
                <div className="flex items-center">
                  <div className={`w-5 h-5 border rounded flex items-center justify-center ${step.value ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'}`}>
                    {step.value && <CheckCircle size={14} className="text-white" />}
                  </div>
                  <span className="ml-2 text-gray-700">{step.label}</span>
                </div>
              ) : (
                <p className="text-gray-600">{step.description}</p>
              )}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-gray-700 whitespace-pre-wrap">{action.description}</p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:p-0">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto print:shadow-none print:max-w-none print:max-h-none">
        {/* Document Header - Not printed */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 sticky top-0 bg-white z-10 print:hidden">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <FileText className="mr-2 text-blue-600" />
            {getDocumentTitle()}
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={handlePrint}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
              title="Imprimir"
            >
              <Printer size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
              title="Fechar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Document Content */}
        <div className="p-6 print:p-4">
          {/* Document Title - For printing */}
          <div className="print:block hidden mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900">{getDocumentTitle()}</h1>
            <div className="w-full border-b-2 border-gray-300 mt-2"></div>
          </div>

          {/* Document Header */}
          <div className="mb-8 border-b pb-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{taskTitle}</h3>
                <p className="text-gray-600">Projeto: {projectName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Documento #{action.id.slice(-6)}</p>
                <p className="text-sm text-gray-500">Data: {formatDate(Date.now())}</p>
              </div>
            </div>
          </div>

          {/* Action Information */}
          <div className="mb-6">
            <h4 className="text-md font-semibold text-gray-700 mb-2 border-b pb-2 flex items-center">
              <Info size={18} className="text-blue-500 mr-2" />
              Detalhes da Ação
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">Título da Ação</p>
                <p className="font-medium">{action.title}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium flex items-center">
                  {action.completed ? (
                    <>
                      <CheckCircle size={16} className="text-green-500 mr-1" />
                      Concluído
                    </>
                  ) : (
                    <>
                      <Clock size={16} className="text-yellow-500 mr-1" />
                      Pendente
                    </>
                  )}
                </p>
              </div>
            </div>

            {action.completed && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Concluído em</p>
                  <p className="font-medium">{formatDate(action.completedAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Concluído por</p>
                  <div className="flex items-center">
                    <img 
                      src={userPhotoURL || getDefaultProfileImage(userName)}
                      alt={userName}
                      className="w-6 h-6 rounded-full mr-2"
                    />
                    <span>{userName}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Content */}
          <div className="mb-6">
            <h4 className="text-md font-semibold text-gray-700 mb-2 border-b pb-2 flex items-center">
              <FileText size={18} className="text-blue-500 mr-2" />
              Conteúdo
            </h4>
            
            {renderActionContent()}
          </div>

          {/* Attachments Section */}
          {((action.type === 'info' && action.hasAttachments && action.data?.fileURLs?.length) || 
             action.type === 'file_upload' || 
             action.attachments?.length) && (
            <div className="mb-6">
              <h4 className="text-md font-semibold text-gray-700 mb-2 border-b pb-2 flex items-center">
                <Paperclip size={18} className="text-blue-500 mr-2" />
                Anexos
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {action.data?.fileURLs?.map((url: string, index: number) => (
                  <div key={index} className="flex items-center p-2 bg-gray-50 rounded-lg border border-gray-200">
                    <AttachmentDisplay 
                      attachment={{
                        id: `file-${index}`,
                        name: url.split('/').pop() || `Arquivo ${index + 1}`,
                        url: url,
                        type: 'document'
                      }}
                    />
                  </div>
                ))}
                
                {action.attachments?.map((attachment, index) => (
                  <div key={index} className="flex items-center p-2 bg-gray-50 rounded-lg border border-gray-200">
                    <AttachmentDisplay attachment={attachment} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signature Section */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex justify-between">
              <div className="w-1/3">
                <div className="border-t border-gray-400 pt-2 mt-16">
                  <p className="text-center text-sm">Responsável pela Tarefa</p>
                </div>
              </div>
              
              <div className="w-1/3">
                <div className="border-t border-gray-400 pt-2 mt-16">
                  <p className="text-center text-sm">Gestor do Projeto</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
            <p>Documento gerado pelo sistema Vem Simbora em {formatDate(Date.now())}</p>
            <p>ID da Ação: {action.id}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
