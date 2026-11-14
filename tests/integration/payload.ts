import { randomUUID } from 'node:crypto'
import { getPayload, type Payload } from 'payload'

import config from '@payload-config'
import type { User } from '@/payload-types'

export function startPayload(): Promise<Payload> {
  return getPayload({ config })
}

/** Un PNG de 1×1 px, para subir archivos sin tocar el disco. */
export function tinyPng(name = `prueba-${randomUUID()}.png`) {
  const data = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64',
  )
  return { data, mimetype: 'image/png', name, size: data.length }
}

/**
 * Crea un usuario del panel (como haría Torre desde el panel) e inicia sesión con él.
 * Por defecto es administrador, como Torre; `editor` crea, edita y publica, pero no borra.
 * Devuelve el usuario que Payload pone en req.user.
 */
export async function createPanelUser(
  payload: Payload,
  role: NonNullable<User['role']> = 'admin',
): Promise<User> {
  const email = `${role}-${randomUUID()}@torrentearcano.test`
  const password = `clave-${randomUUID()}`
  await payload.create({ collection: 'users', data: { email, password, role } })
  const { user } = await payload.login({ collection: 'users', data: { email, password } })
  if (!user) throw new Error(`No se pudo iniciar sesión con ${email}`)
  return user
}
