// src/pages/admin/CreateActionTemplate.tsx
import React, { useState, useEffect, useCallback } from 'react'
import { Layout } from '../../components/Layout'
import { actionTemplateService } from '../../services/ActionTemplateService'
import { ActionTemplateSchema, TaskAction } from '../../types/firestore-schema'
import { 
  PlusCircle, Save, XCircle, Plus, Trash2, ChevronLeft, ChevronRight, 
  File, FileText, Type, List, Settings, ArrowUp, ArrowDown, FileEdit, 
  Info, Calendar, Upload, Check, AlertCircle, Eye
} from 'lucide-react'
import { DeleteConfirmationModal } from '../../components/modals/DeleteConfirmationModal'
import { deepCopy } from '../../utils/helpers'

// Helper function to get appropriate icon for action type
const getActionIcon = (type: TaskAction['type']) => {
  switch (type) {
    case 'text': return <Type size={16} />;
    case 'long_text': return <FileText size={16} />;
    case 'file_upload': return <Upload size={16} />;
    case 'date': return <Calendar size={16} />;
    case 'info': return <Info size={16} />;
    default: return null;
  }
};

// Component for managing templates modal
const ManageTemplatesModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  templates: ActionTemplateSchema[];
  onDelete: (id: string) => Promise<void>;
  onReorder: (templates: ActionTemplateSchema[]) => void;
}> = ({ isOpen, onClose, templates, onDelete, onReorder }) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [localTemplates, setLocalTemplates] = useState<ActionTemplateSchema[]>(templates);

  useEffect(() => {
    setLocalTemplates(templates);
  }, [templates]);

  const moveTemplate = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= localTemplates.length) return;
    
    const updatedTemplates = [...localTemplates];
    const [movedTemplate] = updatedTemplates.splice(fromIndex, 1);
    updatedTemplates.splice(toIndex, 0, movedTemplate);
    setLocalTemplates(updatedTemplates);
    onReorder(updatedTemplates);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-lg w-96 max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Gerenciar Modelos</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <XCircle size={24} />
            </button>
          </div>
          
          {templates.length === 0 ? (
            <p className="text-center text-gray-500 py-4">Nenhum modelo encontrado</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {localTemplates.map((template, index) => (
                <li key={template.id} className="py-3 flex items-center justify-between">
                  <span className="font-medium text-gray-700 truncate max-w-[180px]">
                    {template.title}
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => moveTemplate(index, index - 1)}
                      disabled={index === 0}
                      className="text-gray-500 hover:text-blue-600 disabled:opacity-50 p-1 rounded hover:bg-blue-50"
                      title="Mover para cima"
                    >
                      <ArrowUp size={18} />
                    </button>
                    <button
                      onClick={() => moveTemplate(index, index + 1)}
                      disabled={index === localTemplates.length - 1}
                      className="text-gray-500 hover:text-blue-600 disabled:opacity-50 p-1 rounded hover:bg-blue-50"
                      title="Mover para baixo"
                    >
                      <ArrowDown size={18} />
                    </button>
                    <button
                      onClick={() => {
                        setTemplateToDelete(template.id);
                        setIsDeleteModalOpen(true);
                      }}
                      className="text-gray-500 hover:text-red-600 p-1 rounded hover:bg-red-50"
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTemplateToDelete(null);
        }}
        onConfirm={async () => {
          if (templateToDelete) {
            await onDelete(templateToDelete);
            setIsDeleteModalOpen(false);
            setTemplateToDelete(null);
          }
        }}
        itemName={
          templateToDelete
            ? templates.find((t) => t.id === templateToDelete)?.title || "este modelo"
            : "este modelo"
        }
        warningMessage="Esta ação não poderá ser desfeita."
      />
    </>
  );
};

// Preview component to show how the action will look to users
const ActionPreview: React.FC<{
  action: TaskAction;
}> = ({ action }) => {
  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-2">
      <h4 className="font-medium text-gray-700 mb-2">Visualização para o usuário:</h4>
      <div className="bg-white p-3 rounded border border-gray-300">
        <div className="font-medium text-gray-800 mb-1">{action.title}</div>
        
        {action.type === 'text' && (
          <input 
            type="text" 
            placeholder="Campo de texto curto" 
            disabled 
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
          />
        )}
        
        {action.type === 'long_text' && (
          <textarea 
            placeholder="Campo de texto longo" 
            disabled 
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 h-20"
          />
        )}
        
        {action.type === 'date' && (
          <input 
            type="date" 
            disabled 
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
          />
        )}
        
        {action.type === 'file_upload' && (
          <div className="border border-dashed border-gray-300 rounded-md p-4 text-center bg-gray-50">
            <Upload className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-1 text-sm text-gray-500">Clique para fazer upload ou arraste arquivos</p>
          </div>
        )}
        
        {action.type === 'info' && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
            <h5 className="font-medium text-blue-700">{action.infoTitle || 'Título da Informação'}</h5>
            <p className="text-blue-600 text-sm mt-1">{action.infoDescription || 'Descrição da informação importante'}</p>
            {action.hasAttachments && (
              <div className="mt-2 p-2 bg-white rounded border border-blue-200">
                <p className="text-sm text-blue-600 flex items-center">
                  <Upload size={14} className="mr-1" /> Anexos serão exibidos aqui
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
export const CreateActionTemplate: React.FC = () => {
  const [title, setTitle] = useState('')
  const [numSteps, setNumSteps] = useState(1)
  const [currentStep, setCurrentStep] = useState(1)
  const [elementsByStep, setElementsByStep] = useState<{ [step: number]: TaskAction[] }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [templates, setTemplates] = useState<ActionTemplateSchema[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [saveOption, setSaveOption] = useState<'replace' | 'new' | null>(null);
  const [existingTemplateId, setExistingTemplateId] = useState<string | null>(null);
  const [previewAction, setPreviewAction] = useState<TaskAction | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      const fetchedTemplates = await actionTemplateService.fetchActionTemplates();
      setTemplates(fetchedTemplates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      setError("Falha ao carregar modelos. Por favor, tente novamente.");
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    const loadTemplate = async () => {
      if (selectedTemplate) {
        try {
          const templateData = await actionTemplateService.getActionTemplateById(selectedTemplate);
          if (templateData) {
            setTitle(templateData.title);
            setExistingTemplateId(templateData.id);

            const newElementsByStep: { [step: number]: TaskAction[] } = {};
            let currentStep = 1;
            let currentStepElements: TaskAction[] = [];

            // Group elements by step
            for (const element of templateData.elements) {
              currentStepElements.push(element);
              if (element.type === 'approval') {
                newElementsByStep[currentStep] = currentStepElements;
                currentStep++;
                currentStepElements = [];
              }
            }
            
            // Add remaining elements to the last step
            if (currentStepElements.length > 0) {
              newElementsByStep[currentStep] = currentStepElements;
            }

            setElementsByStep(newElementsByStep);
            setNumSteps(Object.keys(newElementsByStep).length);
            setCurrentStep(1);
          }
        } catch (error) {
          console.error("Error loading template:", error);
          setError("Falha ao carregar o modelo selecionado.");
        }
      } else {
        // Reset if no template is selected
        setTitle('');
        setElementsByStep({});
        setNumSteps(1);
        setCurrentStep(1);
        setExistingTemplateId(null);
      }
    };

    loadTemplate();
  }, [selectedTemplate]);

  const handleAddElement = (type: TaskAction['type']) => {
    setElementsByStep(prev => {
      const currentElements = prev[currentStep] || [];
      let newElement: TaskAction;

      if (type === 'info') {
        newElement = {
          id: Date.now().toString(),
          type,
          title: 'Informação Importante',
          completed: false,
          description: 'Descrição da informação',
          infoTitle: 'Título da Informação',
          infoDescription: 'Descrição detalhada da informação importante',
          hasAttachments: false,
          data: {}
        };
      } else {
        newElement = {
          id: Date.now().toString(),
          type,
          title: type === 'text' ? 'Campo de Texto' : 
                 type === 'long_text' ? 'Campo de Texto Longo' : 
                 type === 'file_upload' ? 'Upload de Arquivo' : 
                 type === 'date' ? 'Data' : 'Nova Ação',
          completed: false,
          description: 'Descrição do campo',
        };
      }
      
      // Set preview action
      setPreviewAction(newElement);
      
      return {
        ...prev,
        [currentStep]: [...currentElements, newElement]
      };
    });
  };

  const handleRemoveElement = (id: string) => {
    setElementsByStep(prev => {
      const currentElements = prev[currentStep] || [];
      const updatedElements = currentElements.filter(element => element.id !== id);
      
      // Clear preview if the removed element was being previewed
      if (previewAction && previewAction.id === id) {
        setPreviewAction(null);
      }
      
      return {
        ...prev,
        [currentStep]: updatedElements
      };
    });
  };

  const handleElementChange = (id: string, field: keyof TaskAction, value: any) => {
    setElementsByStep(prev => {
      const currentElements = prev[currentStep] || [];
      const updatedElements = currentElements.map(element => {
        if (element.id === id) {
          const updatedElement = { ...element, [field]: value };
          
          // Update preview if this element is being previewed
          if (previewAction && previewAction.id === id) {
            setPreviewAction(updatedElement);
          }
          
          return updatedElement;
        }
        return element;
      });
      
      return {
        ...prev,
        [currentStep]: updatedElements
      };
    });
  };

  const handleNumStepsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setNumSteps(isNaN(value) || value < 1 ? 1 : value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const allElements: TaskAction[] = [];
      for (let i = 1; i <= numSteps; i++) {
        if (elementsByStep[i]) {
          // Process elements for each step
          const stepElements = elementsByStep[i].map(element => {
            // Add completed property
            const completeElement = {
              ...element,
              completed: false
            };
            
            if (element.type === 'info') {
              const { completed, completedAt, completedBy, attachments, ...infoElement } = completeElement;
              return { ...infoElement, completed: false };
            }
            
            const { data, ...rest } = completeElement;
            return data === undefined ? rest : completeElement;
          });
          
          allElements.push(...stepElements);
        }
      }

      const newTemplate: Omit<ActionTemplateSchema, 'id'> = {
        title,
        type: 'custom',
        elements: allElements,
        order: Date.now()
      };

      // Check if replacing or creating new
      if (saveOption === 'replace' && existingTemplateId) {
        await actionTemplateService.updateActionTemplate(existingTemplateId, newTemplate);
        setSuccess(true);
      } else {
        // Check for title uniqueness if creating new
        const existingTemplates = await actionTemplateService.fetchActionTemplates();
        if (existingTemplates.some(t => t.title === title)) {
          setError("Já existe um modelo com este título. Por favor, escolha um título diferente.");
          setIsLoading(false);
          return;
        }

        await actionTemplateService.createActionTemplate(newTemplate);
        setSuccess(true);
        
        // Reset form only on successful creation
        setTitle('');
        setElementsByStep({});
        setNumSteps(1);
        setCurrentStep(1);
        setSelectedTemplate('');
        setPreviewAction(null);
      }

      await fetchTemplates(); // Refresh templates list

    } catch (err: any) {
      setError(err.message || 'Falha ao criar modelo de ação');
    } finally {
      setIsLoading(false);
      setSaveOption(null);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await actionTemplateService.deleteActionTemplate(templateId);
      await fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      setError("Falha ao excluir o modelo.");
    }
  };

  const handleReorderTemplates = async (newTemplatesOrder: ActionTemplateSchema[]) => {
    try {
      setTemplates(newTemplatesOrder);
      await actionTemplateService.updateTemplateOrder(newTemplatesOrder);
    } catch (error) {
      console.error("Error reordering templates:", error);
      setError("Falha ao reordenar modelos.");
    }
  };

  // Ensure steps are properly initialized when numSteps changes
  useEffect(() => {
    setElementsByStep(prev => {
      const newElements = { ...prev };
      for (let i = 1; i <= numSteps; i++) {
        if (!newElements[i]) {
          newElements[i] = [];
        }
      }
      
      // Remove steps that exceed the new numSteps
      Object.keys(newElements).forEach(key => {
        const stepNum = parseInt(key, 10);
        if (stepNum > numSteps) {
          delete newElements[stepNum];
        }
      });
      
      return newElements;
    });

    if (currentStep > numSteps) {
      setCurrentStep(numSteps);
    }
  }, [numSteps]);

  const validateForm = () => {
    if (!title.trim()) {
      setError("O título do modelo é obrigatório");
      return false;
    }
    
    // Check if there are any elements
    let hasElements = false;
    for (let i = 1; i <= numSteps; i++) {
      if (elementsByStep[i] && elementsByStep[i].length > 0) {
        hasElements = true;
        break;
      }
    }
    
    if (!hasElements) {
      setError("Adicione pelo menos uma ação ao modelo");
      return false;
    }
    
    // Validate each element
    for (let i = 1; i <= numSteps; i++) {
      const stepElements = elementsByStep[i] || [];
      for (const element of stepElements) {
        if (!element.title.trim()) {
          setError(`Etapa ${i}: O título da ação é obrigatório`);
          return false;
        }
        
        if (element.type === 'info') {
          if (!element.infoTitle?.trim()) {
            setError(`Etapa ${i}: O título da informação é obrigatório`);
            return false;
          }
          if (!element.infoDescription?.trim()) {
            setError(`Etapa ${i}: A descrição da informação é obrigatória`);
            return false;
          }
        } else if (!element.description?.trim()) {
          setError(`Etapa ${i}: A descrição da ação é obrigatória`);
          return false;
        }
      }
    }
    
    return true;
  };

  return (
    <Layout role="admin">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center">
            <PlusCircle className="mr-3 text-blue-600" />
            Criar Modelo de Ação
          </h1>
          <div className="flex space-x-2">
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione um Modelo</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.title}
                </option>
              ))}
            </select>
            <button
              onClick={() => setIsManageModalOpen(true)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center"
              title="Gerenciar Modelos"
            >
              <Settings size={20} className="mr-1" /> Gerenciar
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-center">
            <AlertCircle className="mr-2 flex-shrink-0" size={20} />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 flex items-center">
            <Check className="mr-2 flex-shrink-0" size={20} />
            <p>Modelo de ação salvo com sucesso!</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
              <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Título do Modelo
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Checklist de Inspeção de Segurança"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="numSteps" className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Etapas
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    id="numSteps"
                    value={numSteps}
                    onChange={handleNumStepsChange}
                    min="1"
                    max="10"
                    className="w-20 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                  />
                  <span className="ml-2 text-gray-500 text-sm">
                    Divida seu modelo em etapas lógicas
                  </span>
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${(currentStep / numSteps) * 100}%` }}
                ></div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Etapa {currentStep} de {numSteps}
                  </h2>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                      disabled={currentStep === 1}
                      className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(Math.min(numSteps, currentStep + 1))}
                      disabled={currentStep === numSteps}
                      className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4 mt-4">
                  {(elementsByStep[currentStep] || []).map((element, index) => (
                    <div 
                      key={element.id} 
                      className={`border rounded-lg p-4 transition-all ${
                        previewAction?.id === element.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center">
                          <div className="p-2 bg-gray-100 rounded-full mr-3">
                            {getActionIcon(element.type)}
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 uppercase tracking-wider">
                              {element.type === 'text' ? 'Texto Curto' : 
                               element.type === 'long_text' ? 'Texto Longo' : 
                               element.type === 'file_upload' ? 'Upload de Arquivo' : 
                               element.type === 'date' ? 'Data' : 
                               element.type === 'info' ? 'Informação' : 'Ação'}
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => setPreviewAction(element)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Visualizar"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveElement(element.id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                            title="Remover"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Título (visível para o usuário)
                          </label>
                          <input
                            type="text"
                            value={element.title}
                            onChange={(e) => handleElementChange(element.id, 'title', e.target.value)}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
                            placeholder="Título da ação"
                          />
                        </div>

                        {element.type !== 'info' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Descrição/Instruções
                            </label>
                            <textarea
                              value={element.description || ''}
                              onChange={(e) => handleElementChange(element.id, 'description', e.target.value)}
                              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300 min-h-[80px]"
                              placeholder="Instruções para o usuário"
                            />
                          </div>
                        )}

                        {element.type === 'info' && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Título da Informação
                              </label>
                              <input
                                type="text"
                                value={element.infoTitle || ''}
                                onChange={(e) => handleElementChange(element.id, 'infoTitle', e.target.value)}
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
                                placeholder="Título da informação importante"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Conteúdo da Informação
                              </label>
                              <textarea
                                value={element.infoDescription || ''}
                                onChange={(e) => handleElementChange(element.id, 'infoDescription', e.target.value)}
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300 min-h-[100px]"
                                placeholder="Descreva as informações importantes aqui..."
                              />
                            </div>
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id={`hasAttachments-${element.id}`}
                                checked={element.hasAttachments || false}
                                onChange={(e) => handleElementChange(element.id, 'hasAttachments', e.target.checked)}
                                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <label htmlFor={`hasAttachments-${element.id}`} className="text-sm text-gray-700">
                                Permitir anexos
                              </label>
                            </div>
                          </>
                        )}
                        
                        {/* Preview button */}
                        {previewAction?.id === element.id && <ActionPreview action={element} />}
                      </div>
                    </div>
                  ))}

                  {(elementsByStep[currentStep] || []).length === 0 && (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                      <p className="text-gray-500 mb-4">Nenhuma ação adicionada nesta etapa</p>
                      <p className="text-sm text-gray-400">Adicione ações usando os botões abaixo</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleAddElement('text')}
                  className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center"
                >
                  <Type size={16} className="mr-1" /> Texto Curto
                </button>
                <button
                  type="button"
                  onClick={() => handleAddElement('long_text')}
                  className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center"
                >
                  <FileText size={16} className="mr-1" /> Texto Longo
                </button>
                <button
                  type="button"
                  onClick={() => handleAddElement('file_upload')}
                  className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center"
                >
                  <Upload size={16} className="mr-1" /> Upload de Arquivo
                </button>
                <button
                  type="button"
                  onClick={() => handleAddElement('date')}
                  className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center"
                >
                  <Calendar size={16} className="mr-1" /> Data
                </button>
                <button
                  type="button"
                  onClick={() => handleAddElement('info')}
                  className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center"
                >
                  <Info size={16} className="mr-1" /> Informação
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-lg shadow-md sticky top-6">
              <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Resumo do Modelo</h2>
              
              <div className="mb-4">
                <h3 className="font-medium text-gray-700 mb-2">Título</h3>
                <p className="text-gray-800 bg-gray-50 p-2 rounded">
                  {title || 'Sem título'}
                </p>
              </div>
              
              <div className="mb-4">
                <h3 className="font-medium text-gray-700 mb-2">Etapas</h3>
                <div className="space-y-2">
                  {Array.from({ length: numSteps }, (_, i) => i + 1).map(step => {
                    const stepElements = elementsByStep[step] || [];
                    return (
                      <div 
                        key={step} 
                        className={`p-2 rounded ${currentStep === step ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Etapa {step}</span>
                          <span className="text-sm text-gray-500">{stepElements.length} ações</span>
                        </div>
                        {stepElements.length > 0 && (
                          <ul className="mt-1 text-sm text-gray-600">
                            {stepElements.map((element, idx) => (
                              <li key={idx} className="flex items-center">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                <span className="truncate">{element.title}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="mt-6 space-y-3">
                {existingTemplateId ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setSaveOption('replace')}
                      className="w-full px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center justify-center"
                    >
                      <Save className="mr-2" /> Substituir Modelo Existente
                    </button>
                    <button
                      type="button"
                      onClick={() => setSaveOption('new')}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
                    >
                      <Plus className="mr-2" /> Salvar como Novo Modelo
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2" /> Salvar Modelo
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ManageTemplatesModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        templates={templates}
        onDelete={handleDeleteTemplate}
        onReorder={handleReorderTemplates}
      />

      {/* Confirmation Modal for Save Option */}
      {saveOption && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
            <h3 className="text-lg font-semibold mb-4">Confirmar Ação</h3>
            <p className="mb-6 text-gray-700">
              {saveOption === 'replace'
                ? 'Tem certeza que deseja substituir o modelo existente? Esta ação não pode ser desfeita.'
                : 'Criar um novo modelo com este título? Se já existir um modelo com o mesmo nome, você será notificado.'
              }
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setSaveOption(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                className={`px-4 py-2 text-white rounded-lg ${
                  saveOption === 'replace' 
                    ? 'bg-yellow-500 hover:bg-yellow-600' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {saveOption === 'replace' ? 'Sim, Substituir' : 'Sim, Criar Novo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
 );
}
