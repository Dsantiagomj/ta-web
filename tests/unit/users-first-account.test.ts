import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { firstAccountIsAdmin } from '@/collections/Users'

// La primera cuenta es administradora (backlog A-15). Se mira con una sola fila, no
// contando todas las cuentas en cada alta.
describe('firstAccountIsAdmin', () => {
  const reqWith = (existing: number) => {
    const finds: Record<string, unknown>[] = []
    const req = {
      payload: {
        count: () => {
          throw new Error('no cuenta todas las cuentas')
        },
        find: async (args: Record<string, unknown>) => {
          finds.push(args)
          return { docs: Array.from({ length: Math.min(existing, 1) }, (_, id) => ({ id })) }
        },
      },
    } as unknown as PayloadRequest
    return { req, finds }
  }

  it('con la base vacía, la cuenta sale administradora', async () => {
    const { req, finds } = reqWith(0)
    const data = await firstAccountIsAdmin({
      data: { role: 'editor' },
      operation: 'create',
      req,
    } as never)
    expect(data).toMatchObject({ role: 'admin' })
    expect(finds).toEqual([expect.objectContaining({ limit: 1 })])
  })

  it('con otras cuentas, se queda como viene', async () => {
    const { req } = reqWith(3)
    const data = await firstAccountIsAdmin({
      data: { role: 'editor' },
      operation: 'create',
      req,
    } as never)
    expect(data).toMatchObject({ role: 'editor' })
  })

  it('al editar una cuenta no consulta nada', async () => {
    const { req, finds } = reqWith(0)
    await firstAccountIsAdmin({ data: { name: 'Torre' }, operation: 'update', req } as never)
    expect(finds).toEqual([])
  })
})
