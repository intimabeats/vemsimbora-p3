import React, { useState, useEffect } from 'react'
import { Layout } from '../../components/Layout'
import {
  Settings,
  Coins,
  Bell,
  Shield,
  Save,
  User
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const SystemSettings: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  const [coinSettings, setCoinSettings] = useState({
    taskCompletionBase: 10,
    complexityMultiplier: 1.5,
    monthlyBonus: 50
  })

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    weeklyReports: true
  })

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    passwordResetFrequency: 90
  })

  const navigate = useNavigate()

  useEffect(() => {
    // Simulate data fetching
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500); // Simulate a 0.5-second delay

    return () => clearTimeout(timer); // Cleanup the timer
  }, []);

  const SettingsSection: React.FC<{
    title: string,
    icon: React.ElementType,
    children: React.ReactNode
  }> = ({ title, icon: Icon, children }) => (
    <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
      <div className="flex items-center mb-4">
        <Icon className="mr-3 text-blue-600" size={24} />
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      </div>
      {children}
    </div>
  )

  const SettingRow: React.FC<{
    label: string,
    children: React.ReactNode
  }> = ({ label, children }) => (
    <div className="flex justify-between items-center py-3 border-b last:border-b-0">
      <span className="text-gray-700">{label}</span>
      {children}
    </div>
  )

  return (
    <Layout role="admin" isLoading={isLoading}>
      <div className="container mx-auto p-6">
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center">
              <Settings className="mr-4 text-blue-600" /> Configurações
            </h1>
            <button
              onClick={() => navigate('/profile')}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center transition"
            >
              <User className="mr-2" /> Ver Perfil
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <SettingsSection title="Sistema de Recompensas" icon={Coins}>
              <SettingRow label="Base por Tarefa">
                <input
                  type="number"
                  value={coinSettings.taskCompletionBase}
                  onChange={(e) => setCoinSettings({
                    ...coinSettings,
                    taskCompletionBase: Number(e.target.value)
                  })}
                  className="w-24 px-2 py-1 border rounded-lg text-right"
                />
              </SettingRow>
              <SettingRow label="Multiplicador de Complexidade">
                <input
                  type="number"
                  step="0.1"
                  value={coinSettings.complexityMultiplier}
                  onChange={(e) => setCoinSettings({
                    ...coinSettings,
                    complexityMultiplier: Number(e.target.value)
                  })}
                  className="w-24 px-2 py-1 border rounded-lg text-right"
                />
              </SettingRow>
              <SettingRow label="Bônus Mensal">
                <input
                  type="number"
                  value={coinSettings.monthlyBonus}
                  onChange={(e) => setCoinSettings({
                    ...coinSettings,
                    monthlyBonus: Number(e.target.value)
                  })}
                  className="w-24 px-2 py-1 border rounded-lg text-right"
                />
              </SettingRow>
            </SettingsSection>

            <SettingsSection title="Notificações" icon={Bell}>
              <SettingRow label="Notificações por Email">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={notificationSettings.emailNotifications}
                    onChange={(e) => setNotificationSettings({
                      ...notificationSettings,
                      emailNotifications: e.target.checked
                    })}
                  />
                  <span className="slider round"></span>
                </label>
              </SettingRow>
              <SettingRow label="Notificações Push">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={notificationSettings.pushNotifications}
                    onChange={(e) => setNotificationSettings({
                      ...notificationSettings,
                      pushNotifications: e.target.checked
                    })}
                  />
                  <span className="slider round"></span>
                </label>
              </SettingRow>
              <SettingRow label="Relatórios Semanais">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={notificationSettings.weeklyReports}
                    onChange={(e) => setNotificationSettings({
                      ...notificationSettings,
                      weeklyReports: e.target.checked
                    })}
                  />
                  <span className="slider round"></span>
                </label>
              </SettingRow>
            </SettingsSection>

            <SettingsSection title="Segurança" icon={Shield}>
              <SettingRow label="Autenticação de Dois Fatores">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={securitySettings.twoFactorAuth}
                    onChange={(e) => setSecuritySettings({
                      ...securitySettings,
                      twoFactorAuth: e.target.checked
                    })}
                  />
                  <span className="slider round"></span>
                </label>
              </SettingRow>
              <SettingRow label="Redefinição de Senha (dias)">
                <input
                  type="number"
                  value={securitySettings.passwordResetFrequency}
                  onChange={(e) => setSecuritySettings({
                    ...securitySettings,
                    passwordResetFrequency: Number(e.target.value)
                  })}
                  className="w-24 px-2 py-1 border rounded-lg text-right"
                />
              </SettingRow>
            </SettingsSection>
          </div>

          <div className="flex justify-end">
            <button
              className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center hover:bg-blue-700 transition"
            >
              <Save className="mr-2" /> Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
