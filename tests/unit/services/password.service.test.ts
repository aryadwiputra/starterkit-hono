import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { passwordService } from '../../../src/services/password.service'

describe('Password Service', () => {
  test('should hash password', async () => {
    const password = 'testpassword123'
    const hash = await passwordService.hash(password)

    expect(hash).toBeTruthy()
    expect(hash).not.toBe(password)
    expect(hash.length).toBeGreaterThan(50)
  })

  test('should verify correct password', async () => {
    const password = 'testpassword123'
    const hash = await passwordService.hash(password)
    const isValid = await passwordService.verify(password, hash)

    expect(isValid).toBe(true)
  })

  test('should reject incorrect password', async () => {
    const password = 'testpassword123'
    const hash = await passwordService.hash(password)
    const isValid = await passwordService.verify('wrongpassword', hash)

    expect(isValid).toBe(false)
  })

  test('should generate different hashes for same password', async () => {
    const password = 'testpassword123'
    const hash1 = await passwordService.hash(password)
    const hash2 = await passwordService.hash(password)

    expect(hash1).not.toBe(hash2)
  })
})
