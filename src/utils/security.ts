import { 
  getAuth, 
  reauthenticateWithCredential, 
  EmailAuthProvider,
  multiFactor,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier
} from 'firebase/auth'
import { 
  getFirestore, 
  doc, 
  setDoc, 
  updateDoc,
  getDoc,
  collection,
  addDoc
} from 'firebase/firestore'

// Tipos de log de segurança
type SecurityLogType = 
  | 'login_attempt'
  | 'password_change'
  | 'profile_update'
  | 'suspicious_activity'
  | 'two_factor_setup'

export const SecurityUtils = {
  // Gerar código de verificação
  generateVerificationCode: (length: number = 6): string => {
    return Array.from(
      { length }, 
      () => Math.floor(Math.random() * 10)
    ).join('')
  },

  // Verificar atividades suspeitas
  detectSuspiciousActivity: (
    loginAttempts: number, 
    lastLoginTime: number
  ): boolean => {
    const MAX_ATTEMPTS = 5
    const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutos

    const timeSinceLastLogin = Date.now() - lastLoginTime

    return (
      loginAttempts >= MAX_ATTEMPTS && 
      timeSinceLastLogin < LOCKOUT_DURATION
    )
  },

  // Reautenticar usuário antes de ações sensíveis
  reauthenticateUser: async (email: string, password: string) => {
    const auth = getAuth()
    const user = auth.currentUser

    if (!user || !user.email) {
      throw new Error('Usuário não autenticado')
    }

    try {
      const credential = EmailAuthProvider.credential(email, password)
      await reauthenticateWithCredential(user, credential)
      return true
    } catch (error) {
      console.error('Erro de reautenticação:', error)
      throw error
    }
  },

  // Configurar autenticação de dois fatores
  setupTwoFactorAuth: async (phoneNumber: string) => {
    const auth = getAuth()
    const user = auth.currentUser

    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    try {
      const multiFactorUser = multiFactor(user)
      const phoneAuthProvider = new PhoneAuthProvider(auth)
      
      // Create a reCAPTCHA verifier (required for phone auth)
      const appVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });

      // Iniciar registro de telefone
      const session = await multiFactorUser.getSession()
      const phoneVerificationInfo = await phoneAuthProvider.verifyPhoneNumber(
        {
          phoneNumber,
          session
        }, 
        appVerifier
      )

      return phoneVerificationInfo
    } catch (error) {
      console.error('Erro ao configurar 2FA:', error)
      throw error
    }
  },

  // Registrar log de segurança
  logSecurityEvent: async (
    userId: string, 
    eventType: SecurityLogType, 
    details: Record<string, any>
  ) => {
    const db = getFirestore()

    try {
      const securityLogsCollection = collection(db, 'users', userId, 'security_logs')
      
      await addDoc(securityLogsCollection, {
        type: eventType,
        timestamp: Date.now(),
        ...details
      })
    } catch (error) {
      console.error('Erro ao registrar log de segurança:', error)
      throw error
    }
  },

  // Máscarar informações sensíveis
  maskSensitiveData: {
    email: (email: string) => {
      if (!email) return ''
      const [username, domain] = email.split('@')
      return `${username.slice(0, 2)}****@${domain}`
    },
    
    cpf: (cpf: string) => {
      if (!cpf) return ''
      return `***${cpf.slice(-4)}`
    },

    phoneNumber: (phone: string) => {
      if (!phone) return ''
      return `+55 (${phone.slice(0, 2)}) ****-${phone.slice(-4)}`
    }
  },

  // Middleware de segurança para ações críticas
  protectAction: async <T>(
    action: () => Promise<T>, 
    options?: {
      requireReauth?: boolean
      requiredRole?: 'admin' | 'manager' | 'employee'
      twoFactorRequired?: boolean
    }
  ): Promise<T> => {
    const auth = getAuth()
    const user = auth.currentUser

    // Verificar autenticação
    if (!user) {
      throw new Error('Usuário não autenticado')
    }

    // Verificar role, se necessário
    if (options?.requiredRole) {
      const db = getFirestore()
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      
      if (!userDoc.exists()) {
        throw new Error('Dados do usuário não encontrados')
      }

      const userData = userDoc.data()
      if (userData.role !== options.requiredRole) {
        throw new Error('Permissão insuficiente')
      }
    }

    // Reautenticação, se necessário
    if (options?.requireReauth) {
      // Lógica de reautenticação
      // Pode solicitar senha novamente
    }

    // Verificação de dois fatores, se necessário
    if (options?.twoFactorRequired) {
      const multiFactorUser = multiFactor(user)
      const enrolledFactors = multiFactorUser.enrolledFactors

      if (!enrolledFactors || enrolledFactors.length === 0) {
        throw new Error('Autenticação de dois fatores não configurada')
      }
    }

    // Executar ação protegida
    return action()
  }
}

// Gerador de tokens de segurança
export const TokenGenerator = {
  generateSecureToken: (length: number = 32): string => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    return Array.from(
      crypto.getRandomValues(new Uint32Array(length))
    ).map((x) => charset[x % charset.length]).join('')
  },

  generateTemporaryAccessToken: (
    userId: string, 
    expirationMinutes: number = 30
  ): { token: string, expiresAt: number } => {
    const token = TokenGenerator.generateSecureToken()
    const expiresAt = Date.now() + (expirationMinutes * 60 * 1000)

    return { token, expiresAt }
  }
}
