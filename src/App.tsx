// src/App.tsx
import React from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom'
import * as Sentry from "@sentry/react"
import { AuthProvider } from './context/AuthContext'
import { PrivateRoute } from './components/PrivateRoute'
import { ErrorBoundary } from './components/ErrorBoundary'

// Importações de páginas
import { Login } from './pages/auth/Login'
import { ForgotPassword } from './pages/auth/ForgotPassword'
import { Profile } from './pages/Profile'
import { Unauthorized } from './pages/Unauthorized'
import { Notifications } from './pages/Notifications'
import { TaskDetails } from './pages/admin/TaskDetails' // Keep this for the read-only view
import { CreateActionTemplate } from './pages/admin/CreateActionTemplate'
import { ActionTemplateManagement } from './pages/admin/ActionTemplateManagement'
import { UserProfile } from './pages/UserProfile'; // Import UserProfile


// Admin Imports
import { AdminDashboard } from './pages/admin/Dashboard'
import { UserManagement } from './pages/admin/UserManagement'
import { ProjectManagement } from './pages/admin/ProjectManagement'
import { ProjectDetails } from './pages/admin/ProjectDetails'
import { ProjectChat } from './pages/admin/ProjectChat'
import { TaskManagement } from './pages/admin/TaskManagement'
import { SystemSettings } from './pages/admin/SystemSettings'
import { CreateProjectTask } from './pages/admin/CreateProjectTask' // RESTORED
import { EditProjectTask } from './pages/admin/EditProjectTask' // RESTORED

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Rotas de Autenticação */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Rotas de Perfil */}
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />
            {/* Rota de Perfil do Usuário (com ID) */}
            <Route
              path="/profile/:userId"  // NEW: User profile route with ID
              element={
                <PrivateRoute>
                  <UserProfile />
                </PrivateRoute>
              }
            />

            {/* Rota de Notificações */}
            <Route
              path="/notifications"
              element={
                <PrivateRoute>
                  <Notifications />
                </PrivateRoute>
              }
            />

            {/* Task Details Route - Specific Task ID (Read-Only) */}
            <Route
              path="/tasks/:taskId"  // Correct path for TaskDetails (read-only)
              element={
                <PrivateRoute>
                  <TaskDetails />
                </PrivateRoute>
              }
            />

            {/* Rotas de Admin */}
            <Route
              path="/admin/dashboard"
              element={
                <PrivateRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/user-management"
              element={
                <PrivateRoute allowedRoles={['admin']}>
                  <UserManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/projects"
              element={
                <PrivateRoute allowedRoles={['admin']}>
                  <ProjectManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/projects/:projectId"
              element={
                <PrivateRoute allowedRoles={['admin', 'manager']}>
                  <ProjectDetails />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/projects/:projectId/chat"
              element={
                <PrivateRoute allowedRoles={['admin', 'manager']}>
                  <ProjectChat />
                </PrivateRoute>
              }
            />
            {/* RESTORED: Route for creating tasks within a project */}
            <Route
              path="/admin/projects/:projectId/create-task"
              element={
                <PrivateRoute allowedRoles={['admin', 'manager']}>
                  <CreateProjectTask />
                </PrivateRoute>
              }
            />

            {/* RESTORED: Route for editing tasks within a project */}
            <Route
              path="/admin/projects/:projectId/edit-task/:taskId"
              element={
                <PrivateRoute allowedRoles={['admin', 'manager']}>
                  <EditProjectTask />
                </PrivateRoute>
              }
            />
            {/*  Route: /admin/tasks should show TaskManagement */}
            <Route
              path="/admin/tasks"
              element={
                <PrivateRoute allowedRoles={['admin']}>
                  <TaskManagement />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <PrivateRoute allowedRoles={['admin']}>
                  <SystemSettings />
                </PrivateRoute>
              }
            />
            {/*  Action Template Routes */}
            <Route
              path="/admin/action-templates/create"
              element={
                <PrivateRoute allowedRoles={['admin']}>
                  <CreateActionTemplate />
                </PrivateRoute>
              }
            />
            <Route
              path="/admin/action-templates"
              element={
                <PrivateRoute allowedRoles={['admin']}>
                  <ActionTemplateManagement />
                </PrivateRoute>
              }
            />

            {/* Redirect manager and employee routes to admin dashboard for now */}
            <Route
              path="/manager/*"
              element={<Navigate to="/admin/dashboard" replace />}
            />
            
            <Route
              path="/employee/*"
              element={<Navigate to="/admin/dashboard" replace />}
            />

            {/* Rota Padrão */}
            <Route
              path="/"
              element={<Navigate to="/login" replace />}
            />

            {/* 404 Not Found */}
            <Route
              path="*"
              element={<div>Página não encontrada</div>}
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default Sentry.withProfiler(App)
