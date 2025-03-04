import React, { useState, forwardRef, useEffect } from 'react'
import {
  Home,
  Briefcase,
  Settings,
  CheckCircle,
  Users as UsersIcon,
  Bell,
  MoreHorizontal,
  X,
  User,
  LogOut,
  FileText
} from 'lucide-react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getDefaultProfileImage } from '../utils/user'

type Role = 'admin' | 'manager' | 'employee';

interface MobileNavbarProps {
  role: Role;
}

export const MobileNavbar = forwardRef<HTMLDivElement, MobileNavbarProps>(({ role }, ref) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    // Set active tab based on current route
    const path = location.pathname;
    if (path.includes('/dashboard')) setActiveTab('dashboard');
    else if (path.includes('/projects')) setActiveTab('projects');
    else if (path.includes('/tasks')) setActiveTab('tasks');
    else if (path.includes('/user-management')) setActiveTab('users');
    else if (path.includes('/notifications')) setActiveTab('notifications');
    else setActiveTab('');
  }, [location.pathname]);

  // Define main navigation items (always visible)
  const getMainNavItems = (role: Role) => {
    const items = [
      {
        icon: Home,
        label: 'Dashboard',
        route: `/${role}/dashboard`,
        key: 'dashboard'
      }
    ];

    // Add role-specific items
    if (role === 'admin' || role === 'manager') {
      items.push({
        icon: Briefcase,
        label: 'Projetos',
        route: `/${role}/projects`,
        key: 'projects'
      });
    }

    items.push({
      icon: CheckCircle,
      label: 'Tarefas',
      route: `/${role}/tasks`,
      key: 'tasks'
    });

    if (role === 'admin') {
      items.push({
        icon: UsersIcon,
        label: 'Usuários',
        route: '/admin/user-management',
        key: 'users'
      });
    }

    return items;
  }

  // Define all menu items for the expanded view
  const getAllMenuItems = (role: Role) => {
    const mainItems = getMainNavItems(role);
    
    const additionalItems = [
      {
        icon: Bell,
        label: 'Notificações',
        route: '/notifications',
        key: 'notifications'
      },
      {
        icon: User,
        label: 'Meu Perfil',
        route: `/profile/${currentUser?.uid}`,
        key: 'profile'
      }
    ];
    
    if (role === 'admin') {
      additionalItems.push({
        icon: FileText,
        label: 'Modelos de Ação',
        route: '/admin/action-templates',
        key: 'action-templates'
      });
    }
    
    additionalItems.push({
      icon: Settings,
      label: 'Configurações',
      route: `/${role}/settings`,
      key: 'settings'
    });
    
    return [...mainItems, ...additionalItems];
  }

  const mainNavItems = getMainNavItems(role);
  const allMenuItems = getAllMenuItems(role);

  const handleNavigation = (route: string, key: string) => {
    setActiveTab(key);
    navigate(route);
    setIsMenuOpen(false);
  }

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }

  return (
    <>
      {/* Fixed Bottom Navigation */}
      <nav ref={ref} className="fixed bottom-0 left-0 right-0 bg-white shadow-2xl border-t z-50 md:hidden h-14">
        <div className="grid grid-cols-5 py-2">
          {mainNavItems.map((item) => (
            <button
              key={item.key}
              onClick={() => handleNavigation(item.route, item.key)}
              className={`flex flex-col items-center justify-center ${
                activeTab === item.key ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              <item.icon
                size={24}
                strokeWidth={activeTab === item.key ? 2.5 : 1.5}
              />
              <span className="text-xs mt-1">{item.label}</span>
            </button>
          ))}
          
          {/* More Button */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="flex flex-col items-center justify-center text-gray-500"
          >
            <MoreHorizontal size={24} strokeWidth={1.5} />
            <span className="text-xs mt-1">Mais</span>
          </button>
        </div>
      </nav>

      {/* Full Screen Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-white z-50 md:hidden">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b">
              <div className="flex items-center">
                <img
                  src={currentUser?.photoURL || getDefaultProfileImage(currentUser?.displayName || '')}
                  alt="Profile"
                  className="w-10 h-10 rounded-full mr-3"
                />
                <div>
                  <h2 className="font-semibold text-gray-800">{currentUser?.displayName || 'Usuário'}</h2>
                  <p className="text-xs text-gray-500 capitalize">{role}</p>
                </div>
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            {/* Menu Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-3 gap-4">
                {allMenuItems.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleNavigation(item.route, item.key)}
                    className="flex flex-col items-center justify-center p-4 rounded-xl hover:bg-blue-50 transition-colors"
                  >
                    <div className={`p-3 rounded-full ${
                      activeTab === item.key ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <item.icon size={24} />
                    </div>
                    <span className={`mt-2 text-sm ${
                      activeTab === item.key ? 'text-blue-600 font-medium' : 'text-gray-700'
                    }`}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Logout Button */}
            <div className="p-4 border-t">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center py-3 px-4 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
              >
                <LogOut size={20} className="mr-2" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
})
