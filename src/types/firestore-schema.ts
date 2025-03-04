// src/types/firestore-schema.ts

// User Schema
export interface UserSchema {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'employee'
  status: 'active' | 'inactive' | 'suspended'
  coins: number
  createdAt: number
  updatedAt: number
  profileImage?: string
  coverImage?: string;
  lastLogin?: number
  bio?: string;
}

// Project Schema
export interface ProjectSchema {
  id: string
  name: string
  description: string
  startDate: number
  endDate?: number | null // Updated to allow null values
  status: 'planning' | 'active' | 'paused' | 'completed' | 'cancelled' | 'archived'
  managers: string[]
  createdBy?: string // Made optional to fix TypeScript error
  createdAt: number
  updatedAt: number
  messages?: {  // Keep for Project Chat
    id: string
    userId: string
    userName: string
    content: string
    timestamp: number
    attachments?: {
      id: string
      name: string
      url: string
      type: 'image' | 'video' | 'document' | 'link' | 'other' | 'audio'
      size?: number
    }[]
    quotedMessage?: { // For quoted messages
      userName: string;
      content: string;
      attachments?: any[];
    }
    originalMessageId?: string; // To update the original message
    messageType?: 'task_submission' | 'task_approval' | 'general';
  }[]
  commentTabs?: { id: string; name: string; comments: any[] }[]; // Keep for future use
}

// Task Schema
export interface TaskSchema {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'waiting_approval' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo: string; // Single user ID
  createdBy: string; // User ID
  startDate: number; // Start date
  dueDate: number;
  completedAt?: number;
  difficultyLevel: number; // Difficulty level 2-9
  coinsReward: number; // Calculated reward
  subtasks?: {
    id: string;
    title: string;
    completed: boolean;
    completedAt?: number;
  }[];
  comments?: {
    id: string;
    userId: string;
    text: string;
    createdAt: number;
    attachments?: string[]; // URLs or file references
  }[];
  attachments?: string[]; // URLs or file references
  createdAt: number;
  updatedAt: number;
  actions: TaskAction[]; // Array of actions
}

// Field types for action templates and actions
export type FieldType = 
  | 'text'           // Short text input
  | 'long_text'      // Textarea for longer content
  | 'number'         // Numeric input
  | 'date'           // Date picker
  | 'select'         // Dropdown selection
  | 'checkbox'       // Boolean checkbox
  | 'radio'          // Radio button selection
  | 'file_upload'    // File upload field
  | 'info'           // Information display (no input)
  | 'document'       // Document with multiple sections
  | 'approval';      // Approval step

// Field definition for templates
export interface FieldDefinition {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  description?: string;
  options?: string[];  // For select/radio fields
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    errorMessage?: string;
  };
  hasAttachments?: boolean; // For info fields that can have attachments
}

//  Interface for a task action
export interface TaskAction {
  id: string;
  title: string;
  type: FieldType;
  completed: boolean;
  completedAt?: number | null;
  completedBy?: string | null;
  description?: string;
  // Specific fields for 'info' type
  infoTitle?: string;         // Title for the info section
  infoDescription?: string;   // Description for the info section
  hasAttachments?: boolean;   // Flag for required attachments
  data?: {
    fileURLs?: string[];      // Array of file URLs for 'info' type
    steps?: FieldDefinition[]; // Steps for document type
    value?: any;              // Stored value for the field
    values?: Record<string, any>; // For document with multiple fields
  };
  attachments?: {             // Attachments specific to THIS action step
    id: string;
    name: string;
    url: string;
    type: 'image' | 'video' | 'document' | 'link' | 'other' | 'audio';
    size?: number;
  }[];
}

// Interface for a task action template
export interface ActionTemplateSchema {
  id: string;
  title: string;
  description?: string;
  type: 'custom' | 'standard'; // Template type
  elements: FieldDefinition[]; // Array of field definitions
  order: number;
  createdBy?: string;
  createdAt?: number;
  updatedAt?: number;
  isActive?: boolean;
  category?: string;
}

// Reward Schema
export interface RewardSchema {
  id: string
  userId: string
  type: 'task_completion' | 'monthly_bonus' | 'special_achievement'
  amount: number
  description: string
  timestamp: number
  projectId?: string
  taskId?: string
}

// Notification Schema
export interface NotificationSchema {
  id: string
  userId: string
  type: 'task_created' | 'task_assigned' | 'task_completed' | 'project_update' | 'reward_earned' | 'system_alert' | 'task_updated'
  title: string
  message: string
  read: boolean
  timestamp: number
  relatedEntityId?: string
  sender?: string
}

// System Settings Schema
export interface SystemSettingsSchema {
  taskCompletionBase: number
  complexityMultiplier: number
  monthlyBonus: number
  twoFactorAuth: boolean
  passwordResetFrequency: number
  emailNotifications: boolean
  pushNotifications: boolean
  weeklyReports: boolean
}

// Activity Log Schema
export interface ActivityLogSchema {
  id: string;
  userId: string;
  userName: string;
  type: 'project_created' | 'project_updated' | 'task_created' | 'task_updated' | 'task_completed' | 'user_login' | 'user_created' | 'task_status_update' | 'other'; // Added task_status_update
  projectId?: string; // Optional, if related to a project
  taskId?: string;    // Optional, if related to a task
  projectName?: string; // NEW: Project name for easier display
  taskName?: string;    // NEW: Task name for easier display
  newStatus?: string;   // NEW: For status updates
  details?: string;   // Optional, for additional details
  timestamp: number;
}
