// src/pages/admin/ProjectManagement.tsx
import React, { useState, useEffect, useCallback } from 'react'
import { Layout } from '../../components/Layout'
import {
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  Archive,
  FolderOpen,
  Calendar,
  Users,
  Filter,
  AlertTriangle,
  RefreshCw,
  Briefcase,
  Clock,
  BarChart2,
  Star,
  Zap,
  Bookmark
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { ProjectSchema } from '../../types/firestore-schema'
import { projectService } from '../../services/ProjectService'
import { taskService } from '../../services/TaskService'
import { CreateProjectModal } from '../../components/modals/CreateProjectModal'
import { EditProjectModal } from '../../components/modals/EditProjectModal'
import { DeleteConfirmationModal } from '../../components/modals/DeleteConfirmationModal'
import useDebounce from '../../utils/useDebounce'
import { PageHeader } from '../../components/PageHeader'

// Define a type for the filter status that includes empty string
type FilterStatus = ProjectSchema['status'] | '';

export const ProjectManagement: React.FC = () => {
  const [projects, setProjects] = useState<ProjectSchema[]>([])
  const [isLoading, setLoading] = useState(true)
  const [filter, setFilter] = useState<{
    status: FilterStatus // Updated type to include empty string
  }>({ status: '' })
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 9

  // Modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<ProjectSchema | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  
  // Store project progress data
  const [projectProgress, setProjectProgress] = useState<{[projectId: string]: number}>({})

  // useCallback to prevent unnecessary re-renders of fetchProjects
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const options: {
        status?: ProjectSchema['status'];
        excludeStatus?: ProjectSchema['status'];
        limit: number;
        page: number;
      } = {
        limit: itemsPerPage,
        page: currentPage,
      };

      // Only set status filter if it's not empty
      if (filter.status) {
        options.status = filter.status as ProjectSchema['status'];
      } else {
        // Only exclude archived when no specific status is selected
        options.excludeStatus = 'archived';
      }

      const fetchedProjects = await projectService.fetchProjects(options);
      setProjects(fetchedProjects.data);
      setTotalPages(fetchedProjects.totalPages || 1); // Ensure at least 1 page
      
      // Fetch tasks for each project to calculate progress
      const progressData: {[projectId: string]: number} = {};
      
      await Promise.all(fetchedProjects.data.map(async (project) => {
        const tasksResponse = await taskService.fetchTasks({ projectId: project.id });
        const tasks = tasksResponse.data;
        
        if (tasks.length === 0) {
          progressData[project.id] = 0;
        } else {
          const completedTasks = tasks.filter(task => task.status === 'completed').length;
          progressData[project.id] = Math.round((completedTasks / tasks.length) * 100);
        }
      }));
      
      setProjectProgress(progressData);
      
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      setError(error.message || 'Failed to load projects. Please try again.');
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  }, [filter.status, currentPage, itemsPerPage]);

  useEffect(() => {
    fetchProjects()
  }, [filter, currentPage, debouncedSearchTerm, fetchProjects]);

  const handleDeleteProject = async () => {
    if (!selectedProject) return

    try {
      await projectService.deleteProject(selectedProject.id)
      setProjects(prevProjects =>
        prevProjects.filter(project => project.id !== selectedProject.id)
      )
      setSelectedProject(null)
      setIsDeleteModalOpen(false)
    } catch (error: any) {
      console.error('Error deleting project:', error)
      setError(error.message || 'Failed to delete project. Please try again.')
    }
  }

  const handleEditProject = (project: ProjectSchema) => {
    setSelectedProject(project)
    setIsEditModalOpen(true)
  }

  const handleDeleteConfirmation = (project: ProjectSchema) => {
    setSelectedProject(project)
    setIsDeleteModalOpen(true)
  }

  const handleProjectCreated = (newProject: ProjectSchema) => {
    setProjects(prevProjects => [newProject, ...prevProjects])
  }

  const handleProjectUpdated = (updatedProject: ProjectSchema) => {
    setProjects(prevProjects =>
      prevProjects.map(project =>
        project.id === updatedProject.id ? updatedProject : project
      )
    )
  }

  const handleArchiveProject = async (projectId: string) => {
    try {
      await projectService.archiveProject(projectId);
      // Refresh the project list
      fetchProjects();
    } catch (error: any) {
      console.error('Error archiving project:', error);
      setError(error.message || 'Failed to archive project. Please try again.');
    }
  };

  const handleUnarchiveProject = async (projectId: string) => {
    try {
      await projectService.unarchiveProject(projectId);
      // Refresh the project list
      fetchProjects();
    } catch (error: any) {
      console.error('Error unarchiving project:', error);
      setError(error.message || 'Failed to unarchive project. Please try again.');
    }
  };

  const handleRetry = () => {
    setIsRetrying(true);
    fetchProjects();
  };

  const StatusBadge: React.FC<{ status: ProjectSchema['status'] }> = ({ status }) => {
    const statusStyles = {
      planning: 'bg-amber-100 text-amber-800 border border-amber-200',
      active: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      completed: 'bg-blue-100 text-blue-800 border border-blue-200',
      paused: 'bg-slate-100 text-slate-800 border border-slate-200',
      cancelled: 'bg-rose-100 text-rose-800 border border-rose-200',
      archived: 'bg-gray-400 text-white border border-gray-500'
    }

    const statusLabels = {
      planning: 'Planejamento',
      active: 'Ativo',
      completed: 'Concluído',
      paused: 'Pausado',
      cancelled: 'Cancelado',
      archived: 'Arquivado'
    }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyles[status]}`}>
        {statusLabels[status]}
      </span>
    )
  }

  const getTimeRemaining = (project: ProjectSchema): string => {
    if (!project.endDate) return 'Sem prazo definido';
    
    const now = new Date().getTime();
    const endDate = project.endDate;
    
    if (now > endDate) return 'Prazo encerrado';
    
    const diffTime = Math.abs(endDate - now);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Termina hoje';
    if (diffDays === 1) return 'Termina amanhã';
    return `${diffDays} dias restantes`;
  };

  // Get priority color based on days remaining
  const getPriorityColor = (project: ProjectSchema): string => {
    if (!project.endDate) return 'text-gray-400';
    
    const now = new Date().getTime();
    const endDate = project.endDate;
    
    if (now > endDate) return 'text-red-500';
    
    const diffTime = Math.abs(endDate - now);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 3) return 'text-red-500';
    if (diffDays <= 7) return 'text-amber-500';
    return 'text-emerald-500';
  };

  // Get status icon
  const getStatusIcon = (status: ProjectSchema['status']) => {
    switch (status) {
      case 'planning':
        return <Bookmark className="text-amber-500" />;
      case 'active':
        return <Zap className="text-emerald-500" />;
      case 'completed':
        return <Star className="text-blue-500" />;
      case 'paused':
        return <Clock className="text-slate-500" />;
      case 'cancelled':
        return <AlertTriangle className="text-rose-500" />;
      case 'archived':
        return <Archive className="text-gray-500" />;
      default:
        return <Briefcase className="text-gray-500" />;
    }
  };

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
    project.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  );

  return (
    <Layout role="admin" isLoading={isLoading}>
      <div className="container mx-auto px-4 sm:px-6 py-6">
        <div className="space-y-4 sm:space-y-6">
          {/* Page Header */}
          <PageHeader
            title="Gerenciamento de Projetos"
            description="Gerencie e acompanhe todos os projetos do sistema"
            icon={Briefcase}
            actions={
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg flex items-center hover:from-blue-700 hover:to-indigo-700 transition shadow-sm w-full sm:w-auto justify-center"
              >
                <Plus className="mr-2" size={18} /> Adicionar Projeto
              </button>
            }
          />

          {/* Error Message with Retry Button */}
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-md shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
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

          {/* Filters Section */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Input */}
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="text-gray-400" size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Buscar projetos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                />
              </div>

              {/* Status Filter */}
              <div className="relative w-full sm:w-auto">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="text-gray-400" size={18} />
                </div>
                <select
                  value={filter.status}
                  onChange={(e) => setFilter({ status: e.target.value as FilterStatus })}
                  className="w-full sm:w-auto pl-10 pr-8 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 appearance-none"
                >
                  <option value="">Todos os Status</option>
                  <option value="planning">Planejamento</option>
                  <option value="active">Ativos</option>
                  <option value="completed">Concluídos</option>
                  <option value="paused">Pausados</option>
                  <option value="cancelled">Cancelados</option>
                  <option value="archived">Arquivados</option>
                </select>
              </div>
            </div>
          </div>

          {/* Project Cards Grid */}
          {filteredProjects.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 text-center border border-gray-100">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="text-gray-400" size={24} />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Nenhum projeto encontrado</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || filter.status
                  ? 'Tente ajustar os filtros para encontrar o que está procurando.'
                  : 'Comece criando seu primeiro projeto.'}
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition inline-flex items-center"
              >
                <Plus className="mr-2" size={18} /> Criar Projeto
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredProjects.map((project) => (
                <div 
                  key={project.id} 
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition group"
                >
                  {/* Project Header */}
                  <div className="p-4 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 rounded-lg bg-gray-50">
                          {getStatusIcon(project.status)}
                        </div>
                        <div>
                          <h2 className="text-base sm:text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition line-clamp-1">
                            <Link to={`/admin/projects/${project.id}`}>{project.name}</Link>
                          </h2>
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-600 mb-4 line-clamp-2 text-sm">{project.description}</p>
                    
                    {/* Progress Bar with Gradient */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all duration-500 bg-gradient-to-r from-blue-500 to-indigo-600"
                        style={{ width: `${projectProgress[project.id] || 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 flex items-center">
                        <BarChart2 size={12} className="mr-1" />
                        {projectProgress[project.id] || 0}% Completo
                      </span>
                      {project.endDate && (
                        <span className={`text-xs flex items-center ${getPriorityColor(project)}`}>
                          <Clock size={12} className="mr-1" />
                          {getTimeRemaining(project)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Project Details */}
                  <div className="px-4 sm:px-6 py-4 bg-gray-50">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar size={16} className="mr-2 text-gray-500" />
                        <span>
                          {new Date(project.startDate).toLocaleDateString()}
                          {project.endDate && ` - ${new Date(project.endDate).toLocaleDateString()}`}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Users size={16} className="mr-2 text-gray-500" />
                        <span>{project.managers.length} Gestores</span>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-2 mt-2">
                      {project.status === 'archived' ? (
                        <button
                          onClick={() => handleUnarchiveProject(project.id)}
                          className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"
                          title="Desarquivar"
                        >
                          <FolderOpen size={18} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleArchiveProject(project.id)}
                          className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-full transition-colors"
                          title="Arquivar"
                        >
                          <Archive size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => handleEditProject(project)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        title="Editar"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteConfirmation(project)}
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

          {/* Pagination */}
          {filteredProjects.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <span className="text-sm text-gray-600 order-2 sm:order-1">
                Página {currentPage} de {totalPages}
              </span>
              <div className="flex space-x-2 w-full sm:w-auto justify-between sm:justify-start order-1 sm:order-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center hover:bg-gray-50 transition"
                >
                  <ChevronLeft className="mr-2" size={16} /> Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center hover:bg-gray-50 transition"
                >
                  Próximo <ChevronRight className="ml-2" size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Modals */}
          <CreateProjectModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onProjectCreated={handleProjectCreated}
          />

          {selectedProject && (
            <>
              <EditProjectModal
                project={selectedProject}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onProjectUpdated={handleProjectUpdated}
              />

              <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteProject}
                itemName={selectedProject.name}
                warningMessage="A exclusão de um projeto removerá permanentemente todas as suas informações do sistema."
              />
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default ProjectManagement
