import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../../components/Layout';
import { actionTemplateService } from '../../services/ActionTemplateService';
import { ActionTemplateSchema } from '../../types/firestore-schema';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Edit, 
  Trash2, 
  FileText, 
  Search, 
  Filter, 
  AlertTriangle, 
  RefreshCw, 
  Copy, 
  Eye, 
  ArrowUp, 
  ArrowDown,
  Info,
  CheckCircle,
  X
} from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { DeleteConfirmationModal } from '../../components/modals/DeleteConfirmationModal';
import useDebounce from '../../utils/useDebounce';

export const ActionTemplateManagement: React.FC = () => {
  const [templates, setTemplates] = useState<ActionTemplateSchema[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<ActionTemplateSchema[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ActionTemplateSchema | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<ActionTemplateSchema | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedTemplates = await actionTemplateService.fetchActionTemplates();
      setTemplates(fetchedTemplates);
      setFilteredTemplates(fetchedTemplates);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch action templates');
    } finally {
      setIsLoading(false);
      setIsRetrying(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    if (templates.length > 0) {
      let filtered = [...templates];
      
      // Apply search filter
      if (debouncedSearchTerm) {
        filtered = filtered.filter(template => 
          template.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          (template.description && template.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
        );
      }
      
      // Apply category filter
      if (categoryFilter !== 'all') {
        filtered = filtered.filter(template => 
          template.category === categoryFilter
        );
      }
      
      setFilteredTemplates(filtered);
    }
  }, [debouncedSearchTerm, templates, categoryFilter]);

  const handleDelete = async () => {
    if (!selectedTemplate) return;
    
    try {
      await actionTemplateService.deleteActionTemplate(selectedTemplate.id);
      setTemplates(prevTemplates => prevTemplates.filter(t => t.id !== selectedTemplate.id));
      setFilteredTemplates(prevTemplates => prevTemplates.filter(t => t.id !== selectedTemplate.id));
      setSuccessMessage(`Modelo "${selectedTemplate.title}" excluído com sucesso!`);
      
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error deleting template:', error);
      setError('Falha ao excluir o modelo. Por favor, tente novamente.');
    } finally {
      setIsDeleteModalOpen(false);
      setSelectedTemplate(null);
    }
  };

  const handleDuplicate = async (template: ActionTemplateSchema) => {
    try {
      await actionTemplateService.duplicateTemplate(template.id);
      fetchTemplates();
      setSuccessMessage(`Modelo "${template.title}" duplicado com sucesso!`);
      
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error duplicating template:', error);
      setError('Falha ao duplicar o modelo. Por favor, tente novamente.');
    }
  };

  const handleMoveTemplate = async (templateId: string, direction: 'up' | 'down') => {
    const currentIndex = templates.findIndex(t => t.id === templateId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= templates.length) return;
    
    const newTemplates = [...templates];
    const temp = newTemplates[currentIndex];
    newTemplates[currentIndex] = newTemplates[newIndex];
    newTemplates[newIndex] = temp;
    
    setTemplates(newTemplates);
    setFilteredTemplates(newTemplates);
    
    try {
      await actionTemplateService.updateTemplateOrder(newTemplates);
    } catch (error) {
      console.error('Error reordering templates:', error);
      setError('Falha ao reordenar os modelos. Por favor, tente novamente.');
      fetchTemplates(); // Revert to original order
    }
  };

  const handleRetry = () => {
    setIsRetrying(true);
    fetchTemplates();
  };

  const handlePreview = (template: ActionTemplateSchema) => {
    setPreviewTemplate(template);
    setIsPreviewOpen(true);
  };

  // Get unique categories from templates
  const categories = ['all', ...new Set(templates.map(t => t.category).filter(Boolean))];

  return (
    <Layout role="admin" isLoading={isLoading}>
      <div className="container mx-auto p-6">
        <PageHeader
          title="Gerenciamento de Modelos de Ação"
          description="Crie e gerencie modelos de ação para tarefas"
          icon={FileText}
          actions={
            <Link
              to="/admin/action-templates/create"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition shadow-sm"
            >
              <Plus className="mr-2" size={18} /> Criar Modelo
            </Link>
          }
        />

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
            <div className="flex items-center">
              <AlertTriangle className="mr-2 flex-shrink-0" size={20} />
              <p>{error}</p>
            </div>
            <button 
              onClick={handleRetry} 
              disabled={isRetrying}
              className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="mr-1 animate-spin" size={16} /> Tentando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-1" size={16} /> Tentar novamente
                </>
              )}
            </button>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-md shadow-sm flex items-center mb-6">
            <CheckCircle className="mr-2 flex-shrink-0" size={20} />
            <p>{successMessage}</p>
          </div>
        )}

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="text-gray-400" size={18} />
              </div>
              <input
                type="text"
                placeholder="Buscar modelos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
              />
            </div>

            {/* Category Filter */}
            <div className="relative w-full sm:w-auto">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="text-gray-400" size={18} />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full sm:w-auto pl-10 pr-8 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 appearance-none"
              >
                <option value="all">Todas as Categorias</option>
                {categories.filter(c => c !== 'all').map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {filteredTemplates.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center border border-gray-100">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-2" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhum modelo encontrado</h3>
            <p className="text-gray-500 mb-4">
              {debouncedSearchTerm || categoryFilter !== 'all'
                ? 'Tente ajustar os filtros para encontrar o que está procurando.'
                : 'Comece criando seu primeiro modelo de ação.'}
            </p>
            <Link
              to="/admin/action-templates/create"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus size={18} className="mr-2" /> Criar Modelo
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <div key={template.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-lg font-semibold text-gray-800 line-clamp-1">{template.title}</h2>
                    {template.category && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {template.category}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {template.description || `Modelo com ${template.elements.length} campos`}
                  </p>
                  
                  <div className="flex items-center text-sm text-gray-500">
                    <FileText size={16} className="mr-1 text-blue-500" />
                    <span>{template.elements.length} campos</span>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 flex justify-between items-center">
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleMoveTemplate(template.id, 'up')}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                      title="Mover para cima"
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      onClick={() => handleMoveTemplate(template.id, 'down')}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                      title="Mover para baixo"
                    >
                      <ArrowDown size={16} />
                    </button>
                  </div>
                  
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handlePreview(template)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                      title="Visualizar"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => handleDuplicate(template)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                      title="Duplicar"
                    >
                      <Copy size={18} />
                    </button>
                    <Link
                      to={`/admin/action-templates/edit/${template.id}`}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                      title="Editar"
                    >
                      <Edit size={18} />
                    </Link>
                    <button
                      onClick={() => {
                        setSelectedTemplate(template);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedTemplate(null);
          }}
          onConfirm={handleDelete}
          itemName={selectedTemplate?.title || "este modelo"}
          warningMessage="Esta ação não poderá ser desfeita. Todas as tarefas que usam este modelo não serão afetadas."
        />

        {/* Template Preview Modal */}
        {isPreviewOpen && previewTemplate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                  <Eye className="mr-2 text-blue-600" />
                  Visualização do Modelo
                </h2>
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{previewTemplate.title}</h3>
                  {previewTemplate.description && (
                    <p className="text-gray-600 mb-4">{previewTemplate.description}</p>
                  )}
                  <div className="flex items-center text-sm text-gray-500 mb-4">
                    <Info size={16} className="mr-1 text-blue-500" />
                    <span>Este é um preview de como o modelo aparecerá para o usuário ao completar uma ação.</span>
                  </div>
                </div>
                
                <div className="space-y-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  {previewTemplate.elements.map((element, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                      <h4 className="font-medium text-gray-800 mb-2">{element.label}</h4>
                      
                      {element.description && (
                        <p className="text-sm text-gray-600 mb-3">{element.description}</p>
                      )}
                      
                      {element.type === 'text' && (
                        <input
                          type="text"
                          disabled
                          placeholder={element.placeholder || "Digite aqui..."}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-400"
                        />
                      )}
                      
                      {element.type === 'long_text' && (
                        <textarea
                          disabled
                          placeholder={element.placeholder || "Digite aqui..."}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-400 h-24"
                        />
                      )}
                      
                      {element.type === 'date' && (
                        <input
                          type="date"
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-400"
                        />
                      )}
                      
                      {element.type === 'select' && (
                        <select
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-400"
                        >
                          <option value="">Selecione uma opção</option>
                          {element.options?.map((option, i) => (
                            <option key={i} value={option}>{option}</option>
                          ))}
                        </select>
                      )}
                      
                      {element.type === 'checkbox' && (
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            disabled
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                          />
                          <label className="ml-2 block text-sm text-gray-700">{element.label}</label>
                        </div>
                      )}
                      
                      {element.type === 'file_upload' && (
                        <div className="border border-dashed border-gray-300 rounded-md p-4 text-center bg-gray-50">
                          <p className="text-sm text-gray-500">Clique para fazer upload ou arraste arquivos</p>
                        </div>
                      )}
                      
                      {element.type === 'info' && (
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                          <p className="text-sm text-blue-700">{element.description || "Informação importante"}</p>
                        </div>
                      )}
                      
                      {element.required && (
                        <div className="mt-1 flex items-center text-xs text-red-500">
                          <Info size={12} className="mr-1" />
                          Campo obrigatório
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
