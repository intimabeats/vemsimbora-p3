// Validações reutilizáveis e abrangentes
export const Validation = {
  // Validação de email com suporte a múltiplos domínios e caracteres especiais
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    return emailRegex.test(email)
  },

  // Validação de senha robusta
  isStrongPassword: (password: string): boolean => {
    // Requisitos:
    // - Mínimo 8 caracteres
    // - Pelo menos uma letra maiúscula
    // - Pelo menos uma letra minúscula
    // - Pelo menos um número
    // - Pelo menos um caractere especial
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    return passwordRegex.test(password)
  },

  // Validação de nome completo com suporte a acentuação
  isValidName: (name: string): boolean => {
    // Nome com pelo menos duas palavras, suportando caracteres acentuados
    const nameRegex = /^[A-Za-zÀ-ÿ]+\s[A-Za-zÀ-ÿ]+(\s[A-Za-zÀ-ÿ]+)*$/
    return nameRegex.test(name)
  },

  // Validação de CPF com algoritmo de verificação
  isValidCPF: (cpf: string): boolean => {
    // Remover caracteres não numéricos
    cpf = cpf.replace(/[^\d]/g, '')
    
    // Verificar se tem 11 dígitos
    if (cpf.length !== 11) return false

    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cpf)) return false

    // Calcular primeiro dígito verificador
    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i)
    }
    let remainder = 11 - (sum % 11)
    if (remainder === 10 || remainder === 11) remainder = 0
    if (remainder !== parseInt(cpf.charAt(9))) return false

    // Calcular segundo dígito verificador
    sum = 0
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i)
    }
    remainder = 11 - (sum % 11)
    if (remainder === 10 || remainder === 11) remainder = 0
    if (remainder !== parseInt(cpf.charAt(10))) return false

    return true
  },

  // Validação de CNPJ
  isValidCNPJ: (cnpj: string): boolean => {
    // Remover caracteres não numéricos
    cnpj = cnpj.replace(/[^\d]/g, '')
    
    // Verificar se tem 14 dígitos
    if (cnpj.length !== 14) return false

    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cnpj)) return false

    // Calcular primeiro dígito verificador
    let sum = 0
    let weight = 2
    for (let i = 11; i >= 0; i--) {
      sum += parseInt(cnpj.charAt(i)) * weight
      weight = weight === 9 ? 2 : weight + 1
    }
    let remainder = sum % 11
    let digit1 = remainder < 2 ? 0 : 11 - remainder

    // Calcular segundo dígito verificador
    sum = 0
    weight = 2
    for (let i = 12; i >= 0; i--) {
      sum += parseInt(cnpj.charAt(i)) * weight
      weight = weight === 9 ? 2 : weight + 1
    }
    remainder = sum % 11
    let digit2 = remainder < 2 ? 0 : 11 - remainder

    // Verificar dígitos verificadores
    return (
      parseInt(cnpj.charAt(12)) === digit1 &&
      parseInt(cnpj.charAt(13)) === digit2
    )
  },

  // Validação de telefone brasileiro
  isValidPhoneNumber: (phone: string): boolean => {
    // Formatos: (11) 99999-9999, 11999999999, +55 11 99999-9999
    const phoneRegex = /^(\+?55\s?)?(\(?[1-9]{2}\)?)\s?([9]{1}[6-9]{1}[0-9]{3}[-]?[0-9]{4})$/
    return phoneRegex.test(phone)
  },

  // Validação de URL
  isValidURL: (url: string): boolean => {
    const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/
    return urlRegex.test(url)
  },

  // Validação de data
  isValidDate: (date: string): boolean => {
    // Formato: YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) return false

    const parsedDate = new Date(date)
    return parsedDate instanceof Date && !isNaN(parsedDate.getTime())
  },

  // Validação de idade mínima
  isMinimumAge: (birthdate: string, minimumAge: number): boolean => {
    const birthdateObj = new Date(birthdate)
    const today = new Date()
    
    let age = today.getFullYear() - birthdateObj.getFullYear()
    const monthDiff = today.getMonth() - birthdateObj.getMonth()
    
    if (
      monthDiff < 0 || 
      (monthDiff === 0 && today.getDate() < birthdateObj.getDate())
    ) {
      age--
    }

    return age >= minimumAge
  },

  // Sanitização de entrada
  sanitizeInput: (input: string): string => {
    return input
      .trim()
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
  },

  // Validação de formato de arquivo
  isValidFileType: (
    file: File, 
    allowedTypes: string[]
  ): boolean => {
    return allowedTypes.includes(file.type)
  },

  // Validação de tamanho de arquivo
  isValidFileSize: (
    file: File, 
    maxSizeInMB: number
  ): boolean => {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024
    return file.size <= maxSizeInBytes
  }
}

// Utilitários de validação adicionais
export const ValidationUtils = {
  // Máscara de CPF
  maskCPF: (cpf: string): string => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  },

  // Máscara de CNPJ
  maskCNPJ: (cnpj: string): string => {
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  },

  // Máscara de telefone
  maskPhoneNumber: (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    }
    return phone
  }
}
