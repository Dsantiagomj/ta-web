import type { Payload } from 'payload'
import { describe, expect, it } from 'vitest'

import {
  adminCreateHref,
  adminDocHref,
  adminListHref,
  mergeRecent,
  readDashboard,
  type DashboardItem,
} from '@/lib/admin/dashboard'
import { panelStrings, relativeTime } from '@/lib/admin/strings'
import type { User } from '@/payload-types'

// A-13 (docs/research/backlog.md): el panel de control dice qué trabajar hoy. Las consultas
// van como la cuenta del panel, nunca saltándose el acceso. Lo que describe la web
// («En preparación», «sin checklist») se lee de lo publicado.

const user = { id: 1, email: 'torre@torrentearcano.test' } as User

type Call = { args: Record<string, unknown> }

const published = { _status: { equals: 'published' } }
const draftStatus = { _status: { equals: 'draft' } }

/** La clave de una respuesta: colección, si lee borradores y el filtro. */
const key = (collection: string, draft: boolean, where?: unknown) =>
  `${collection}:${draft ? 'draft' : 'published'}:${JSON.stringify(where)}`

/** Un Payload de mentira que apunta cada consulta y responde lo que le digan. */
function fakePayload(answers: Record<string, Record<string, unknown>[]> = {}) {
  const calls: Call[] = []
  const payload = {
    config: { routes: { admin: '/admin' } },
    collections: Object.fromEntries(
      [
        ['quest-guides', 'Guía de misión', 'Guías de misiones'],
        ['achievement-pages', 'Logro', 'Logros'],
        ['achievement-groups', 'Metalogro', 'Metalogros'],
        ['dofus-guides', 'Guía de Dofus', 'Guías de Dofus'],
        ['checklists', 'Checklist', 'Checklists'],
      ].map(([slug, singular, plural]) => [
        slug,
        { config: { slug, labels: { singular, plural } } },
      ]),
    ),
    find: async (args: Record<string, unknown>) => {
      calls.push({ args })
      const docs = answers[key(args.collection as string, args.draft === true, args.where)] ?? []
      return { docs, totalDocs: docs.length }
    },
  }
  return { payload: payload as unknown as Payload, calls }
}

const item = (over: Partial<DashboardItem>): DashboardItem => ({
  collection: 'quest-guides',
  collectionLabel: 'Guía de misión',
  id: 1,
  title: 'Una guía',
  updatedAt: '2026-11-10T10:00:00.000Z',
  href: '/admin/collections/quest-guides/1',
  ...over,
})

describe('enlaces del panel', () => {
  it('un documento se abre en su vista de edición, y uno nuevo en la de crear', () => {
    expect(adminDocHref('/admin', 'dofus-guides', 7)).toBe('/admin/collections/dofus-guides/7')
    expect(adminCreateHref('/admin', 'media')).toBe('/admin/collections/media/create')
  })

  it('una lista filtrada lleva el filtro en la dirección, con el valor codificado', () => {
    expect(adminListHref('/admin', 'achievement-pages', { state: 'preparing' })).toBe(
      '/admin/collections/achievement-pages?where%5Bstate%5D%5Bequals%5D=preparing',
    )
    expect(adminListHref('/admin', 'media', { alt: 'a&b c' })).toBe(
      '/admin/collections/media?where%5Balt%5D%5Bequals%5D=a%26b+c',
    )
    expect(adminListHref('/admin', 'media')).toBe('/admin/collections/media')
  })
})

describe('mergeRecent', () => {
  it('junta las colecciones, de lo más nuevo a lo más viejo, y corta en el límite', () => {
    const merged = mergeRecent(
      [
        [item({ id: 1, updatedAt: '2026-11-10T10:00:00.000Z' })],
        [
          item({ collection: 'checklists', id: 2, updatedAt: '2026-11-12T10:00:00.000Z' }),
          item({ collection: 'checklists', id: 3, updatedAt: '2026-11-09T10:00:00.000Z' }),
        ],
      ],
      2,
    )
    expect(merged.map((entry) => `${entry.collection}:${entry.id}`)).toEqual([
      'checklists:2',
      'quest-guides:1',
    ])
  })

  it('lo que no tiene fecha va al final, sin desordenar lo demás', () => {
    const merged = mergeRecent(
      [
        [item({ id: 1, updatedAt: '' }), item({ id: 2, updatedAt: '2026-11-10T10:00:00.000Z' })],
        [item({ id: 3, updatedAt: '2026-11-12T10:00:00.000Z' })],
      ],
      3,
    )
    expect(merged.map((entry) => entry.id)).toEqual([3, 2, 1])
  })
})

describe('readDashboard', () => {
  it('todas las consultas van como la cuenta del panel, sin saltarse el acceso', async () => {
    const { payload, calls } = fakePayload()
    await readDashboard(payload, user)
    expect(calls.length).toBeGreaterThan(0)
    for (const call of calls) {
      expect(call.args, JSON.stringify(call.args)).toMatchObject({
        overrideAccess: false,
        user,
        depth: 0,
      })
    }
  })

  it('no hace más de 19 consultas, todas a la vez', async () => {
    let running = 0
    let most = 0
    // Con borradores y Dofus sin checklist: antes, esas consultas esperaban a otras.
    const { payload, calls } = fakePayload({
      [key('quest-guides', true, draftStatus)]: [{ id: 4, title: 'Nueva' }],
      [key('dofus-guides', false, published)]: [{ id: 8, name: 'Dofus Nebuloso' }],
    })
    const find = payload.find.bind(payload)
    ;(payload as unknown as { find: unknown }).find = async (
      args: Parameters<Payload['find']>[0],
    ) => {
      running += 1
      most = Math.max(most, running)
      await new Promise((resolve) => setTimeout(resolve, 5))
      running -= 1
      return find(args)
    }
    await readDashboard(payload, user)
    expect(calls.length).toBeLessThanOrEqual(19)
    expect(most).toBe(calls.length)
  })

  it('los borradores son la última versión sin publicar de cada colección de Torre', async () => {
    const { payload, calls } = fakePayload()
    await readDashboard(payload, user)
    const drafts = calls.filter(
      (call) =>
        call.args.draft === true && JSON.stringify(call.args.where) === JSON.stringify(draftStatus),
    )
    expect(drafts.map((call) => call.args.collection).sort()).toEqual([
      'achievement-groups',
      'achievement-pages',
      'checklists',
      'dofus-guides',
      'quest-guides',
    ])
  })

  it('dice si un borrador nunca se publicó o tiene cambios sobre lo publicado', async () => {
    const { payload } = fakePayload({
      [key('quest-guides', true, draftStatus)]: [
        { id: 4, title: 'Nueva', updatedAt: '2026-11-12T10:00:00.000Z' },
        { id: 5, title: 'Retocada', updatedAt: '2026-11-11T10:00:00.000Z' },
      ],
      // Lo guardado sin versión publicada sigue como borrador en la colección.
      [key('quest-guides', false, draftStatus)]: [{ id: 4 }],
    })
    const { drafts } = await readDashboard(payload, user)
    expect(drafts.items).toEqual([
      expect.objectContaining({ id: 4, title: 'Nueva', neverPublished: true }),
      expect.objectContaining({ id: 5, title: 'Retocada', neverPublished: false }),
    ])
    expect(drafts.total).toBe(2)
  })

  it('«En preparación» lee lo publicado, solo donde hay «Visible en la web»', async () => {
    const preparing = { and: [published, { state: { equals: 'preparing' } }] }
    const { payload, calls } = fakePayload({
      [key('achievement-pages', false, preparing)]: [
        { id: 7, name: 'La gran biblioteca', updatedAt: '2026-11-12T10:00:00.000Z' },
      ],
      [key('dofus-guides', false, published)]: [
        { id: 8, name: 'Jyfus', state: 'preparing', updatedAt: '2026-11-12T10:00:00.000Z' },
        { id: 9, name: 'Dofus Ocre', state: 'published', updatedAt: '2026-11-12T10:00:00.000Z' },
      ],
    })
    const dashboard = await readDashboard(payload, user)
    const groups = Object.fromEntries(
      dashboard.preparing.map((group) => [group.collection, group.items.map((i) => i.id)]),
    )
    expect(groups).toEqual({ 'achievement-pages': [7], 'dofus-guides': [8] })
    // Ninguna consulta de «En preparación» mira borradores.
    const stateQueries = calls.filter((call) =>
      (JSON.stringify(call.args.where) ?? '').includes('state'),
    )
    expect(stateQueries.every((call) => call.args.draft !== true)).toBe(true)
    expect(stateQueries.map((call) => call.args.collection).sort()).toEqual([
      'achievement-groups',
      'achievement-pages',
    ])
  })

  it('un Dofus publicado sin nombre o sin enlace de checklist no enseña la tarjeta', async () => {
    const { payload } = fakePayload({
      [key('dofus-guides', false, published)]: [
        { id: 1, name: 'Sin nada', state: 'published' },
        { id: 2, name: 'Solo enlace', state: 'published', checklist: { url: 'https://x.test' } },
        { id: 3, name: 'Solo nombre', state: 'published', checklist: { name: 'Lista' } },
        {
          id: 4,
          name: 'Completa',
          state: 'published',
          checklist: { name: 'Lista', url: 'https://x.test' },
        },
      ],
    })
    const { dofusWithoutChecklist } = await readDashboard(payload, user)
    expect(dofusWithoutChecklist.items.map((entry) => entry.id)).toEqual([1, 2, 3])
    expect(dofusWithoutChecklist.total).toBe(3)
  })

  it('la checklist que apunta a un Dofus es la primera publicada en el orden de Torre', async () => {
    const { payload, calls } = fakePayload({
      [key('dofus-guides', false, published)]: [{ id: 8, name: 'Dofus Nebuloso' }],
      [key('checklists', false, published)]: [
        { id: 2, name: 'Nebuloso', order: 1, dofusGuide: 8 },
        { id: 3, name: 'Nebuloso (bis)', order: 2, dofusGuide: 8 },
        { id: 4, name: 'Otra', order: 3, dofusGuide: { id: 9 } },
      ],
    })
    const { dofusWithoutChecklist } = await readDashboard(payload, user)
    expect(dofusWithoutChecklist.items).toEqual([
      expect.objectContaining({ id: 8, title: 'Dofus Nebuloso', checklistName: 'Nebuloso' }),
    ])
    const lookup = calls.find(
      (call) =>
        call.args.collection === 'checklists' &&
        JSON.stringify(call.args.where) === JSON.stringify(published),
    )
    expect(lookup?.args).toMatchObject({ sort: 'order', pagination: false })
  })

  it('las guías de misiones se llaman por su título y el resto por su nombre', async () => {
    const { payload } = fakePayload({
      [key('quest-guides', true)]: [{ id: 1, title: 'Guía', updatedAt: '2026-11-12T10:00:00Z' }],
      [key('checklists', true)]: [{ id: 2, name: 'Lista', updatedAt: '2026-11-13T10:00:00Z' }],
    })
    const { recent } = await readDashboard(payload, user)
    expect(recent.map((entry) => entry.title)).toEqual(['Lista', 'Guía'])
    expect(recent[0]).toMatchObject({
      collectionLabel: 'Checklist',
      href: '/admin/collections/checklists/2',
    })
  })
})

describe('relativeTime', () => {
  const now = new Date('2026-11-13T20:00:00.000Z')
  it('dice cuánto hace, sin depender de la zona horaria', () => {
    expect(relativeTime('2026-11-13T19:59:40.000Z', now)).toBe('ahora mismo')
    expect(relativeTime('2026-11-13T19:59:00.000Z', now)).toBe('hace 1 minuto')
    expect(relativeTime('2026-11-13T19:15:00.000Z', now)).toBe('hace 45 minutos')
    expect(relativeTime('2026-11-13T17:00:00.000Z', now)).toBe('hace 3 horas')
    expect(relativeTime('2026-11-12T19:00:00.000Z', now)).toBe('hace 1 día')
    expect(relativeTime('2026-11-01T20:00:00.000Z', now)).toBe('hace 12 días')
  })

  it('pasado un mes, la fecha en la hora de Torre (Madrid); sin fecha, nada', () => {
    // 23:30 en UTC ya es el 2 de septiembre en Madrid, sea cual sea la zona del servidor.
    expect(relativeTime('2026-09-01T23:30:00.000Z', now)).toBe('2 de septiembre de 2026')
    expect(relativeTime('', now)).toBe('')
  })
})

describe('los textos del panel de control', () => {
  it('los cambios recientes son de cualquiera, no solo de quien mira', () => {
    expect(panelStrings.dashboard.recentEmpty).not.toMatch(/\bhas\b/)
  })
})
