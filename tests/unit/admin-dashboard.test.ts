import type { Payload } from 'payload'
import { describe, expect, it } from 'vitest'

import {
  adminDocHref,
  adminListHref,
  mergeRecent,
  readDashboard,
  type DashboardItem,
} from '@/lib/admin/dashboard'
import { relativeTime } from '@/lib/admin/strings'
import type { User } from '@/payload-types'

// A-13 (docs/research/backlog.md): el panel de control dice qué trabajar hoy. Las consultas
// van como la cuenta del panel, nunca saltándose el acceso.

const user = { id: 1, email: 'torre@torrentearcano.test' } as User

type Call = { method: string; args: Record<string, unknown> }

/** Un Payload de mentira que apunta cada consulta y responde lo que le digan por colección. */
function fakePayload(answers: Record<string, Record<string, unknown>[]> = {}) {
  const calls: Call[] = []
  const payload = {
    config: { routes: { admin: '/admin' } },
    collections: Object.fromEntries(
      [
        ['quest-guides', 'Guía de misión'],
        ['achievement-pages', 'Logro'],
        ['achievement-groups', 'Metalogro'],
        ['dofus-guides', 'Guía de Dofus'],
        ['checklists', 'Checklist'],
      ].map(([slug, singular]) => [slug, { config: { slug, labels: { singular } } }]),
    ),
    find: async (args: Record<string, unknown>) => {
      calls.push({ method: 'find', args })
      const docs = answers[`${args.collection as string}:${JSON.stringify(args.where)}`] ?? []
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
  it('un documento se abre en su vista de edición', () => {
    expect(adminDocHref('/admin', 'dofus-guides', 7)).toBe('/admin/collections/dofus-guides/7')
  })

  it('una lista filtrada lleva el filtro en la dirección', () => {
    expect(adminListHref('/admin', 'achievement-pages', { state: 'preparing' })).toBe(
      '/admin/collections/achievement-pages?where%5Bstate%5D%5Bequals%5D=preparing',
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

  it('los borradores son la última versión sin publicar de cada colección de Torre', async () => {
    const { payload, calls } = fakePayload()
    await readDashboard(payload, user)
    const drafts = calls.filter(
      (call) =>
        call.args.draft === true &&
        JSON.stringify(call.args.where) === JSON.stringify({ _status: { equals: 'draft' } }),
    )
    expect(drafts.map((call) => call.args.collection).sort()).toEqual([
      'achievement-groups',
      'achievement-pages',
      'checklists',
      'dofus-guides',
      'quest-guides',
    ])
  })

  it('«En preparación» se busca solo donde hay «Visible en la web»', async () => {
    const { payload, calls } = fakePayload()
    await readDashboard(payload, user)
    const preparing = calls.filter(
      (call) =>
        JSON.stringify(call.args.where) === JSON.stringify({ state: { equals: 'preparing' } }),
    )
    expect(preparing.map((call) => call.args.collection).sort()).toEqual([
      'achievement-groups',
      'achievement-pages',
      'checklists',
      'dofus-guides',
    ])
  })

  it('dice si un borrador nunca se publicó o tiene cambios sobre lo publicado', async () => {
    const draft = { _status: { equals: 'draft' } }
    const { payload } = fakePayload({
      [`quest-guides:${JSON.stringify(draft)}`]: [
        { id: 4, title: 'Nueva', updatedAt: '2026-11-12T10:00:00.000Z' },
        { id: 5, title: 'Retocada', updatedAt: '2026-11-11T10:00:00.000Z' },
      ],
      [`quest-guides:${JSON.stringify({
        and: [{ id: { in: [4, 5] } }, { _status: { equals: 'published' } }],
      })}`]: [{ id: 5 }],
    })
    const { drafts } = await readDashboard(payload, user)
    expect(drafts.items).toEqual([
      expect.objectContaining({ id: 4, title: 'Nueva', neverPublished: true }),
      expect.objectContaining({ id: 5, title: 'Retocada', neverPublished: false }),
    ])
    expect(drafts.total).toBe(2)
  })

  it('un Dofus sin enlace de checklist sale, con la checklist que ya apunta a él', async () => {
    const { payload } = fakePayload({
      [`dofus-guides:${JSON.stringify({
        or: [{ 'checklist.url': { exists: false } }, { 'checklist.url': { equals: '' } }],
      })}`]: [
        { id: 8, name: 'Dofus Nebuloso', updatedAt: '2026-11-12T10:00:00.000Z' },
        { id: 9, name: 'Dofus Ocre', updatedAt: '2026-11-12T10:00:00.000Z' },
      ],
      [`checklists:${JSON.stringify({ dofusGuide: { in: [8, 9] } })}`]: [
        { id: 2, name: 'Nebuloso', dofusGuide: 8 },
      ],
    })
    const { dofusWithoutChecklist } = await readDashboard(payload, user)
    expect(dofusWithoutChecklist.items).toEqual([
      expect.objectContaining({ id: 8, title: 'Dofus Nebuloso', checklistName: 'Nebuloso' }),
      expect.objectContaining({ id: 9, title: 'Dofus Ocre', checklistName: null }),
    ])
  })

  it('las guías de misiones se llaman por su título y el resto por su nombre', async () => {
    const { payload } = fakePayload({
      [`quest-guides:undefined`]: [{ id: 1, title: 'Guía', updatedAt: '2026-11-12T10:00:00Z' }],
      [`checklists:undefined`]: [{ id: 2, name: 'Lista', updatedAt: '2026-11-13T10:00:00Z' }],
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

  it('pasado un mes, la fecha; sin fecha, nada', () => {
    expect(relativeTime('2026-09-01T12:00:00.000Z', now)).toBe('1 de septiembre de 2026')
    expect(relativeTime('', now)).toBe('')
  })
})
