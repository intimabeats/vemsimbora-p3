// src/services/ProjectService.ts
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
  limit,
  startAfter,
  QueryConstraint,
  DocumentData,
  QuerySnapshot
} from 'firebase/firestore'
import { auth } from '../config/firebase'
import { ProjectSchema } from '../types/firestore-schema'
import { activityService } from './ActivityService'; // Import

export class ProjectService {
  private db = getFirestore()

  // Criar novo projeto
  async createProject(projectData: Omit<ProjectSchema, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const projectRef = doc(collection(this.db, 'projects'))

      // Create a clean project object without undefined values
      const cleanProjectData = { ...projectData };
      
      // Convert undefined endDate to null (Firestore can store null but not undefined)
      if (cleanProjectData.endDate === undefined) {
        cleanProjectData.endDate = null; // Now valid with updated type definition
      }

      const newProject: ProjectSchema = {
        id: projectRef.id,
        ...cleanProjectData,
        createdBy: auth.currentUser?.uid || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        commentTabs: [  //Keep for future use
          {
            id: 'general',
            name: 'Geral',
            comments: []
          }
        ],
        messages: [] // Initialize messages here
      }

      await setDoc(projectRef, newProject)

      // Log activity
      await activityService.logActivity({
        userId: auth.currentUser?.uid || '',
        userName: auth.currentUser?.displayName || 'Unknown User',
        type: 'project_created',
        projectId: newProject.id,
        projectName: newProject.name, // Store the project NAME
      });


      return newProject
    } catch (error) {
      console.error('Erro ao criar projeto:', error)
      throw error
    }
  }
  
  async addProjectMessage(
    projectId: string, 
    message: {
      id: string
      userId: string
      userName: string
      content: string
      timestamp: number
      attachments?: any[]
      messageType?: 'task_submission' | 'task_approval' | 'general'; // Type of message
      originalMessageId?: string
      quotedMessage?: { // For quoted messages
        userName: string;
        content: string;
        attachments?: any[];
      }
    }
  ) {
    try {
      const projectRef = doc(this.db, 'projects', projectId)
      const projectDoc = await getDoc(projectRef)
      
      if (!projectDoc.exists()) {
        throw new Error('Projeto não encontrado')
      }

      const projectData = projectDoc.data()
      const messages = projectData.messages || []

      // Create a clean message object without undefined values
      const cleanMessage = { ...message };
      
      // Remove undefined properties
      Object.keys(cleanMessage).forEach(key => {
        if (cleanMessage[key] === undefined) {
          delete cleanMessage[key];
        }
      });

      await updateDoc(projectRef, {
        messages: [...messages, cleanMessage],
        updatedAt: Date.now()
      })

      return cleanMessage
    } catch (error) {
      console.error('Erro ao adicionar mensagem:', error)
      throw error
    }
  }

  // NEW: Add a system message, handling updates for existing messages
  async addSystemMessageToProjectChat(
    projectId: string,
    message: {
        userId: string;
        userName: string;
        content: string;
        timestamp: number;
        attachments?: any[];
        messageType: 'task_submission' | 'task_approval' | 'general';
        originalMessageId?: string; // ID of the original message, if this is an update
        quotedMessage?: { userName: string; content: string; attachments?: any[] };
    }
  ): Promise<void> {
    try {
        const projectRef = doc(this.db, 'projects', projectId);
        const projectDoc = await getDoc(projectRef);

        if (!projectDoc.exists()) {
            throw new Error('Project not found');
        }

        const projectData = projectDoc.data() as ProjectSchema;
        let messages = projectData.messages || [];

        // Create a clean message object without undefined values
        const cleanMessage = { ...message };
        
        // Remove undefined properties
        Object.keys(cleanMessage).forEach(key => {
          if (cleanMessage[key] === undefined) {
            delete cleanMessage[key];
          }
        });

        if (message.originalMessageId) {
            // This is an UPDATE to an existing message
            messages = messages.map((msg: any) =>
                msg.id === message.originalMessageId ? { ...msg, content: cleanMessage.content, timestamp: cleanMessage.timestamp } : msg
            );
        } else {
            // This is a NEW message
            messages = [...messages, { ...cleanMessage, id: Date.now().toString() }]; // Assign a unique ID
        }

        await updateDoc(projectRef, {
            messages: messages,
            updatedAt: Date.now(),
        });
    } catch (error) {
        console.error('Error adding system message:', error);
        throw error;
    }
  }

  async getProjectMessages(projectId: string): Promise<any[]> {
    try {
      const projectRef = doc(this.db, 'projects', projectId)
      const projectDoc = await getDoc(projectRef)
      
      if (!projectDoc.exists()) {
        throw new Error('Projeto não encontrado')
      }

      const projectData = projectDoc.data()
      return projectData.messages || []
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error)
      throw error
    }
  }
  
  // Atualizar projeto
  async updateProject(projectId: string, updates: Partial<ProjectSchema>) {
    try {
      const projectRef = doc(this.db, 'projects', projectId)

      // Create a clean updates object without undefined values
      const cleanUpdates = { ...updates };
      
      // Remove undefined properties or convert them to null
      Object.keys(cleanUpdates).forEach(key => {
        if (cleanUpdates[key] === undefined) {
          if (key === 'endDate') {
            cleanUpdates[key] = null; // Convert undefined endDate to null - now valid with updated type
          } else {
            delete cleanUpdates[key]; // Remove other undefined properties
          }
        }
      });

      await updateDoc(projectRef, {
        ...cleanUpdates,
        updatedAt: Date.now()
      })

      // Fetch and return updated project
      const updatedDoc = await getDoc(projectRef)
      const updatedProjectData =  { id: updatedDoc.id, ...updatedDoc.data() } as ProjectSchema

      // Log activity for project update
      await activityService.logActivity({
        userId: auth.currentUser?.uid || '',
        userName: auth.currentUser?.displayName || 'Unknown User',
        type: 'project_updated',
        projectId: projectId,
        projectName: updatedProjectData.name, // Use updated name
        details: `Project updated.`, // You can add more details here if needed
      });
      return updatedProjectData
    } catch (error) {
      console.error('Erro ao atualizar projeto:', error)
      throw error
    }
  }

  // Excluir projeto
  async deleteProject(projectId: string) {
    try {
      const projectRef = doc(this.db, 'projects', projectId)
      await deleteDoc(projectRef)
    } catch (error) {
      console.error('Erro ao excluir projeto:', error)
      throw error
    }
  }

  // Buscar projetos com paginação e filtros
  async fetchProjects(options?: {
    status?: ProjectSchema['status'];
    excludeStatus?: ProjectSchema['status'];
    limit?: number;
    page?: number;
  }) {
    try {
      // Get all projects first to avoid index issues
      const projectsCollection = collection(this.db, 'projects');
      const snapshot = await getDocs(projectsCollection);
      
      if (snapshot.empty) {
        return {
          data: [],
          totalPages: 0,
          totalProjects: 0
        };
      }
      
      // Convert to ProjectSchema objects
      let allProjects = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ProjectSchema));
      
      // Apply filters in memory instead of in the query
      if (options?.status) {
        allProjects = allProjects.filter(project => project.status === options.status);
      } else if (options?.excludeStatus) {
        allProjects = allProjects.filter(project => project.status !== options.excludeStatus);
      }
      
      // Sort by createdAt in descending order
      allProjects.sort((a, b) => b.createdAt - a.createdAt);
      
      // Get total count before pagination
      const totalProjects = allProjects.length;
      
      // Apply pagination
      const limit = options?.limit || 10;
      const page = options?.page || 1;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      const paginatedProjects = allProjects.slice(startIndex, endIndex);
      const totalPages = Math.ceil(totalProjects / limit);
      
      return {
        data: paginatedProjects,
        totalPages: totalPages || 1, // Ensure at least 1 page
        totalProjects: totalProjects
      };
    } catch (error) {
      console.error('Erro ao buscar projetos:', error);
      throw new Error('Failed to load projects. Please try again.');
    }
  }

  // Buscar projeto por ID
  async getProjectById(projectId: string): Promise<ProjectSchema> {
    try {
      const projectRef = doc(this.db, 'projects', projectId)
      const projectSnap = await getDoc(projectRef)

      if (projectSnap.exists()) {
        return {
          id: projectSnap.id,
          ...projectSnap.data()
        } as ProjectSchema
      } else {
        throw new Error('Projeto não encontrado')
      }
    } catch (error) {
      console.error('Erro ao buscar projeto por ID:', error)
      throw error
    }
  }

  // Adicionar comentário ao projeto
  async addProjectComment(
    projectId: string, 
    tabId: string, 
    comment: {
      userId: string, 
      userName: string, 
      content: string, 
      timestamp: number,
      attachments?: any[]
    }
  ) {
    try {
      const projectRef = doc(this.db, 'projects', projectId)
      const projectDoc = await getDoc(projectRef)
      
      if (!projectDoc.exists()) {
        throw new Error('Projeto não encontrado')
      }

      const projectData = projectDoc.data() as ProjectSchema
      const commentTabs = projectData.commentTabs || []

      // Create a clean comment object without undefined values
      const cleanComment = { ...comment };
      
      // Remove undefined properties
      Object.keys(cleanComment).forEach(key => {
        if (cleanComment[key] === undefined) {
          delete cleanComment[key];
        }
      });

      const updatedTabs = commentTabs.map(tab => {
        if (tab.id === tabId) {
          return {
            ...tab,
            comments: [...(tab.comments || []), cleanComment]
          }
        }
        return tab
      })

      await updateDoc(projectRef, {
        commentTabs: updatedTabs,
        updatedAt: Date.now()
      })

      return updatedTabs
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error)
      throw error
    }
  }

  // Arquivar projeto
  async archiveProject(projectId: string): Promise<void> {
    try {
      const projectRef = doc(this.db, 'projects', projectId);
      await updateDoc(projectRef, {
        status: 'archived',
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error('Error archiving project:', error);
      throw error;
    }
  }

  // Desarquivar projeto
  async unarchiveProject(projectId: string): Promise<void> {
    try {
      const projectRef = doc(this.db, 'projects', projectId);
      await updateDoc(projectRef, {
        status: 'planning', // Or any other default status
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error('Error unarchiving project:', error);
      throw error;
    }
  }
}

export const projectService = new ProjectService()
