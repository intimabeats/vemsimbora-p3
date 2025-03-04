import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  getDocs
} from 'firebase/firestore'
import { SystemSettingsSchema } from '../types/firestore-schema'

export class SystemSettingsService {
  private db = getFirestore()
  private settingsDocRef = doc(collection(this.db, 'system'), 'global_settings')

  // Configurações padrão
  private defaultSettings: SystemSettingsSchema = {
    taskCompletionBase: 10,
    complexityMultiplier: 1.5,
    monthlyBonus: 50,
    twoFactorAuth: false,
    passwordResetFrequency: 90,
    emailNotifications: true,
    pushNotifications: false,
    weeklyReports: true
  }

  // Obter configurações do sistema
  async getSettings(): Promise<SystemSettingsSchema> {
    try {
      const docSnap = await getDoc(this.settingsDocRef)
      
      if (docSnap.exists()) {
        return docSnap.data() as SystemSettingsSchema
      } else {
        // Se não existir, criar configurações padrão
        await this.initializeSettings(this.defaultSettings)
        return this.defaultSettings
      }
    } catch (error) {
      console.error("Erro ao buscar configurações do sistema:", error)
      return this.defaultSettings
    }
  }

  // Inicializar configurações padrão
  async initializeSettings(settings: SystemSettingsSchema): Promise<void> {
    try {
      await setDoc(this.settingsDocRef, settings)
    } catch (error) {
      console.error("Erro ao inicializar configurações:", error)
      throw error
    }
  }

  // Atualizar configurações
  async updateSettings(
    updates: Partial<SystemSettingsSchema>
  ): Promise<SystemSettingsSchema> {
    try {
      // Buscar configurações atuais
      const currentSettings = await this.getSettings()
      
      // Mesclar atualizações
      const updatedSettings = {
        ...currentSettings,
        ...updates
      }

      // Atualizar no Firestore
      await updateDoc(this.settingsDocRef, updatedSettings)

      return updatedSettings
    } catch (error) {
      console.error("Erro ao atualizar configurações:", error)
      throw error
    }
  }

  // Validar configurações de recompensa
  async validateRewardSettings(
    baseReward: number, 
    complexityMultiplier: number
  ): Promise<boolean> {
    try {
      // Regras de validação de configurações de recompensa
      if (baseReward <= 0) {
        throw new Error("Recompensa base deve ser positiva")
      }

      if (complexityMultiplier < 1) {
        throw new Error("Multiplicador de complexidade deve ser maior ou igual a 1")
      }

      // Atualizar configurações se válidas
      await this.updateSettings({
        taskCompletionBase: baseReward,
        complexityMultiplier
      })

      return true
    } catch (error) {
      console.error("Erro na validação de configurações de recompensa:", error)
      throw error
    }
  }

  // Calcular recompensa de tarefa
  async calculateTaskReward(
    difficultyLevel: number
  ): Promise<number> {
    try {
      const settings = await this.getSettings()
      
      return Math.round(
        settings.taskCompletionBase * 
        difficultyLevel * 
        settings.complexityMultiplier
      )
    } catch (error) {
      console.error("Erro ao calcular recompensa da tarefa:", error)
      throw error
    }
  }

  // Histórico de alterações de configurações
  async getSettingsChangeHistory() {
    try {
      const historyRef = collection(this.db, 'system', 'global_settings', 'change_log')
      const q = query(historyRef)
      const snapshot = await getDocs(q)

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    } catch (error) {
      console.error("Erro ao buscar histórico de configurações:", error)
      throw error
    }
  }

  // Registrar alteração de configuração
  async logSettingsChange(
    userId: string, 
    changes: Partial<SystemSettingsSchema>
  ) {
    try {
      const logRef = doc(collection(this.db, 'system', 'global_settings', 'change_log'))
      
      await setDoc(logRef, {
        userId,
        changes,
        timestamp: Date.now()
      })
    } catch (error) {
      console.error("Erro ao registrar alteração de configuração:", error)
      throw error
    }
  }
}

export const systemSettingsService = new SystemSettingsService()
