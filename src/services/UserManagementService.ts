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
  startAfter
} from 'firebase/firestore'
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  deleteUser,
  sendPasswordResetEmail
} from 'firebase/auth'
import { UserSchema } from '../types/firestore-schema'
import { auth, storage } from '../config/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

export class UserManagementService {
  private db = getFirestore()
  private auth = getAuth()

  // Criar novo usuário
  async createUser(
    userData: Omit<UserSchema, 'id' | 'createdAt' | 'updatedAt' | 'coins'>,
    password: string // Accept password as a separate argument
  ): Promise<UserSchema> {
    try {
      // Criar usuário no Firebase Authentication
      if (!password) {
        throw new Error("Password is required");
      }
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        userData.email,
        password // Use the password argument
      )

      const user = userCredential.user

      // Atualizar perfil
      await updateProfile(user, { displayName: userData.name })

      // Dados para Firestore
      const firestoreUserData: UserSchema = {
        id: user.uid,
        ...userData,
        coins: 0,
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now()
        // profileImage NÃO é definido aqui
      }

      // Salvar no Firestore
      await setDoc(doc(this.db, 'users', user.uid), firestoreUserData)

      return firestoreUserData
    } catch (error) {
      console.error('Erro ao criar usuário:', error)
      throw error; // Re-throw the error for handling in the component
    }
  }
    // Atualizar usuário
  async updateUser(
    userId: string,
    updates: Partial<UserSchema>,
    profileImage?: File // Make profileImage optional
  ): Promise<UserSchema> {
    try {
      const userRef = doc(this.db, 'users', userId)
      const updateData: Partial<UserSchema> = {
        ...updates,
        updatedAt: Date.now(),
      };

      // Upload de imagem de perfil, SE fornecida
      if (profileImage) {
        const storageRef = ref(storage, `users/${userId}/profile_image`);
        await uploadBytes(storageRef, profileImage);
        const photoURL = await getDownloadURL(storageRef);
        updateData.profileImage = photoURL; // Only update if a new image is provided
      }

      // Atualizar usuário no Firestore
      await updateDoc(userRef, updateData);

      const updatedDoc = await getDoc(userRef)
      if (!updatedDoc.exists()) {
          throw new Error("Failed to fetch updated user data.");
      }
      return { id: updatedDoc.id, ...updatedDoc.data() } as UserSchema;
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error)
      throw error; // Re-throw for handling in component
    }
  }

  // Excluir usuário
  async deleteUser(userId: string) {
    try {
      // Excluir do Firestore
      await deleteDoc(doc(this.db, 'users', userId));

      // Se o usuário estiver logado, e for o usuário que estamos excluindo, *então* excluir da autenticação.
      const currentUser = this.auth.currentUser;
      if (currentUser && currentUser.uid === userId) {
        await deleteUser(currentUser); // Delete from Firebase Authentication *after* Firestore
      }
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      throw error; // Re-throw for handling in component
    }
  }

// Buscar usuários com paginação e filtros
async fetchUsers(options?: {
  role?: UserSchema['role'];
  status?: UserSchema['status'];
  limit?: number;
  page?: number;
  searchTerm?: string;
  userIds?: string[]; // NEW: Option to fetch specific user IDs
}): Promise<{
  data: UserSchema[];
  totalPages: number;
  totalUsers: number;
}> {
  try {
    let q = query(collection(this.db, 'users'));

    // Filtros
    if (options?.role) {
      q = query(q, where('role', '==', options.role));
    }

    if (options?.status) {
      q = query(q, where('status', '==', options.status));
    }

    // NEW: Fetch specific users by ID
    if (options?.userIds && options.userIds.length > 0) {
      q = query(q, where('id', 'in', options.userIds));
    }

    // Ordenação (sempre ordenar, importante para paginação)
    q = query(q, orderBy('name')); // Or another suitable field

    // Executar consulta (antes da paginação)
    let snapshot = await getDocs(q);

    let allUsers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as UserSchema));

    // Aplicar pesquisa, se houver termo
    if (options?.searchTerm) {
      const searchTermLower = options.searchTerm.toLowerCase();
      allUsers = allUsers.filter(user =>
        user.name.toLowerCase().includes(searchTermLower) ||
        user.email.toLowerCase().includes(searchTermLower)
      );
    }

    // Paginação
    const limitVal = options?.limit || 10; // Default limit
    const pageVal = options?.page || 1;     // Default page
    const startIndex = (pageVal - 1) * limitVal;
    const endIndex = startIndex + limitVal;

    const paginatedUsers = allUsers.slice(startIndex, endIndex);
    const totalPages = Math.ceil(allUsers.length / limitVal);

    return {
      data: paginatedUsers,
      totalPages,
      totalUsers: allUsers.length,
    };

  } catch (error: any) { // Use 'any' to access error.code
    console.error('Erro ao buscar usuários:', error);
    console.error('Error Code:', error.code); // Log the error code
    console.error('Error Message:', error.message); // Log the error message

    // More specific error handling (Firestore error codes)
    if (error.code === 'permission-denied') {
      throw new Error("You don't have permission to access this data.");
    } else if (error.code === 'not-found') {
      throw new Error("The requested data was not found.");
    } else if (error.code === 'failed-precondition') {
      throw new Error("The operation failed because of a missing index. Check the Firebase console for details.");
    } else {
      throw new Error("An error occurred while fetching users."); // Generic error
    }
  }
}

  // Buscar usuário por ID
  async getUserById(userId: string): Promise<UserSchema> {
    try {
      const userRef = doc(this.db, 'users', userId)
      const userSnap = await getDoc(userRef)

      if (userSnap.exists()) {
        return {
          id: userSnap.id,
          ...userSnap.data()
        } as UserSchema
      } else {
        throw new Error('Usuário não encontrado')
      }
    } catch (error) {
      console.error('Erro ao buscar usuário por ID:', error)
      throw error; // Re-throw for handling in component
    }
  }

  // Enviar email de redefinição de senha
  async sendPasswordResetEmail(email: string) {
    try {
      await sendPasswordResetEmail(this.auth, email)
    } catch (error) {
      console.error('Erro ao enviar email de redefinição:', error)
      throw error; // Re-throw for handling in component
    }
  }

  // Gerenciar moedas do usuário
  async updateUserCoins(
    userId: string,
    coinsToAdd: number
  ): Promise<number> {
    try {
      const userRef = doc(this.db, 'users', userId)
      const userDoc = await getDoc(userRef)

      if (!userDoc.exists()) {
        throw new Error('Usuário não encontrado')
      }

      const currentCoins = userDoc.data().coins || 0
      const newCoinBalance = currentCoins + coinsToAdd

      await updateDoc(userRef, {
        coins: newCoinBalance,
        updatedAt: Date.now()
      })

      return newCoinBalance
    } catch (error) {
      console.error('Erro ao atualizar moedas:', error)
      throw error; // Re-throw for handling in component (or logging)
    }
  }

  // Registrar histórico de transações de moedas
  async logCoinTransaction(
    userId: string,
    amount: number,
    description: string
  ) {
    try {
      const transactionRef = doc(collection(this.db, 'users', userId, 'coin_transactions'))

      await setDoc(transactionRef, {
        amount,
        description,
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('Erro ao registrar transação de moedas:', error)
      throw error; // Re-throw for handling in component (or logging)
    }
  }
}

export const userManagementService = new UserManagementService()
