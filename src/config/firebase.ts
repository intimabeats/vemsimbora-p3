// src/config/firebase.ts
import { initializeApp } from 'firebase/app'
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth'
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection
} from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// Firebase configuration - use environment variables when available, fallback to hardcoded values for development
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAU0TCTTobySafDi-9Y68C5eyOD-gmU7nw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "vem-simbora.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "vem-simbora",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "vem-simbora.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "403932059706",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:403932059706:web:5a7e01eebf7be71769bd03",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-31XN454YCP"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)

// Configure session persistence
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error('Error setting persistence:', error)
  })

// User roles type
type UserRole = 'admin' | 'manager' | 'employee'

// Authentication service
export const AuthService = {
  // Login user
  login: async (email: string, password: string) => {
    try {
      // If password is empty, it means we're just trying to get user data
      // This is used when restoring a session
      if (!password) {
        // Get user data from Firestore directly
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser?.uid || ''))
        
        if (!userDoc.exists()) {
          throw new Error('User data not found')
        }
        
        const userData = userDoc.data()
        
        return {
          ...auth.currentUser,
          role: userData.role,
          coins: userData.coins
        }
      }
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Get additional user data
      const userDoc = await getDoc(doc(db, 'users', user.uid))

      if (userDoc.exists()) {
        const userData = userDoc.data()

        return {
          ...user,
          role: userData.role,
          coins: userData.coins
        }
      }

      throw new Error('User data not found')
    } catch (error: any) {
      console.error('Login error:', error)
      throw error
    }
  },

  // Register new user
  register: async (
    name: string,
    email: string,
    password: string,
    role: UserRole
  ) => {
    try {
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Update profile
      await updateProfile(user, { displayName: name })

      // Create document in Firestore
      const userData = {
        id: user.uid,
        name,
        email,
        role,
        coins: 0,
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      await setDoc(doc(db, 'users', user.uid), userData)

      return {
        ...user,
        ...userData
      }
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  },

  // Logout user
  logout: async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  },

  // Password reset
  resetPassword: async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email)
    } catch (error) {
      console.error('Password reset error:', error)
      throw error
    }
  },

  updateProfile: async (userId: string, updates: any) => {
    try {
      const userRef = doc(db, 'users', userId)
      await updateDoc(userRef, {
        ...updates,
        updatedAt: Date.now()
      })

      // Update the user's profile in Firebase Authentication
      if (auth.currentUser) {
        const authUpdates: any = {};
        if (updates.name) {
          authUpdates.displayName = updates.name;
        }
        if (updates.photoURL) {
          authUpdates.photoURL = updates.photoURL;
        }
        if (Object.keys(authUpdates).length > 0) {
          console.log("firebase.ts - Updating auth profile with:", authUpdates);
          await updateProfile(auth.currentUser, authUpdates);
          console.log("firebase.ts - Auth profile updated successfully");
        }
      }
    } catch (error) {
      console.error('Profile update error:', error)
      throw error
    }
  },

  // Reauthenticate user
  reauthenticate: async (email: string, password: string) => {
    try {
      const user = auth.currentUser
      if (!user) {
        throw new Error('No authenticated user')
      }
      const credential = EmailAuthProvider.credential(email, password)
      await reauthenticateWithCredential(user, credential)
      return true // Return true on success
    } catch (error) {
      console.error('Reauthentication error:', error)
      return false // Return false on failure
    }
  }
}

// Token service
export const TokenService = {
  // Manually refresh token
  refreshToken: async (user: any) => {
    try {
      return await user.getIdToken(true)
    } catch (error) {
      console.error('Token refresh error:', error)
      throw error
    }
  },

  // Check token claims
  checkTokenClaims: async (user: any) => {
    try {
      const tokenResult = await user.getIdTokenResult()
      return {
        admin: tokenResult.claims.admin === true,
        manager: tokenResult.claims.manager === true,
        employee: tokenResult.claims.employee === true
      }
    } catch (error) {
      console.error('Token claims check error:', error)
      return {
        admin: false,
        manager: false,
        employee: false
      }
    }
  }
}

// Export services and configurations
export { auth, db, storage }
