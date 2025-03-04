// src/pages/admin/Dashboard.tsx
import React, { useState, useEffect, useCallback } from 'react'
import { Layout } from '../../components/Layout'
import {
  BarChart2,
  Briefcase,
  Users,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Star,
  Zap,
  Bookmark,
  Award,
  Calendar,
  ArrowRight
} from 'lucide-react'
import { projectService } from '../../services/ProjectService'
import { userManagementService } from '../../services/UserManagementService'
import { taskService } from '../../services/TaskService'
import { activityService } from '../../services/ActivityService';
import { ActivityLogSchema, ProjectSchema, TaskSchema } from '../../types/firestore-schema';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

const StatCard: React.FC<{
  icon: React.ElementType,
  title: string,
  value: string | number,
  color: string,
  bgColor: string,
  borderColor: string
}> = ({ icon: Icon, title, value, color, bgColor, borderColor }) => (
  <div className={`bg-white p-6 rounded-xl shadow-sm flex items-center space-x-4 border ${borderColor} transition-transform hover:scale-105 hover:shadow-md`}>
    <div className={`p-4 rounded-full ${bgColor}`}>
      <Icon className={`${color} w-6 h-6`} />
    </div>
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
    </div>
  </div>
)

// Reusable Progress Bar Component
const ProgressBar: React.FC<{ name: string; progress: number; color: string }> = ({ name, progress, color }) => (
  <div className="mb-4">
    <div className="flex justify-between text-sm text-gray-600 mb-1">
      <span className="font-medium">{name}</span>
      <span>{progress}%</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
      <div
        className={`${color} h-2.5 rounded-full transition-all duration-500`}
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  </div>
)

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

// Helper function to calculate project progress
const calculateProjectProgress = (tasks: TaskSchema[]): number => {
  if (!tasks.length) return 0;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  return Math.round((completedTasks / tasks.length) * 100);
};

export const AdminDashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [projectCount, setProjectCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [completedTasksCount, setCompletedTasksCount] = useState(0);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [projects, setProjects] = useState<ProjectSchema[]>([]); // Store projects
  const [projectPage, setProjectPage] = useState(1);
  const [projectTotalPages, setProjectTotalPages] = useState(1);
  const [recentActivities, setRecentActivities] = useState<ActivityLogSchema[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotalPages, setActivityTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [projectsWithTasks, setProjectsWithTasks] = useState<{ project: ProjectSchema; tasks: TaskSchema[] }[]>([]);
  const { currentUser } = useAuth();
  const [totalCoins, setTotalCoins] = useState(0);
  const [allActivities, setAllActivities] = useState<ActivityLogSchema[]>([]);

  // Fetch all data initially
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch projects with pagination (3 per page)
        const projectsResponse = await projectService.fetchProjects({ 
          limit: 3, 
          page: projectPage, 
          excludeStatus: 'archived' 
        });
        const projectsData = projectsResponse.data;
        setProjects(projectsData);
        setProjectTotalPages(projectsResponse.totalPages);
        setProjectCount(projectsResponse.totalProjects);

        // Fetch users count
        const users = await userManagementService.fetchUsers();
        setUserCount(users.totalUsers);

        // Fetch task counts
        const completedTasks = await taskService.fetchTasks({ status: 'completed' });
        setCompletedTasksCount(completedTasks.totalTasks);

        const pendingTasks = await taskService.fetchTasks({ status: 'pending' });
        setPendingTasksCount(pendingTasks.totalTasks);

        // Fetch all recent activities
        const activities = await activityService.getRecentActivities(15); // Fetch more to handle pagination
        setAllActivities(activities);
        
        // Calculate total pages for activities (5 per page)
        setActivityTotalPages(Math.ceil(activities.length / 5));
        
        // Set current page of activities
        const startIdx = (activityPage - 1) * 5;
        const endIdx = startIdx + 5;
        setRecentActivities(activities.slice(startIdx, endIdx));

        // Fetch tasks for each project
        const projectsWithTasksPromises = projectsData.map(async (project) => {
          const tasksResponse = await taskService.fetchTasks({ projectId: project.id });
          return { project, tasks: tasksResponse.data };
        });
        const projectsWithTasksResult = await Promise.all(projectsWithTasksPromises);
        setProjectsWithTasks(projectsWithTasksResult);

        // Calculate total coins distributed
        let totalCoinsDistributed = 0;
        const allTasks = await taskService.fetchTasks({ status: 'completed' });
        allTasks.data.forEach(task => {
          totalCoinsDistributed += task.coinsReward || 0;
        });
        setTotalCoins(totalCoinsDistributed);

      } catch (err: any) {
        setError(err.message || 'Erro ao buscar dados.');
        console.error("Error fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [projectPage, currentUser]);

  // Handle activity pagination separately (client-side)
  useEffect(() => {
    if (allActivities.length > 0) {
      const startIdx = (activityPage - 1) * 5;
      const endIdx = startIdx + 5;
      setRecentActivities(allActivities.slice(startIdx, endIdx));
    }
  }, [activityPage, allActivities]);

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
      default:
        return <Briefcase className="text-gray-500" />;
    }
  };

  // Format date for display
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <Layout role="admin" isLoading={isLoading}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
            <p className="text-gray-600">Bem-vindo, {currentUser?.displayName || 'Administrador'}! Aqui está o resumo do sistema.</p>
          </div>

          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6">
              <div className="flex items-center">
                <AlertTriangle className="mr-2 flex-shrink-0" />
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Grid de Estatísticas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={Briefcase}
              title="Projetos"
              value={projectCount}
              color="text-blue-600"
              bgColor="bg-blue-100"
              borderColor="border-blue-100"
            />
            <StatCard
              icon={Users}
              title="Usuários"
              value={userCount}
              color="text-green-600"
              bgColor="bg-green-100"
              borderColor="border-green-100"
            />
            <StatCard
              icon={CheckCircle}
              title="Tarefas Concluídas"
              value={completedTasksCount}
              color="text-purple-600"
              bgColor="bg-purple-100"
              borderColor="border-purple-100"
            />
            <StatCard
              icon={Award}
              title="Moedas Distribuídas"
              value={totalCoins}
              color="text-amber-600"
              bgColor="bg-amber-100"
              borderColor="border-amber-100"
            />
          </div>

          {/* Seções de Detalhes */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Progresso de Projetos */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold flex items-center">
                  <BarChart2 className="mr-2 text-blue-600" />
                  Progresso dos Projetos
                </h2>
                <Link to="/admin/projects" className="text-blue-600 hover:text-blue-800 text-sm flex items-center">
                  Ver todos <ArrowRight size={16} className="ml-1" />
                </Link>
              </div>
              <div className="space-y-6">
                {projectsWithTasks.length > 0 ? (
                  projectsWithTasks.map(({ project, tasks }) => {
                    const progress = calculateProjectProgress(tasks);
                    return (
                      <div key={project.id} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <div className="flex justify-between items-center mb-2">
                          <Link to={`/admin/projects/${project.id}`} className="font-medium text-blue-600 hover:text-blue-800 flex items-center">
                            {getStatusIcon(project.status)}
                            <span className="ml-2">{project.name}</span>
                          </Link>
                          <StatusBadge status={project.status} />
                        </div>
                        <ProgressBar
                          name=""
                          progress={progress}
                          color="bg-gradient-to-r from-blue-500 to-indigo-600"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-2">
                          <div className="flex items-center">
                            <Calendar size={14} className="mr-1" />
                            {formatDate(project.startDate)}
                            {project.endDate && ` - ${formatDate(project.endDate)}`}
                          </div>
                          <div className="flex items-center">
                            <Users size={14} className="mr-1" />
                            {project.managers.length} gestor{project.managers.length !== 1 ? 'es' : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum projeto encontrado
                  </div>
                )}
              </div>
              {/* Pagination Controls */}
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
                <span className="text-sm text-gray-600">
                  Página {projectPage} de {projectTotalPages}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setProjectPage(prev => Math.max(1, prev - 1))}
                    disabled={projectPage === 1}
                    className="p-2 border rounded-lg disabled:opacity-50 flex items-center hover:bg-gray-50 transition"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setProjectPage(prev => Math.min(projectTotalPages, prev + 1))}
                    disabled={projectPage === projectTotalPages}
                    className="p-2 border rounded-lg disabled:opacity-50 flex items-center hover:bg-gray-50 transition"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Atividade Recente */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold flex items-center">
                  <Clock className="mr-2 text-green-600" />
                  Atividade Recente
                </h2>
              </div>
              <div className="space-y-4">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-100 hover:shadow-sm transition"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-800">{activity.userName}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {activity.type === 'project_created' && `Criou o projeto ${activity.projectName}`}
                            {activity.type === 'project_updated' && `Atualizou o projeto ${activity.projectName}`}
                            {activity.type === 'task_created' && `Criou a tarefa ${activity.taskName} no projeto ${activity.projectName}`}
                            {activity.type === 'task_updated' && `Atualizou a tarefa ${activity.taskName} no projeto ${activity.projectName}`}
                            {activity.type === 'task_completed' && `Completou a tarefa ${activity.taskName} no projeto ${activity.projectName}`}
                            {activity.type === 'task_status_update' && `Alterou o status da tarefa ${activity.taskName} para ${activity.newStatus}`}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400 bg-white px-2 py-1 rounded-full">
                          {new Date(activity.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Nenhuma atividade recente
                  </div>
                )}
              </div>
              {/* Activity Pagination Controls */}
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
                <span className="text-sm text-gray-600">
                  Página {activityPage} de {activityTotalPages}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setActivityPage(prev => Math.max(1, prev - 1))}
                    disabled={activityPage === 1}
                    className="p-2 border rounded-lg disabled:opacity-50 flex items-center hover:bg-gray-50 transition"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setActivityPage(prev => Math.min(activityTotalPages, prev + 1))}
                    disabled={activityPage === activityTotalPages}
                    className="p-2 border rounded-lg disabled:opacity-50 flex items-center hover:bg-gray-50 transition"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
