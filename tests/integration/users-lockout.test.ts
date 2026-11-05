import { randomUUID } from 'node:crypto'

import { AuthenticationError, LockedAuth, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { startPayload } from './payload'

// El panel de dev es público: el inicio de sesión de Payload bloquea la cuenta tras 5
// intentos fallidos, y durante el bloqueo ni la contraseña correcta entra.
describe('bloqueo de users tras intentos fallidos', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await startPayload()
  })

  afterAll(async () => {
    await payload.destroy()
  })

  async function panelAccount() {
    const email = `bloqueo-${randomUUID()}@torrentearcano.test`
    const password = `clave-${randomUUID()}`
    await payload.create({ collection: 'users', data: { email, password } })
    return { email, password }
  }

  function login(email: string, password: string) {
    return payload.login({ collection: 'users', data: { email, password } })
  }

  it('tras 5 contraseñas incorrectas bloquea la cuenta, también para la correcta', async () => {
    const { email, password } = await panelAccount()

    for (let attempt = 1; attempt <= 5; attempt++) {
      await expect(login(email, 'incorrecta')).rejects.toThrow(AuthenticationError)
    }

    await expect(login(email, password)).rejects.toThrow(LockedAuth)
  })

  it('4 intentos fallidos no bloquean: la contraseña correcta sigue entrando', async () => {
    const { email, password } = await panelAccount()

    for (let attempt = 1; attempt <= 4; attempt++) {
      await expect(login(email, 'incorrecta')).rejects.toThrow(AuthenticationError)
    }

    const { user } = await login(email, password)
    expect(user?.email).toBe(email)
  })
})
