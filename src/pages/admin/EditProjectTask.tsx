// src/pages/admin/EditProjectTask.tsx
import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Layout } from '../../components/Layout'
import {
  CheckCircle,
  X,
  AlertTriangle,
  Trash2,
  FileText,
  Calendar,
  Users,
  Clock,
  Flag,
  Award,
  Briefcase,
  Save,
  Info,
  Plus,
  Eye
} from 'lucide-react'
import { taskService } from '../../services/TaskService'
import { projectService } from '../../services/ProjectService'
import { userManagementService } from '../../services/UserManagementService'
import { TaskSchema, TaskAction } from '../../types/firestore-schema'
import { systemSettingsService } from '../../services/SystemSettingsService'
import { actionTemplateService } from '../../services/ActionTemplateService';
import { deepCopy } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext'

export const EditProjectTask: React.FC = () => {
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>()
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  // Basic form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    projectId: projectId || '',
    assignedTo: '',
    priority: 'medium' as TaskSchema['priority'],
    startDate: new Date().toISOString().split('T')[0], // Added start date
    dueDate: new Date().toISOString().split('T')[0],
    difficultyLevel: 5,
    actions: [] as TaskAction[]  // Initialize actions
  })

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(true)
  const [success, setSuccess] = useState<string | null>(null)

  // Data state
  const [projects, setProjects] = useState<{ id: string, name: string }[]>([])
  const [users, setUsers] = useState<{ id: string, name: string }[]>([])
  const [coinsReward, setCoinsReward] = useState(0)
  const [templates, setTemplates] = useState<{ id: string, title: string, description: string }[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [previewAction, setPreviewAction] = useState<TaskAction | null>(null)

  // Load task data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!taskId) {
          throw new Error('Task ID is required');
        }

        // Fetch task data
        const taskData = await taskService.getTaskById(taskId);

        // Fetch project name
        if (projectId) {
          const project = await projectService.getProjectById(projectId);
          if (project.name) {
            // Project exists, continue
          }
        }

        // Fetch users, settings, and templates
        const [usersRes, settings, templatesRes] = await Promise.all([
          userManagementService.fetchUsers(),
          systemSettingsService.getSettings(),
          actionTemplateService.fetchActionTemplates()
        ]);

        // Set form data from task
        setFormData({
          title: taskData.title,
          description: taskData.description,
          projectId: taskData.projectId,
          assignedTo: taskData.assignedTo,
          priority: taskData.priority,
          startDate: new Date(taskData.startDate || Date.now()).toISOString().split('T')[0],
          dueDate: new Date(taskData.dueDate).toISOString().split('T')[0],
          difficultyLevel: taskData.difficultyLevel || 5,
          actions: taskData.actions || []
        });

        // Set other state
        setProjects(await fetchProjects());
        setUsers(usersRes.data.map(u => ({ id: u.id, name: u.name })));
        setCoinsReward(Math.round(settings.taskCompletionBase * taskData.difficultyLevel * settings.complexityMultiplier));
        
        // Enhanced template data with descriptions
        setTemplates(templatesRes.map(t => ({ 
          id: t.id, 
          title: t.title,
          description: t.description || 'No description provided'
        })));

      } catch (err: any) {
        console.error('Error loading task data:', err);
        setError(err.message || 'Failed to load task data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [taskId, projectId]);

  // Fetch projects helper function
  const fetchProjects = async () => {
    const projectsResponse = await projectService.fetchProjects();
    return projectsResponse.data.map(p => ({ id: p.id, name: p.name }));
  };

  // Form validation
  const validateForm = () => {
    const errors: { [key: string]: string } = {}
    if (!formData.title.trim()) errors.title = 'Title is required'
    if (!formData.description.trim()) errors.description = 'Description is required'
    if (!formData.projectId) errors.projectId = 'Project is required'
    if (!formData.assignedTo) errors.assignedTo = 'At least one assignee is required'
    if (!formData.startDate) errors.startDate = 'Start date is required'
    if (!formData.dueDate) errors.dueDate = "Due date is required"

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Event handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

  // Add action from template
  const handleAddActionFromTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      setLoading(true);
      const fullTemplate = await actionTemplateService.getActionTemplateById(selectedTemplate);
      if (!fullTemplate) {
        setError("Template not found");
        return;
      }

      const newAction: TaskAction = {
        id: Date.now().toString() + Math.random().toString(36).substring(7),
        title: fullTemplate.title,
        type: 'document',
        completed: false,
        description: fullTemplate.elements.map(e => e.description || '').filter(Boolean).join(' '),
        data: { steps: deepCopy(fullTemplate.elements) },
      };

      setFormData(prev => ({
        ...prev,
        actions: [...prev.actions, newAction],
      }));
      
      // Show preview of the newly added action
      setPreviewAction(newAction);
      
      // Reset the selected template after adding
      setSelectedTemplate('');
      setSuccess("Action template added successfully");
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Error adding action from template:", error);
      setError("Failed to add action from template.");
    } finally {
      setLoading(false);
    }
  };
  // Remove action
  const handleRemoveAction = (actionId: string) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.filter(action => action.id !== actionId)
    }));
    
    // Clear preview if the removed action was being previewed
    if (previewAction && previewAction.id === actionId) {
      setPreviewAction(null);
    }
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    setError(null)

    try {
      if (!taskId) {
        throw new Error('Task ID is missing');
      }
      
      // Calculate coins reward based on difficulty level
      const calculatedCoinsReward = Math.round(
        formData.difficultyLevel * 
        (await systemSettingsService.getSettings()).taskCompletionBase * 
        (await systemSettingsService.getSettings()).complexityMultiplier
      );

      const updateData = {
        ...formData,
        startDate: new Date(formData.startDate).getTime(),
        dueDate: new Date(formData.dueDate).getTime(),
        coinsReward: calculatedCoinsReward
      };

      await taskService.updateTask(taskId, updateData);
      setSuccess("Task updated successfully!");
      
      // Auto-hide success message and navigate after a delay
      setTimeout(() => {
        navigate(`/admin/projects/${projectId}`);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update task');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoading && !taskId) {
    return (
      <Layout role="admin" isLoading={false}>
        <div className="container mx-auto p-6">
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">
            <AlertTriangle className="inline-block mr-2" />
            Task ID is required
          </div>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout role={currentUser?.role || 'admin'} isLoading={isLoading}>
      <div className="container mx-auto p-6">
        <div className="flex items-center mb-6">
          <button 
            onClick={() => navigate(-1)} 
            className="mr-4 p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
            aria-label="Go back"
          >
            <X size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <CheckCircle className="mr-3 text-blue-600" />
            Edit Task
          </h1>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg flex items-center mb-6">
            <AlertTriangle className="mr-3 flex-shrink-0" size={20} />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg flex items-center mb-6">
            <CheckCircle className="mr-3 flex-shrink-0" size={20} />
            <p>{success}</p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Task Information</h2>
            <p className="text-sm text-gray-600">Update the task details below</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <FileText size={16} className="mr-2 text-blue-600" />
                    Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Enter task title"
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.title ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500 border-gray-300'}`}
                  />
                  {formErrors.title && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.title}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Users size={16} className="mr-2 text-blue-600" />
                    Assignee
                  </label>
                  <select
                    name="assignedTo"
                    value={formData.assignedTo}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.assignedTo ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500 border-gray-300'}`}
                  >
                    <option value="">Select an assignee</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.assignedTo && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.assignedTo}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Briefcase size={16} className="mr-2 text-blue-600" />
                    Project
                  </label>
                  <select
                    name="projectId"
                    value={formData.projectId}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.projectId ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500 border-gray-300'}`}
                    disabled={!!projectId} // Disable if projectId is provided in URL
                  >
                    <option value="">Select Project</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.projectId && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.projectId}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Flag size={16} className="mr-2 text-blue-600" />
                    Priority
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <FileText size={16} className="mr-2 text-blue-600" />
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe the task in detail"
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 h-24 ${formErrors.description ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500 border-gray-300'}`}
                  />
                  {formErrors.description && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <Calendar size={16} className="mr-2 text-blue-600" />
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.startDate ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500 border-gray-300'}`}
                    />
                    {formErrors.startDate && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.startDate}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <Clock size={16} className="mr-2 text-blue-600" />
                      Due Date
                    </label>
                    <input
                      type="date"
                      name="dueDate"
                      value={formData.dueDate}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${formErrors.dueDate ? 'border-red-500 focus:ring-red-500' : 'focus:ring-blue-500 border-gray-300'}`}
                    />
                    {formErrors.dueDate && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.dueDate}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Award size={16} className="mr-2 text-blue-600" />
                    Difficulty Level ({formData.difficultyLevel})
                  </label>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-gray-500">Easy</span>
                    <input
                      type="range"
                      min="2"
                      max="9"
                      step="1"
                      value={formData.difficultyLevel}
                      onChange={(e) => setFormData(prev => ({ ...prev, difficultyLevel: parseInt(e.target.value) }))}
                      className="flex-grow h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-xs text-gray-500">Hard</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">Reward: {coinsReward} coins</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Templates Section */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-medium text-gray-700 flex items-center">
                  <CheckCircle size={16} className="mr-2 text-blue-600" />
                  Task Actions
                </label>
                <div className="flex space-x-2">
                  <Link
                    to="/admin/action-templates/create"
                    target="_blank"
                    className="text-blue-600 text-sm hover:text-blue-800 flex items-center"
                  >
                    <Plus size={14} className="mr-1" />
                    Create Template
                  </Link>
                </div>
              </div>
              
              {/* Template Selection */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Action from Template
                </label>
                <div className="flex space-x-2">
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a Template</option>
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddActionFromTemplate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
                    disabled={!selectedTemplate || loading}
                  >
                    {loading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Adding...
                      </span>
                    ) : (
                      <>
                        <Plus size={18} className="mr-1" /> Add
                      </>
                    )}
                  </button>
                </div>
                
                {/* Template Description */}
                {selectedTemplate && (
                  <div className="mt-2 p-3 bg-blue-50 border-l-4 border-blue-500 text-blue-700">
                    <div className="flex items-start">
                      <Info size={18} className="mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">
                          {templates.find(t => t.id === selectedTemplate)?.title || 'Template'}
                        </p>
                        <p className="text-sm mt-1">
                          {templates.find(t => t.id === selectedTemplate)?.description || 'No description provided'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Display Added Actions */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {formData.actions.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                    <FileText className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                    <p className="text-gray-500">No actions added to this task yet</p>
                    <p className="text-sm text-gray-400 mt-1">Add actions from templates using the selector above</p>
                  </div>
                ) : (
                  formData.actions.map((action) => (
                    <div 
                      key={action.id} 
                      className={`bg-white p-4 rounded-lg border ${
                        previewAction?.id === action.id 
                          ? 'border-blue-300 shadow-md' 
                          : 'border-gray-200 hover:shadow-sm'
                      } transition-shadow`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-start space-x-3">
                          <div className="p-2 bg-blue-100 rounded-full">
                            <FileText size={16} className="text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{action.title}</h4>
                            <p className="text-sm text-gray-500 line-clamp-1 mt-1">
                              {action.type === 'document' 
                                ? `${action.data?.steps?.length || 0} fields to complete` 
                                : action.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => setPreviewAction(previewAction?.id === action.id ? null : action)}
                            className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title={previewAction?.id === action.id ? "Hide Preview" : "Preview Action"}
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveAction(action.id)}
                            className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Remove Action"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      
                      {/* Preview Panel */}
                      {previewAction?.id === action.id && action.type === 'document' && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h5 className="font-medium text-gray-700 mb-3 flex items-center">
                            <Eye size={16} className="mr-2 text-blue-600" />
                            Action Preview
                          </h5>
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            {action.data?.steps?.map((step, index) => (
                              <div key={index} className="mb-4 last:mb-0">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  {step.label || `Field ${index + 1}`}
                                </label>
                                
                                {step.type === 'text' && (
                                  <input
                                    type="text"
                                    disabled
                                    placeholder={step.placeholder || "Short text input"}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-500"
                                  />
                                )}
                                
                                {step.type === 'long_text' && (
                                  <textarea
                                    disabled
                                    placeholder={step.placeholder || "Long text input"}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-500 h-20"
                                  ></textarea>
                                )}
                                
                                {step.type === 'date' && (
                                  <input
                                    type="date"
                                    disabled
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-500"
                                  />
                                )}
                                
                                {step.type === 'select' && (
                                  <select
                                    disabled
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-500"
                                  >
                                    <option value="">Select an option</option>
                                    {step.options?.map((option, i) => (
                                      <option key={i} value={option}>{option}</option>
                                    ))}
                                  </select>
                                )}
                                
                                {step.type === 'checkbox' && (
                                  <div className="flex items-center">
                                    <input
                                      type="checkbox"
                                      disabled
                                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                                    />
                                    <span className="ml-2 text-sm text-gray-700">{step.label}</span>
                                  </div>
                                )}
                                
                                {step.description && (
                                  <p className="text-xs text-gray-500 mt-1">{step.description}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-6 py-2 rounded-lg text-white transition flex items-center ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2" size={18} /> Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
