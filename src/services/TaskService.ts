// src/services/TaskService.ts
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
  QueryConstraint
} from 'firebase/firestore'
import { auth, storage } from '../config/firebase'
import { TaskSchema, ProjectSchema, TaskAction } from '../types/firestore-schema'
import { systemSettingsService } from './SystemSettingsService'
import { ref, uploadBytes, getDownloadURL, listAll, getMetadata, deleteObject } from 'firebase/storage'
import { notificationService } from './NotificationService'
import { projectService } from './ProjectService'
import { userManagementService } from './UserManagementService'
import { activityService } from './ActivityService'
import { actionTemplateService } from './ActionTemplateService'

export class TaskService {
  private db = getFirestore()

  // ... (manter os métodos existentes)

  // Método atualizado para upload de anexo para tarefa
  async uploadTaskAttachment(
    taskId: string, 
    file: File,
    actionId?: string
  ): Promise<string> {
    try {
      let storagePath = `tasks/${taskId}/attachments/${file.name}`;
      if (actionId) {
        storagePath = `tasks/${taskId}/actions/${actionId}/${file.name}`;
      }
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Erro ao fazer upload de anexo:', error);
      throw error;
    }
  }

  // Novo método para mover arquivos após aprovação da tarefa
  async moveFilesToProjectAfterApproval(taskId: string, projectId: string): Promise<void> {
    try {
      const taskRef = doc(this.db, 'tasks', taskId);
      const taskSnap = await getDoc(taskRef);

      if (!taskSnap.exists()) {
        throw new Error('Tarefa não encontrada');
      }

      const taskData = taskSnap.data() as TaskSchema;

      if (taskData.status !== 'completed') {
        throw new Error('A tarefa deve estar concluída para mover os arquivos');
      }

      const taskStorageRef = ref(storage, `tasks/${taskId}`);
      const projectStorageRef = ref(storage, `projects/${projectId}/files`);

      // Listar todos os arquivos na pasta da tarefa
      const filesList = await listAll(taskStorageRef);

      // Mover cada arquivo para a pasta do projeto
      for (const fileRef of filesList.items) {
        const fileName = fileRef.name;
        const fileContent = await getDownloadURL(fileRef);
        const newFileRef = ref(projectStorageRef, fileName);

        // Fazer o upload do arquivo para a nova localização
        await uploadBytes(newFileRef, await (await fetch(fileContent)).blob());

        // Deletar o arquivo original da pasta da tarefa
        await deleteObject(fileRef);
      }

      // Atualizar a tarefa para indicar que os arquivos foram movidos
      await updateDoc(taskRef, {
        filesMovedToProject: true,
        updatedAt: Date.now()
      });

    } catch (error) {
      console.error('Erro ao mover arquivos para o projeto:', error);
      throw error;
    }
  }

  // ... (manter os outros métodos existentes)
}

export const taskService = new TaskService()
