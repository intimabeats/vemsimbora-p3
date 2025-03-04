// src/context/AuthContext.tsx
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback
} from 'react'
import {
  auth,
  AuthService,
  TokenService
} from '../config/firebase'
import {
  onAuthStateChanged,
  User,
  getIdToken,
  sendPasswordResetEmail,
  updatePassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth'
import { getDoc, doc, setDoc } from 'firebase/firestore'
import { db } from '../config/firebase'

// User roles type
type UserRole = 'admin' | 'manager' | 'employee'

// Extended user interface
interface ExtendedUser extends User {
  role?: UserRole
  coins?: number
  bio?: string
}

// Auth context type
type AuthContextType = {
  currentUser: ExtendedUser | null
  login: (email: string, password: string) => Promise<ExtendedUser>
  logout: () => Promise<void>
  refreshToken: () => Promise<string>
  checkTokenClaims: () => Promise<{
    admin: boolean
    manager: boolean
    employee: boolean
  }>
  resetPassword: (email: string) => Promise<void>
  updateUserPassword: (newPassword: string) => Promise<void>
  setCurrentUser: React.Dispatch<React.SetStateAction<ExtendedUser | null>>
  register: (name: string, email: string, password: string, role: UserRole) => Promise<ExtendedUser>
}

// Create context
const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  login: async () => ({} as ExtendedUser),
  logout: async () => { },
  refreshToken: async () => '',
  checkTokenClaims: async () => ({
    admin: false,
    manager: false,
    employee: false
  }),
  resetPassword: async () => { },
  updateUserPassword: async () => { },
  setCurrentUser: () => {},
  register: async () => ({} as ExtendedUser)
})

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<ExtendedUser | null>(null)
  const [loading, setLoading] = useState(true)

  const updateUser = useCallback(async (user: User | null) => {
    console.log("AuthContext updateUser - user:", user);
    if (user) {
      try {
        // Try to restore user data from localStorage
        const storedUser = localStorage.getItem('user')

        if (storedUser) {
          const parsedUser = JSON.parse(storedUser)
          console.log("AuthContext updateUser - storedUser:", parsedUser);

          // Verify token validity
          await getIdToken(user, true)

          // Get fresh user data from Firestore to ensure it's up to date
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            const extendedUser = {
              ...user,
              role: userData.role,
              coins: userData.coins,
              bio: userData.bio
            } as ExtendedUser;
            
            setCurrentUser(extendedUser)
            
            // Update localStorage with fresh data
            localStorage.setItem('user', JSON.stringify({
              role: userData.role,
              coins: userData.coins,
              bio: userData.bio
            }))
          } else {
            // If user document doesn't exist in Firestore, use stored data
            const extendedUser = {
              ...user,
              role: parsedUser.role,
              coins: parsedUser.coins,
              bio: parsedUser.bio
            } as ExtendedUser;
            
            setCurrentUser(extendedUser)
          }
        } else {
          // If no data in localStorage, fetch from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            const extendedUser = {
              ...user,
              role: userData.role,
              coins: userData.coins,
              bio: userData.bio
            } as ExtendedUser;
            
            setCurrentUser(extendedUser)
            
            // Save to localStorage
            localStorage.setItem('user', JSON.stringify({
              role: userData.role,
              coins: userData.coins,
              bio: userData.bio
            }))
          } else {
            // If no user document found, set user without role/coins
            setCurrentUser(user as ExtendedUser)
          }
        }
      } catch (error) {
        console.error('Error restoring session:', error)
        setCurrentUser(null)
      }
    } else {
      setCurrentUser(null)
    }
  }, []);

  useEffect(() => {
    // Set up persistent authentication listener
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      await updateUser(user);
      setLoading(false)
    }, (error) => {
      console.error('Authentication listener error:', error)
      setCurrentUser(null)
      setLoading(false)
    })

    // Set up token expiration listener
    const tokenListener = setInterval(async () => {
      if (currentUser) {
        try {
          await getIdToken(currentUser, true)
        } catch (error) {
          console.error('Token expired:', error)
          await logout()
        }
      }
    }, 30 * 60 * 1000) // Check every 30 minutes

    // Clean up listeners
    return () => {
      unsubscribe()
      clearInterval(tokenListener)
    }
  }, [updateUser])

  // Authentication methods
  const login = async (email: string, password: string): Promise<ExtendedUser> => {
    try {
      const user = await AuthService.login(email, password)
      console.log("AuthContext login - user after AuthService.login:", user);

      // Create an ExtendedUser object
      const extendedUser = {
        ...user,
        role: user.role,
        coins: user.coins
      } as ExtendedUser;

      // Save data to localStorage
      localStorage.setItem('user', JSON.stringify({
        role: user.role,
        coins: user.coins
      }))

      setCurrentUser(extendedUser)
      return extendedUser
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await AuthService.logout()
      localStorage.removeItem('user')
      setCurrentUser(null)
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  }

  const refreshToken = async () => {
    if (!currentUser) {
      throw new Error('No authenticated user')
    }
    return TokenService.refreshToken(currentUser)
  }

  const checkTokenClaims = async () => {
    if (!currentUser) {
      throw new Error('No authenticated user')
    }
    return TokenService.checkTokenClaims(currentUser)
  }

  // Password reset function
  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Error sending password reset email:", error);
      throw error;
    }
  };

  // Add a new method to update password
  const updateUserPassword = async (newPassword: string) => {
    try {
      if (!currentUser) {
        throw new Error('No authenticated user');
      }
      
      await updatePassword(currentUser, newPassword);
    } catch (error) {
      console.error("Error updating password:", error);
      throw error;
    }
  };

  // Add register method
  const register = async (
    name: string,
    email: string,
    password: string,
    role: UserRole
  ): Promise<ExtendedUser> => {
    try {
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update profile
      await updateProfile(user, { displayName: name });

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
      };

      await setDoc(doc(db, 'users', user.uid), userData);

      // Create extended user
      const extendedUser = {
        ...user,
        role,
        coins: 0
      } as ExtendedUser;

      // Save to localStorage
      localStorage.setItem('user', JSON.stringify({
        role,
        coins: 0
      }));

      setCurrentUser(extendedUser);
      return extendedUser;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  // Context value
  const value: AuthContextType = {
    currentUser,
    login,
    logout,
    refreshToken,
    checkTokenClaims,
    resetPassword,
    updateUserPassword,
    setCurrentUser,
    register
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext)
}
