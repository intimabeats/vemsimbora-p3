// src/services/ActionTemplateService.ts
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
  orderBy,
  writeBatch,
  where,
  limit
} from 'firebase/firestore'
import { ActionTemplateSchema, FieldDefinition } from '../types/firestore-schema'
import { auth } from '../config/firebase'

export class ActionTemplateService {
  private db = getFirestore()
  private templatesCollection = collection(this.db, 'actionTemplates')

  /**
   * Create a new action template
   * @param templateData Template data without ID
   * @returns Created template with ID
   */
  async createActionTemplate(
    templateData: Omit<ActionTemplateSchema, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ActionTemplateSchema> {
    try {
      const templateRef = doc(this.templatesCollection)
      const newTemplate: ActionTemplateSchema = {
        id: templateRef.id,
        ...templateData,
        order: templateData.order || Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: auth.currentUser?.uid || '',
        isActive: true
      }
      await setDoc(templateRef, newTemplate)
      return newTemplate
    } catch (error) {
      console.error('Error creating action template:', error)
      throw error
    }
  }

  /**
   * Get a template by ID
   * @param templateId Template ID
   * @returns Template or null if not found
   */
  async getActionTemplateById(templateId: string): Promise<ActionTemplateSchema | null> {
    try {
      const templateRef = doc(this.db, 'actionTemplates', templateId)
      const templateSnap = await getDoc(templateRef)

      if (templateSnap.exists()) {
        return {
          id: templateSnap.id,
          ...templateSnap.data()
        } as ActionTemplateSchema
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting action template:', error)
      throw error
    }
  }

  /**
   * Update an existing template
   * @param templateId Template ID
   * @param updates Partial updates to apply
   */
  async updateActionTemplate(
    templateId: string,
    updates: Partial<ActionTemplateSchema>
  ): Promise<void> {
    try {
      const templateRef = doc(this.db, 'actionTemplates', templateId)
      await updateDoc(templateRef, {
        ...updates,
        updatedAt: Date.now()
      })
    } catch (error) {
      console.error('Error updating action template:', error)
      throw error
    }
  }

  /**
   * Delete a template
   * @param templateId Template ID to delete
   */
  async deleteActionTemplate(templateId: string): Promise<void> {
    try {
      const templateRef = doc(this.db, 'actionTemplates', templateId)
      await deleteDoc(templateRef)
    } catch (error) {
      console.error('Error deleting action template:', error)
      throw error
    }
  }

  /**
   * Fetch all templates, ordered by the order field
   * @param options Optional filtering options
   * @returns Array of templates
   */
  async fetchActionTemplates(options?: {
    category?: string;
    isActive?: boolean;
    limit?: number;
  }): Promise<ActionTemplateSchema[]> {
    try {
      let q = query(this.templatesCollection, orderBy('order', 'asc'));
      
      // Apply filters if provided
      if (options?.category) {
        q = query(q, where('category', '==', options.category));
      }
      
      if (options?.isActive !== undefined) {
        q = query(q, where('isActive', '==', options.isActive));
      }
      
      if (options?.limit) {
        q = query(q, limit(options.limit));
      }
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActionTemplateSchema));
    } catch (error) {
      console.error('Error fetching action templates:', error);
      throw error;
    }
  }

  /**
   * Update the order of templates
   * @param newOrder Array of templates in the new order
   */
  async updateTemplateOrder(newOrder: ActionTemplateSchema[]): Promise<void> {
    const batch = writeBatch(this.db);

    newOrder.forEach((template, index) => {
      const templateRef = doc(this.db, 'actionTemplates', template.id);
      batch.update(templateRef, { order: index });
    });

    try {
      await batch.commit();
    } catch (error) {
      console.error("Error updating template order:", error);
      throw error;
    }
  }

  /**
   * Get templates by category
   * @param category Category to filter by
   * @returns Templates in the category
   */
  async getTemplatesByCategory(category: string): Promise<ActionTemplateSchema[]> {
    try {
      const q = query(
        this.templatesCollection, 
        where('category', '==', category),
        where('isActive', '==', true),
        orderBy('order', 'asc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActionTemplateSchema));
    } catch (error) {
      console.error('Error fetching templates by category:', error);
      throw error;
    }
  }

  /**
   * Duplicate an existing template
   * @param templateId Template ID to duplicate
   * @param newTitle Optional new title for the duplicate
   * @returns The newly created duplicate template
   */
  async duplicateTemplate(templateId: string, newTitle?: string): Promise<ActionTemplateSchema> {
    try {
      const template = await this.getActionTemplateById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }
      
      // Create a new template based on the existing one
      const { id, createdAt, updatedAt, ...templateData } = template;
      
      return this.createActionTemplate({
        ...templateData,
        title: newTitle || `${template.title} (Copy)`,
        order: Date.now() // Place at the end
      });
    } catch (error) {
      console.error('Error duplicating template:', error);
      throw error;
    }
  }

  /**
   * Convert a template to a task action
   * @param templateId Template ID
   * @returns Task action object ready to be added to a task
   */
  async convertTemplateToTaskAction(templateId: string): Promise<any> {
    try {
      const template = await this.getActionTemplateById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }
      
      return {
        id: Date.now().toString() + Math.random().toString(36).substring(7),
        title: template.title,
        type: 'document',
        completed: false,
        description: template.description || template.title,
        data: { 
          steps: template.elements.map(element => ({
            ...element,
            value: element.defaultValue || null
          }))
        }
      };
    } catch (error) {
      console.error('Error converting template to task action:', error);
      throw error;
    }
  }
}

export const actionTemplateService = new ActionTemplateService()
