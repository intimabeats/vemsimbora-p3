// src/services/ActivityService.ts
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore'
import { ActivityLogSchema } from '../types/firestore-schema'

class ActivityService {
  private db = getFirestore();
  private activityLogCollection = collection(this.db, 'activityLog');

  async logActivity(activity: Omit<ActivityLogSchema, 'id' | 'timestamp'>): Promise<void> {
    try {
      const docRef = await addDoc(this.activityLogCollection, {
        ...activity,
        timestamp: Date.now()
      });
      console.log("Activity logged with ID: ", docRef.id);
    } catch (error) {
      console.error("Error logging activity:", error);
      throw error;
    }
  }

  async getRecentActivities(limitCount: number = 9): Promise<ActivityLogSchema[]> {
    try {
      const q = query(this.activityLogCollection, orderBy('timestamp', 'desc'), limit(limitCount));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActivityLogSchema));
    } catch (error) {
      console.error("Error fetching recent activities:", error);
      throw error;
    }
  }
}

export const activityService = new ActivityService();
