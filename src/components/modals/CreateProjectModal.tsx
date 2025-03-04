import React, { useState, useEffect } from 'react'
import {
  Briefcase,
  X,
  AlertTriangle,
  Loader2
} from 'lucide-react'
import { projectService } from '../../services/ProjectService'
import { ProjectSchema } from '../../types/firestore-schema'
import { userManagementService } from '../../services/UserManagementService' // Corrected
import { useAuth } from '../../context/AuthContext' // Import useAuth

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onProjectCreated: (project: ProjectSchema) => void
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onProjectCreated
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    status: 'planning' as ProjectSchema['status'],
    managers: [] as string[]
  })
  const [managers, setManagers] = useState<{ id: string, name: string }[]>([])
  const [managersLoading, setManagersLoading] = useState(false);
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})
  const { currentUser } = useAuth(); // Get current user for createdBy field

  // Fetch managers
  useEffect(() => {
    const fetchManagers = async () => {
      if (!isOpen) return; // Don't fetch if modal is closed
      
      setManagersLoading(true);
      setError(null);
      try {
        // Explicitly specify the role filter.
        const fetchedManagers = await userManagementService.fetchUsers({ role: 'manager' });

        // Map the results to the expected { id, name } format.
        const managerList = fetchedManagers.data.map(user => ({
          id: user.id,
          name: user.name
        }));
        setManagers(managerList);

      } catch (err: any) {
        console.error('Error fetching managers:', err);  // Detailed error logging
        setError(err.message || 'Failed to load managers. Please try again.');
      } finally {
        setManagersLoading(false);
      }
    };

    if (isOpen) {
      fetchManagers();
    }
  }, [isOpen]);


  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        description: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        status: 'planning',
        managers: []
      })
      setStep(1)
      setError(null)
      setFormErrors({})
    }
  }, [isOpen])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  // Validations
  const validateStep1 = () => {
    const errors: { [key: string]: string } = {}
    if (!formData.name.trim()) errors.name = 'Nome do projeto é obrigatório'
    if (!formData.description.trim()) errors.description = 'Descrição é obrigatória'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateStep2 = () => {
    const errors: { [key: string]: string } = {}
    if (!formData.startDate) errors.startDate = 'Data de início é obrigatória'
    if (formData.managers.length === 0) errors.managers = 'Pelo menos um gestor é obrigatório'
    
    // Validate that end date is after start date if provided
    if (formData.endDate && new Date(formData.endDate) <= new Date(formData.startDate)) {
      errors.endDate = 'A data de término deve ser posterior à data de início'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateStep2()) return // Validate the final step

    setLoading(true)
    setError(null)

    try {
      // Prepare project data with proper handling of empty endDate
      const projectData: Omit<ProjectSchema, 'id' | 'createdAt' | 'updatedAt'> = {
        name: formData.name,
        description: formData.description,
        startDate: new Date(formData.startDate).getTime(),
        status: formData.status,
        managers: formData.managers,
        messages: [],
        commentTabs: [],
        createdBy: currentUser?.uid || '' // Add createdBy field with current user ID
      }

      // Only add endDate if it has a value
      if (formData.endDate) {
        projectData.endDate = new Date(formData.endDate).getTime()
      } else {
        projectData.endDate = null; // Set to null if empty
      }

      const newProject = await projectService.createProject(projectData)

      onProjectCreated(newProject)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Erro ao criar projeto. Por favor, tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold flex items-center">
            <Briefcase className="mr-2 text-blue-600" />
            Criar Novo Projeto (Etapa {step}/2)
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Display general error */}
          {error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative flex items-center">
              <AlertTriangle className="mr-2" />
              {error}
            </div>
          ) : null}

          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Projeto
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.name ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`}
                />
                {formErrors.name && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 h-24 ${formErrors.description ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`}
                />
                {formErrors.description && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.description}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (validateStep1()) {
                    setStep(2)
                  }
                }}
                className="w-full py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition"
              >
                Próximo
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data de Início
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.startDate ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`}
                  />
                  {formErrors.startDate && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.startDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data de Término (opcional)
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.endDate ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`}
                  />
                  {formErrors.endDate && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.endDate}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="planning">Planejamento</option>
                  <option value="active">Ativo</option>
                  <option value="paused">Pausado</option>
                  <option value="completed">Concluído</option>
                  <option value="cancelled">Cancelado</option>
                  <option value="archived">Arquivado</option> {/* Added archived option */}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gestores
                </label>
                {managersLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="animate-spin text-blue-600 mr-2" size={20} />
                    <span className="text-gray-600">Carregando gestores...</span>
                  </div>
                ) : (
                  <>
                    <select
                      multiple
                      name="managers"
                      value={formData.managers}
                      onChange={(e) => {
                        const selectedManagers = Array.from(e.target.selectedOptions, option => option.value)
                        setFormData(prev => ({
                          ...prev,
                          managers: selectedManagers
                        }))
                        
                        // Clear error when managers are selected
                        if (formErrors.managers && selectedManagers.length > 0) {
                          setFormErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.managers;
                            return newErrors;
                          });
                        }
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 h-24 ${formErrors.managers ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}`}
                    >
                      {managers.length > 0 ? (
                        managers.map(manager => (
                          <option key={manager.id} value={manager.id}>
                            {manager.name}
                          </option>
                        ))
                      ) : (
                        <option disabled>Nenhum gestor encontrado</option>
                      )}
                    </select>
                    {managers.length === 0 && !managersLoading && (
                      <p className="text-yellow-600 text-xs mt-1">
                        Nenhum gestor disponível. Adicione gestores no sistema primeiro.
                      </p>
                    )}
                    {formErrors.managers && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.managers}</p>
                    )}
                    <p className="text-gray-500 text-xs mt-1">
                      Segure Ctrl (ou Cmd no Mac) para selecionar múltiplos gestores.
                    </p>
                  </>
                )}
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={loading || managersLoading}
                  className={`w-full py-2 rounded-lg text-white transition flex items-center justify-center
                    ${loading || managersLoading
                      ? 'bg-blue-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={20} />
                      Criando...
                    </>
                  ) : (
                    'Criar Projeto'
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
