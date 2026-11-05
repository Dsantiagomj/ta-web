import { describe, expect, it } from 'vitest'

import { Users } from '@/collections/Users'

// El panel de dev es público desde 2026-11-05: el inicio de sesión de Payload es la única
// barrera, así que bloquea la cuenta tras varios intentos fallidos.
describe('colección users', () => {
  it('bloquea la cuenta 10 minutos tras 5 intentos fallidos de inicio de sesión', () => {
    expect(Users.auth).toMatchObject({ maxLoginAttempts: 5, lockTime: 10 * 60 * 1000 })
  })
})
