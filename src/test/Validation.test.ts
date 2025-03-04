import { describe, it, expect } from 'vitest'
import { Validation } from '../utils/validation'

describe('Validation Utilities', () => {
  describe('Email Validation', () => {
    it('should validate correct email formats', () => {
      expect(Validation.isValidEmail('test@example.com')).toBe(true)
      expect(Validation.isValidEmail('user.name+tag@example.co.uk')).toBe(true)
    })

    it('should reject invalid email formats', () => {
      expect(Validation.isValidEmail('invalid-email')).toBe(false)
      expect(Validation.isValidEmail('missing@domain')).toBe(false)
      expect(Validation.isValidEmail('@missing-username.com')).toBe(false)
    })
  })

  describe('Password Validation', () => {
    it('should validate strong passwords', () => {
      expect(Validation.isStrongPassword('StrongPass123')).toBe(true)
      expect(Validation.isStrongPassword('SecureP@ssw0rd')).toBe(true)
    })

    it('should reject weak passwords', () => {
      expect(Validation.isStrongPassword('weak')).toBe(false)
      expect(Validation.isStrongPassword('onlylowercase')).toBe(false)
      expect(Validation.isStrongPassword('ONLYUPPERCASE')).toBe(false)
      expect(Validation.isStrongPassword('12345678')).toBe(false)
    })
  })

  describe('Name Validation', () => {
    it('should validate full names', () => {
      expect(Validation.isValidName('John Doe')).toBe(true)
      expect(Validation.isValidName('Maria Silva Santos')).toBe(true)
    })

    it('should reject single names', () => {
      expect(Validation.isValidName('John')).toBe(false)
      expect(Validation.isValidName('A')).toBe(false)
    })
  })

  describe('CPF Validation', () => {
    it('should validate correct CPF numbers', () => {
      expect(Validation.isValidCPF('111.444.777-35')).toBe(true)
      expect(Validation.isValidCPF('52998224725')).toBe(true)
    })

    it('should reject invalid CPF numbers', () => {
      expect(Validation.isValidCPF('111.111.111-11')).toBe(false)
      expect(Validation.isValidCPF('00000000000')).toBe(false)
      expect(Validation.isValidCPF('12345678900')).toBe(false)
    })
  })
})
