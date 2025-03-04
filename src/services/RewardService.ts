import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore'
import { RewardSchema } from '../types/firestore-schema'
import { userManagementService } from './UserManagementService'
import { notificationService } from './NotificationService'
import { auth } from '../config/firebase'

export class RewardService {
  private db = getFirestore()

  // Criar nova recompensa
  async createReward(
    rewardData: Omit<RewardSchema, 'id' | 'timestamp'>
  ): Promise<RewardSchema> {
    try {
      const rewardRef = doc(collection(this.db, 'rewards'))

      const newReward: RewardSchema = {
        id: rewardRef.id,
        ...rewardData,
        timestamp: Date.now()
      }

      await setDoc(rewardRef, newReward)

      // Atualizar moedas do usuário
      await userManagementService.updateUserCoins(
        rewardData.userId, 
        rewardData.amount
      )

      // Registrar transação de moedas
      await userManagementService.logCoinTransaction(
        rewardData.userId, 
        rewardData.amount, 
        rewardData.description
      )

      // Criar notificação de recompensa
      await notificationService.createNotification(
        rewardData.userId,
        {
          type: 'reward_earned',
          title: 'Recompensa Recebida',
          message: `Você ganhou ${rewardData.amount} moedas!`
        }
      )

      return newReward
    } catch (error) {
      console.error('Erro ao criar recompensa:', error)
      throw error
    }
  }

  // Buscar recompensas de um usuário
  async getUserRewards(
    userId: string,
    options?: {
      limit?: number
      type?: RewardSchema['type']
    }
  ): Promise<RewardSchema[]> {
    try {
      let rewardsQuery = query(
        collection(this.db, 'rewards'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      )

      // Filtrar por tipo de recompensa
      if (options?.type) {
        rewardsQuery = query(
          rewardsQuery,
          where('type', '==', options.type)
        )
      }

      // Limitar número de recompensas
      if (options?.limit) {
        rewardsQuery = query(rewardsQuery, limit(options.limit))
      }

      const snapshot = await getDocs(rewardsQuery)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as RewardSchema))
    } catch (error) {
      console.error('Erro ao buscar recompensas:', error)
      throw error
    }
  }

  // Calcular total de moedas ganhas
  async calculateTotalRewards(userId: string): Promise<number> {
    try {
      const rewards = await this.getUserRewards(userId)
      return rewards.reduce((total, reward) => total + reward.amount, 0)
    } catch (error) {
      console.error('Erro ao calcular total de recompensas:', error)
      throw error
    }
  }

  // Criar recompensa por conclusão de tarefa
  async createTaskCompletionReward(
    userId: string, 
    taskId: string, 
    projectId: string, 
    coinsReward: number
  ): Promise<RewardSchema> {
    try {
      return this.createReward({
        userId,
        type: 'task_completion',
        amount: coinsReward,
        description: `Recompensa por conclusão de tarefa`,
        projectId,
        taskId
      })
    } catch (error) {
      console.error('Erro ao criar recompensa de conclusão de tarefa:', error)
      throw error
    }
  }

  // Criar bônus mensal
  async createMonthlyBonus(
    userId: string, 
    bonusAmount: number
  ): Promise<RewardSchema> {
    try {
      return this.createReward({
        userId,
        type: 'monthly_bonus',
        amount: bonusAmount,
        description: `Bônus mensal de desempenho`
      })
    } catch (error) {
      console.error('Erro ao criar bônus mensal:', error)
      throw error
    }
  }

  // Criar recompensa por conquista especial
  async createSpecialAchievementReward(
    userId: string, 
    achievementName: string, 
    coinsReward: number
  ): Promise<RewardSchema> {
    try {
      return this.createReward({
        userId,
        type: 'special_achievement',
        amount: coinsReward,
        description: `Conquista: ${achievementName}`
      })
    } catch (error) {
      console.error('Erro ao criar recompensa de conquista:', error)
      throw error
    }
  }

  // Estornar recompensa
  async reverseReward(
    rewardId: string, 
    reason: string
  ): Promise<void> {
    try {
      const rewardRef = doc(this.db, 'rewards', rewardId)
      const rewardDoc = await getDoc(rewardRef)

      if (!rewardDoc.exists()) {
        throw new Error('Recompensa não encontrada')
      }

      const rewardData = rewardDoc.data() as RewardSchema

      // Subtrair moedas do usuário
      await userManagementService.updateUserCoins(
        rewardData.userId, 
        -rewardData.amount
      )

      // Registrar transação de estorno
      await userManagementService.logCoinTransaction(
        rewardData.userId, 
        -rewardData.amount, 
        `Estorno: ${reason}`
      )

      // Excluir registro de recompensa
      await deleteDoc(rewardRef)
    } catch (error) {
      console.error('Erro ao estornar recompensa:', error)
      throw error
    }
  }

  // Gerar relatório de recompensas
  async generateRewardsReport(
    userId: string, 
    startDate?: number, 
    endDate?: number
  ): Promise<{
    totalRewards: number
    rewardsByType: Record<RewardSchema['type'], number>
    recentRewards: RewardSchema[]
  }> {
    try {
      const rewards = await this.getUserRewards(userId)

      // Filtrar por data, se fornecido
      const filteredRewards = rewards.filter(reward => 
        (!startDate || reward.timestamp >= startDate) &&
        (!endDate || reward.timestamp <= endDate)
      )

      // Calcular total de recompensas
      const totalRewards = filteredRewards.reduce(
        (total, reward) => total + reward.amount, 
        0
      )

      // Agrupar recompensas por tipo
      const rewardsByType = filteredRewards.reduce((acc, reward) => {
        acc[reward.type] = (acc[reward.type] || 0) + reward.amount
        return acc
      }, {} as Record<RewardSchema['type'], number>)

      // Recompensas recentes (últimos 30 dias)
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
      const recentRewards = filteredRewards
        .filter(reward => reward.timestamp >= thirtyDaysAgo)
        .slice(0, 5)

      return {
        totalRewards,
        rewardsByType,
        recentRewards
      }
    } catch (error) {
      console.error('Erro ao gerar relatório de recompensas:', error)
      throw error
    }
  }
}

export const rewardService = new RewardService()
