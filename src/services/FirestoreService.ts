import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  startAfter
} from 'firebase/firestore'
import { auth } from '../config/firebase'
import { 
  UserSchema, 
  ProjectSchema, 
  TaskSchema, 
  RewardSchema, 
  NotificationSchema 
} from '../types/firestore-schema'

export class FirestoreService {
  private db = getFirestore()

  // Método genérico para adicionar documento
  async addDocument<T>(
    collectionName: string, 
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>, 
    customId?: string
  ): Promise<string> {
    try {
      const docRef = customId 
        ? doc(this.db, collectionName, customId)
        : doc(collection(this.db, collectionName))
      
      const documentData = {
        ...data,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await setDoc(docRef, documentData);

      return docRef.id
    } catch (error) {
      console.error(`Error adding document to ${collectionName}:`, error)
      throw error
    }
  }

  // Método genérico para atualizar documento
  async updateDocument<T>(
    collectionName: string, 
    documentId: string, 
    data: Partial<T>
  ): Promise<void> {
    try {
      const docRef = doc(this.db, collectionName, documentId)
      
      await updateDoc(docRef, {
        ...data,
        updatedAt: Date.now()
      })
    } catch (error) {
      console.error(`Error updating document in ${collectionName}:`, error)
      throw error
    }
  }

  // Método genérico para deletar documento
  async deleteDocument(
    collectionName: string, 
    documentId: string
  ): Promise<void> {
    try {
      const docRef = doc(this.db, collectionName, documentId)
      await deleteDoc(docRef)
    } catch (error) {
      console.error(`Error deleting document from ${collectionName}:`, error)
      throw error
    }
  }

  // Método para buscar documentos com paginação
  async fetchDocuments<T>(
    collectionName: string,
    options?: {
      whereConditions?: [string, any, any][],
      orderByField?: string,
      limitNumber?: number,
      startAfterDoc?: any
    }
  ): Promise<T[]> {
    try {
      let q = query(collection(this.db, collectionName))

      // Adicionar condições WHERE
      if (options?.whereConditions) {
        options.whereConditions.forEach(condition => {
          q = query(q, where(...condition))
        })
      }

      // Adicionar ordenação
      if (options?.orderByField) {
        q = query(q, orderBy(options.orderByField, 'desc'))
      }

      // Adicionar limite
      if (options?.limitNumber) {
        q = query(q, limit(options.limitNumber))
      }

      // Adicionar ponto de partida para paginação
      if (options?.startAfterDoc) {
        q = query(q, startAfter(options.startAfterDoc))
      }

      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as T))
    } catch (error) {
      console.error(`Error fetching documents from ${collectionName}:`, error)
      throw error
    }
  }
}

// Serviços específicos
export const UserService = {
  async createUser(userData: Omit<UserSchema, 'id' | 'createdAt' | 'updatedAt' | 'coins'>) {
    const firestoreService = new FirestoreService()
    const userId = await firestoreService.addDocument<UserSchema>('users', {
      ...userData,
      coins: 0,
      status: 'active'
    })
    
    return userId;
  },

  async updateUserProfile(userId: string, updates: Partial<UserSchema>) {
    const firestoreService = new FirestoreService()
    return firestoreService.updateDocument<UserSchema>('users', userId, updates)
  }
}

export const ProjectService = {
  async createProject(projectData: Omit<ProjectSchema, 'id' | 'createdAt' | 'updatedAt'>) {
    const firestoreService = new FirestoreService()
    const projectId = await firestoreService.addDocument<ProjectSchema>('projects', {
      ...projectData,
      status: 'planning',
      createdBy: auth.currentUser?.uid || ''
    })
    
    return projectId;
  }
}

export const TaskService = {
  async createTask(taskData: Omit<TaskSchema, 'id' | 'createdAt' | 'updatedAt'>) {
    const firestoreService = new FirestoreService()
    const taskId = await firestoreService.addDocument<TaskSchema>('tasks', {
      ...taskData,
      status: 'pending',
      createdBy: auth.currentUser?.uid || '',
      subtasks: taskData.subtasks || [],
      comments: taskData.comments || []
    })
    
    return taskId;
  }
}
