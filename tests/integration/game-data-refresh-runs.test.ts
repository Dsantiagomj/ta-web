import { Forbidden, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { GAME_DATA_COLLECTIONS, type GameDataSummary } from '@/lib/dofusdb/refresh-game-data'
import {
  lastGameDataRefresh,
  STALE_AFTER_MS,
  startGameDataRefresh,
} from '@/lib/game-data/refresh-runs'
import type { User } from '@/payload-types'

import { createPanelUser, startPayload } from './payload'

// Cada refresco de los datos del juego deja una fila en «Refrescos de datos»: quién lo
// lanzó, cuándo y cómo acabó. Dos no corren a la vez, ni desde dos procesos (la tarea de
// Railway y el panel): la fila en marcha lleva `lock`, único en la base.

function summary(failedItems = 0): GameDataSummary {
  const collections = Object.fromEntries(
    GAME_DATA_COLLECTIONS.map((collection) => [
      collection,
      { created: 0, updated: 1, unchanged: 10, failed: 0 },
    ]),
  ) as GameDataSummary['collections']
  collections.items.failed = failedItems
  return {
    collections,
    images: { imported: 0, reused: 0, failed: 0 },
    newPages: { groups: 0, pages: 0 },
    missing: { prerequisites: 0, items: 0, monsters: 0, bosses: 0, quests: 0 },
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

let payload: Payload
let admin: User
let editor: User

beforeAll(async () => {
  payload = await startPayload()
  admin = await createPanelUser(payload, 'admin')
  editor = await createPanelUser(payload, 'editor')
})

beforeEach(async () => {
  await payload.delete({ collection: 'game-data-refreshes', where: { id: { exists: true } } })
})

afterAll(async () => {
  await payload.delete({ collection: 'game-data-refreshes', where: { id: { exists: true } } })
  await payload.destroy()
})

describe('startGameDataRefresh', () => {
  it('apunta el refresco en marcha y, al acabar, el resultado con su resumen', async () => {
    const start = await startGameDataRefresh(payload, {
      trigger: 'panel',
      requestedBy: admin.id,
      refresh: async () => summary(),
    })
    expect(start.status).toBe('started')
    if (start.status !== 'started') return
    expect(start.run).toMatchObject({ status: 'running', trigger: 'panel', lock: 'running' })

    const run = await start.done
    expect(run).toMatchObject({ status: 'ok', trigger: 'panel', lock: null })
    expect(run.finishedAt).toBeTruthy()
    expect(run.report).toMatch(/^Misiones: 0 creadas, 1 actualizadas, 10 sin cambios/)
    const saved = await payload.findByID({ collection: 'game-data-refreshes', id: run.id })
    expect(saved.requestedBy).toMatchObject({ id: admin.id })
  })

  it('no empieza otro mientras uno sigue en marcha', async () => {
    const gate = deferred<GameDataSummary>()
    const first = await startGameDataRefresh(payload, {
      trigger: 'schedule',
      refresh: () => gate.promise,
    })
    expect(first.status).toBe('started')

    const second = await startGameDataRefresh(payload, {
      trigger: 'panel',
      refresh: async () => summary(),
    })
    expect(second.status).toBe('busy')
    if (second.status === 'busy') expect(second.running.trigger).toBe('schedule')

    gate.resolve(summary())
    if (first.status === 'started') await first.done
    const third = await startGameDataRefresh(payload, {
      trigger: 'panel',
      refresh: async () => summary(),
    })
    expect(third.status).toBe('started')
    if (third.status === 'started') await third.done
  })

  it('si el refresco falla, lo apunta con el error y suelta el turno', async () => {
    const start = await startGameDataRefresh(payload, {
      trigger: 'script',
      refresh: async () => {
        throw new Error('DofusDB no responde')
      },
    })
    if (start.status !== 'started') throw new Error('debía empezar')

    const run = await start.done
    expect(run).toMatchObject({ status: 'failed', lock: null })
    expect(run.error).toMatch('DofusDB no responde')

    const next = await startGameDataRefresh(payload, {
      trigger: 'script',
      refresh: async () => summary(),
    })
    expect(next.status).toBe('started')
    if (next.status === 'started') await next.done
  })

  it('con filas que no se guardaron, acaba «con fallos»', async () => {
    const start = await startGameDataRefresh(payload, {
      trigger: 'schedule',
      refresh: async () => summary(3),
    })
    if (start.status !== 'started') throw new Error('debía empezar')
    expect(await start.done).toMatchObject({ status: 'partial', lock: null })
  })

  it('uno que se cortó hace horas (el proceso murió) no bloquea para siempre', async () => {
    const old = await payload.create({
      collection: 'game-data-refreshes',
      data: {
        trigger: 'schedule',
        status: 'running',
        lock: 'running',
        startedAt: new Date(Date.now() - STALE_AFTER_MS - 60_000).toISOString(),
      },
    })

    const start = await startGameDataRefresh(payload, {
      trigger: 'panel',
      refresh: async () => summary(),
    })
    expect(start.status).toBe('started')
    if (start.status === 'started') await start.done

    const cut = await payload.findByID({ collection: 'game-data-refreshes', id: old.id })
    expect(cut).toMatchObject({ status: 'failed', lock: null })
    expect(cut.error).toMatch(/se cortó/i)
  })
})

describe('lastGameDataRefresh', () => {
  it('da el último que empezó, o null si no hay ninguno', async () => {
    expect(await lastGameDataRefresh(payload)).toBeNull()
    for (const trigger of ['schedule', 'panel'] as const) {
      const start = await startGameDataRefresh(payload, { trigger, refresh: async () => summary() })
      if (start.status === 'started') await start.done
    }
    expect(await lastGameDataRefresh(payload)).toMatchObject({ trigger: 'panel', status: 'ok' })
  })
})

describe('permisos de «Refrescos de datos»', () => {
  it('sin sesión no se ven', async () => {
    await expect(
      payload.find({ collection: 'game-data-refreshes', overrideAccess: false }),
    ).rejects.toThrow(Forbidden)
  })

  it('el panel los lee, pero nadie los escribe ni borra a mano, ni un administrador', async () => {
    const start = await startGameDataRefresh(payload, {
      trigger: 'panel',
      refresh: async () => summary(),
    })
    if (start.status !== 'started') throw new Error('debía empezar')
    const run = await start.done

    const read = await payload.find({
      collection: 'game-data-refreshes',
      overrideAccess: false,
      user: editor,
    })
    expect(read.docs.map((doc) => doc.id)).toContain(run.id)

    for (const user of [editor, admin]) {
      await expect(
        payload.create({
          collection: 'game-data-refreshes',
          data: { trigger: 'panel', status: 'ok', startedAt: new Date().toISOString() },
          overrideAccess: false,
          user,
        }),
      ).rejects.toThrow(Forbidden)
      await expect(
        payload.update({
          collection: 'game-data-refreshes',
          id: run.id,
          data: { status: 'failed' },
          overrideAccess: false,
          user,
        }),
      ).rejects.toThrow(Forbidden)
      await expect(
        payload.delete({
          collection: 'game-data-refreshes',
          id: run.id,
          overrideAccess: false,
          user,
        }),
      ).rejects.toThrow(Forbidden)
    }
  })
})
