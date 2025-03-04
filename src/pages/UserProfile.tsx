// src/pages/UserProfile.tsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { userManagementService } from '../services/UserManagementService';
import { projectService } from '../services/ProjectService';
import { taskService } from '../services/TaskService';
import { User, Mail, AlertTriangle, ArrowLeft, Briefcase, CheckCircle, Award, Calendar } from 'lucide-react';
import { getDefaultProfileImage } from "../utils/user";
import { ProfileHeader } from '../components/ProfileHeader';

interface UserProfileProps { }

export const UserProfile: React.FC<UserProfileProps> = () => {
    const { userId } = useParams<{ userId: string }>();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [projects, setProjects] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState({
        completedTasks: 0,
        pendingTasks: 0,
        totalProjects: 0
    });

    // Default gradient as a data URL
    const defaultCover = 'linear-gradient(to right, #4c51bf, #6a82fb)';

    useEffect(() => {
        const fetchUserProfile = async () => {
            setIsLoading(true);
            setError(null);
            try {
                if (!userId) {
                    throw new Error("User ID is required.");
                }

                const userData = await userManagementService.getUserById(userId);
                setUser(userData);

                // Fetch projects where the user is a manager or assigned to tasks
                const allProjects = await projectService.fetchProjects();
                // Fetch ALL tasks
                const allTasks = await taskService.fetchTasks();
                
                // Filter projects where user is a manager or assigned to tasks
                const userProjects = allProjects.data.filter(project =>
                    project.managers.includes(userId) ||
                    allTasks.data.some(task => task.projectId === project.id && task.assignedTo === userId)
                );

                setProjects(userProjects);

                // Fetch tasks assigned to the user
                const userTasks = await taskService.fetchTasks({ assignedTo: userId });
                setTasks(userTasks.data);

                // Calculate stats
                const completedTasks = userTasks.data.filter(task => task.status === 'completed').length;
                const pendingTasks = userTasks.data.filter(task => task.status !== 'completed').length;
                
                setStats({
                    completedTasks,
                    pendingTasks,
                    totalProjects: userProjects.length
                });

            } catch (err: any) {
                setError(err.message || "Failed to load user profile.");
                console.error("Error fetching user profile:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserProfile();
    }, [userId]);

    if (isLoading) {
        return (
            <Layout role={currentUser?.role || 'employee'} isLoading={true}>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout role={currentUser?.role || 'employee'}>
                <div className="container mx-auto p-6">
                    <div className="p-4 bg-red-100 text-red-700 border border-red-400 rounded flex items-center">
                        <AlertTriangle className="mr-2" size={20} />
                        {error}
                    </div>
                    <button 
                        onClick={() => navigate(-1)} 
                        className="mt-4 flex items-center text-blue-600 hover:text-blue-800"
                    >
                        <ArrowLeft size={16} className="mr-1" /> Voltar
                    </button>
                </div>
            </Layout>
        );
    }

    if (!user) {
        return (
            <Layout role={currentUser?.role || 'employee'}>
                <div className="container mx-auto p-6">
                    <div className="p-4 bg-yellow-100 text-yellow-700 border border-yellow-400 rounded flex items-center">
                        <AlertTriangle className="mr-2" size={20} />
                        Usuário não encontrado.
                    </div>
                    <button 
                        onClick={() => navigate(-1)} 
                        className="mt-4 flex items-center text-blue-600 hover:text-blue-800"
                    >
                        <ArrowLeft size={16} className="mr-1" /> Voltar
                    </button>
                </div>
            </Layout>
        );
    }

    const isOwnProfile = currentUser?.uid === userId;

    return (
        <Layout role={currentUser?.role || 'employee'}>
            <div className="container mx-auto p-6">
                <div className="mb-6">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
                    >
                        <ArrowLeft size={20} className="mr-1" /> Voltar
                    </button>
                </div>
                
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    {/* Profile Header with Cover Photo */}
                    <ProfileHeader 
                        name={user.name}
                        role={user.role}
                        profileImage={user.profileImage || getDefaultProfileImage(user.name)}
                        coverPhoto={user.coverImage || defaultCover}
                        userId={userId || ''}
                    />
                    
                    <div className="p-6">
                        {/* User Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            <div className="bg-blue-50 p-4 rounded-lg flex items-center">
                                <Award className="text-blue-500 mr-3" size={24} />
                                <div>
                                    <h3 className="text-lg font-semibold text-blue-800">{user.coins || 0}</h3>
                                    <p className="text-sm text-blue-600">Moedas</p>
                                </div>
                            </div>
                            
                            <div className="bg-green-50 p-4 rounded-lg flex items-center">
                                <CheckCircle className="text-green-500 mr-3" size={24} />
                                <div>
                                    <h3 className="text-lg font-semibold text-green-800">{stats.completedTasks}</h3>
                                    <p className="text-sm text-green-600">Tarefas Concluídas</p>
                                </div>
                            </div>
                            
                            <div className="bg-purple-50 p-4 rounded-lg flex items-center">
                                <Briefcase className="text-purple-500 mr-3" size={24} />
                                <div>
                                    <h3 className="text-lg font-semibold text-purple-800">{stats.totalProjects}</h3>
                                    <p className="text-sm text-purple-600">Projetos</p>
                                </div>
                            </div>
                        </div>
                        
                        {/* User Info */}
                        <div className="mb-8">
                            <h2 className="text-xl font-semibold mb-4 border-b pb-2">Informações</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center">
                                    <User className="text-gray-500 mr-2" size={18} />
                                    <span className="text-gray-700 font-medium">Nome:</span>
                                    <span className="ml-2">{user.name}</span>
                                </div>
                                
                                <div className="flex items-center">
                                    <Mail className="text-gray-500 mr-2" size={18} />
                                    <span className="text-gray-700 font-medium">Email:</span>
                                    <span className="ml-2">{user.email}</span>
                                </div>
                                
                                <div className="flex items-center">
                                    <User className="text-gray-500 mr-2" size={18} />
                                    <span className="text-gray-700 font-medium">Função:</span>
                                    <span className="ml-2 capitalize">{user.role}</span>
                                </div>
                                
                                <div className="flex items-center">
                                    <Calendar className="text-gray-500 mr-2" size={18} />
                                    <span className="text-gray-700 font-medium">Membro desde:</span>
                                    <span className="ml-2">
                                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                                    </span>
                                </div>
                            </div>
                            
                            {user.bio && (
                                <div className="mt-4">
                                    <h3 className="text-gray-700 font-medium mb-2">Bio:</h3>
                                    <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{user.bio}</p>
                                </div>
                            )}
                        </div>
                        
                        {/* Projects Section */}
                        <div className="mb-8">
                            <h2 className="text-xl font-semibold mb-4 border-b pb-2">Projetos</h2>
                            {projects.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {projects.map((project) => (
                                        <Link 
                                            key={project.id} 
                                            to={`/admin/projects/${project.id}`}
                                            className="block bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
                                        >
                                            <h3 className="font-medium text-blue-600 hover:text-blue-800 mb-2">{project.name}</h3>
                                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">{project.description}</p>
                                            <div className="flex justify-between items-center text-xs text-gray-500">
                                                <span>
                                                    {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'}
                                                </span>
                                                <span className="capitalize px-2 py-1 bg-gray-100 rounded-full">
                                                    {project.status}
                                                </span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                                    Não está participando de nenhum projeto.
                                </p>
                            )}
                        </div>
                        
                        {/* Tasks Section */}
                        <div>
                            <h2 className="text-xl font-semibold mb-4 border-b pb-2">Tarefas</h2>
                            {tasks.length > 0 ? (
                                <div className="space-y-3">
                                    {tasks.map((task) => (
                                        <Link 
                                            key={task.id} 
                                            to={`/tasks/${task.id}`}
                                            className="block bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
                                        >
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-medium text-blue-600 hover:text-blue-800">{task.title}</h3>
                                                <span className={`text-xs px-2 py-1 rounded-full ${
                                                    task.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                    task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                                    task.status === 'waiting_approval' ? 'bg-purple-100 text-purple-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {task.status === 'completed' ? 'Concluída' :
                                                     task.status === 'in_progress' ? 'Em Andamento' :
                                                     task.status === 'waiting_approval' ? 'Aguardando Aprovação' :
                                                     'Pendente'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 line-clamp-2 my-2">{task.description}</p>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-gray-500">
                                                    Vencimento: {new Date(task.dueDate).toLocaleDateString()}
                                                </span>
                                                <span className="flex items-center text-yellow-600">
                                                    <Award size={14} className="mr-1" />
                                                    {task.coinsReward || 0} moedas
                                                </span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                                    Nenhuma tarefa atribuída.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};
