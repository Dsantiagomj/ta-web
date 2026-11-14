import type { CollectionSlug, Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Checklist, User } from '@/payload-types'

import { createPanelUser, startPayload } from './payload'

// Los campos que rompen datos al cambiarlos (docs/research/backlog.md, A-23): el orden y el
// enlace con DofusDB solo los cambia un administrador; la clave de un prerrequisito no
// cambia después de crearla, la cambie quien la cambie.

let payload: Payload
let admin: User
let editor: User

const PREFIX = 'prueba-candados'
const ACHIEVEMENT_IDS = [990_601, 990_602]
const CATEGORY_IDS = [990_611, 990_612]
const ITEM_IDS = [990_621, 990_622]
const QUEST_IDS = [990_631, 990_632]

async function cleanUp() {
  for (const collection of [
    'checklists',
    'dofus-guides',
    'achievement-pages',
    'achievement-groups',
    'quest-guides',
  ] as const) {
    await payload.delete({ collection, where: { slug: { like: PREFIX } } })
  }
  await payload.delete({ collection: 'achievements', where: { dofusId: { in: ACHIEVEMENT_IDS } } })
  await payload.delete({
    collection: 'achievement-categories',
    where: { dofusId: { in: CATEGORY_IDS } },
  })
  await payload.delete({ collection: 'items', where: { dofusId: { in: ITEM_IDS } } })
  await payload.delete({ collection: 'quests', where: { dofusId: { in: QUEST_IDS } } })
}

/** Dos registros de DofusDB: el que lleva el documento y otro al que intentar cambiarlo. */
const gameIds: Record<string, [number, number]> = {}

beforeAll(async () => {
  payload = await startPayload()
  await cleanUp()
  admin = await createPanelUser(payload, 'admin')
  editor = await createPanelUser(payload, 'editor')

  const pair = async (collection: CollectionSlug, dofusIds: number[], name: string) =>
    (await Promise.all(
      dofusIds.map(async (dofusId) => {
        const doc = await payload.create({
          collection,
          data: { dofusId, name: `${name} ${dofusId}` } as never,
        })
        return doc.id
      }),
    )) as [number, number]
  gameIds.achievements = await pair('achievements', ACHIEVEMENT_IDS, 'Logro')
  gameIds['achievement-categories'] = await pair('achievement-categories', CATEGORY_IDS, 'Zona')
  gameIds.items = await pair('items', ITEM_IDS, 'Dofus')
  gameIds.quests = await pair('quests', QUEST_IDS, 'Misión')
})

afterAll(async () => {
  await cleanUp()
  await payload.destroy()
})

const relationId = (value: unknown) =>
  value && typeof value === 'object' ? (value as { id: number }).id : value

interface Lock {
  collection: CollectionSlug
  field: string
  /** El documento con su valor de partida. */
  data: (slug: string) => Record<string, unknown>
  /** El valor al que se intenta cambiar. */
  changed: () => unknown
}

const locks: Lock[] = [
  {
    collection: 'dofus-guides',
    field: 'order',
    data: (slug) => ({ name: 'Dofus', slug, order: 10 }),
    changed: () => 11,
  },
  {
    collection: 'dofus-guides',
    field: 'dofus',
    data: (slug) => ({ name: 'Dofus', slug, order: 10, dofus: gameIds.items![0] }),
    changed: () => gameIds.items![1],
  },
  {
    collection: 'checklists',
    field: 'order',
    data: (slug) => ({ name: 'Checklist', slug, order: 10 }),
    changed: () => 11,
  },
  {
    collection: 'achievement-pages',
    field: 'order',
    data: (slug) => ({
      name: 'Página',
      slug,
      order: 3,
      achievement: gameIds.achievements![0],
    }),
    changed: () => 4,
  },
  {
    collection: 'achievement-pages',
    field: 'achievement',
    data: (slug) => ({ name: 'Página', slug, achievement: gameIds.achievements![0] }),
    changed: () => gameIds.achievements![1],
  },
  {
    collection: 'achievement-groups',
    field: 'order',
    data: (slug) => ({ name: 'Metalogro', slug, order: 3 }),
    changed: () => 4,
  },
  {
    collection: 'achievement-groups',
    field: 'category',
    data: (slug) => ({ name: 'Metalogro', slug, category: gameIds['achievement-categories']![0] }),
    changed: () => gameIds['achievement-categories']![1],
  },
  {
    collection: 'quest-guides',
    field: 'quest',
    data: (slug) => ({ title: 'Guía', slug, quest: gameIds.quests![0] }),
    changed: () => gameIds.quests![1],
  },
]

let counter = 0

describe.each(locks)('$collection, campo $field', ({ collection, field, data, changed }) => {
  async function attempt(user: User) {
    // Cada intento con su documento: el enlace con DofusDB es único.
    await payload.delete({ collection, where: { slug: { like: PREFIX } } })
    const created = await payload.create({
      collection,
      data: data(`${PREFIX}-${++counter}`) as never,
      user,
      overrideAccess: false,
    })
    const before = relationId((created as unknown as Record<string, unknown>)[field])
    const updated = await payload.update({
      collection,
      id: created.id,
      data: { [field]: changed() } as never,
      user,
      overrideAccess: false,
    })
    return { before, after: relationId((updated as unknown as Record<string, unknown>)[field]) }
  }

  it('el editor lo pone al crear, pero no lo cambia después', async () => {
    const { before, after } = await attempt(editor)
    expect(before).not.toBeNull()
    expect(after).toBe(before)
  })

  it('el administrador lo cambia', async () => {
    const { after } = await attempt(admin)
    expect(after).toBe(changed())
  })
})

describe('un campo bloqueado que se guardó vacío', () => {
  const empties: {
    collection: CollectionSlug
    field: string
    data: (slug: string) => Record<string, unknown>
    value: () => unknown
  }[] = [
    {
      collection: 'quest-guides',
      field: 'quest',
      data: (slug) => ({ title: 'Guía', slug }),
      value: () => gameIds.quests![0],
    },
    {
      collection: 'dofus-guides',
      field: 'dofus',
      data: (slug) => ({ name: 'Dofus', slug, order: 10, state: 'preparing' }),
      value: () => gameIds.items![0],
    },
    {
      collection: 'achievement-groups',
      field: 'category',
      data: (slug) => ({ name: 'Metalogro', slug, state: 'preparing' }),
      value: () => gameIds['achievement-categories']![0],
    },
    {
      collection: 'achievement-groups',
      field: 'order',
      data: (slug) => ({ name: 'Metalogro', slug, state: 'preparing' }),
      value: () => 5,
    },
  ]

  it.each(empties)(
    'el editor rellena $collection, campo $field, una vez',
    async ({ collection, field, data, value }) => {
      await payload.delete({ collection, where: { slug: { like: PREFIX } } })
      const created = await payload.create({
        collection,
        data: data(`${PREFIX}-${++counter}`) as never,
        user: editor,
        overrideAccess: false,
      })
      const filled = await payload.update({
        collection,
        id: created.id,
        data: { [field]: value() } as never,
        user: editor,
        overrideAccess: false,
      })
      expect(relationId((filled as unknown as Record<string, unknown>)[field])).toBe(value())
    },
  )
})

describe('la clave de un prerrequisito', () => {
  const keys = (doc: Checklist) =>
    (doc.prerequisites?.groups ?? []).flatMap((group) => (group.rows ?? []).map((row) => row.key))

  it.each([
    ['editor', () => editor],
    ['administrador', () => admin],
  ])('no cambia al editar la fila, ni para el %s; una fila nueva lleva la suya', async (_, who) => {
    const user = who()
    await payload.delete({ collection: 'checklists', where: { slug: { like: PREFIX } } })
    const created = await payload.create({
      collection: 'checklists',
      data: {
        name: 'Checklist',
        slug: `${PREFIX}-${++counter}`,
        order: 10,
        state: 'preparing',
        prerequisites: {
          groups: [{ title: 'Nivel', rows: [{ key: 'nivel-200', text: 'Nivel 200' }] }],
        },
      },
      user,
      overrideAccess: false,
    })
    const [group] = created.prerequisites!.groups!
    const [row] = group!.rows!

    const updated = await payload.update({
      collection: 'checklists',
      id: created.id,
      data: {
        prerequisites: {
          groups: [
            {
              id: group!.id,
              title: 'Nivel',
              rows: [
                { id: row!.id, key: 'otra-clave', text: 'Nivel 200 o más' },
                { key: 'nivel-100', text: 'Nivel 100' },
              ],
            },
          ],
        },
      },
      user,
      overrideAccess: false,
    })
    expect(keys(updated)).toEqual(['nivel-200', 'nivel-100'])
    expect(updated.prerequisites!.groups![0]!.rows![0]!.text).toBe('Nivel 200 o más')
  })

  async function savedChecklist() {
    await payload.delete({ collection: 'checklists', where: { slug: { like: PREFIX } } })
    return payload.create({
      collection: 'checklists',
      data: {
        name: 'Checklist',
        slug: `${PREFIX}-${++counter}`,
        order: 10,
        state: 'preparing',
        prerequisites: {
          groups: [
            { title: 'Nivel', rows: [{ key: 'nivel-200', text: 'Nivel 200' }] },
            { title: 'Hechizos', rows: [{ key: 'captura', text: 'Captura de almas' }] },
          ],
        },
      },
    })
  }

  it('movida a otro grupo por la API, la fila guarda su clave', async () => {
    const created = await savedChecklist()
    const [level, spells] = created.prerequisites!.groups!
    const updated = await payload.update({
      collection: 'checklists',
      id: created.id,
      data: {
        prerequisites: {
          groups: [
            { id: level!.id, title: 'Nivel', rows: [] },
            {
              id: spells!.id,
              title: 'Hechizos',
              rows: [
                { id: spells!.rows![0]!.id, key: 'captura', text: 'Captura de almas' },
                { id: level!.rows![0]!.id, key: 'otra-clave', text: 'Nivel 200' },
              ],
            },
          ],
        },
      },
      user: admin,
      overrideAccess: false,
    })
    expect(keys(updated)).toEqual(['captura', 'nivel-200'])
  })

  it('sin su id, la fila guardada de ese sitio no cambia de clave', async () => {
    const created = await savedChecklist()
    const [level, spells] = created.prerequisites!.groups!
    const updated = await payload.update({
      collection: 'checklists',
      id: created.id,
      data: {
        prerequisites: {
          groups: [
            { id: level!.id, title: 'Nivel', rows: [{ key: 'otra-clave', text: 'Nivel 200' }] },
            {
              id: spells!.id,
              title: 'Hechizos',
              rows: [{ key: 'captura', text: 'Captura de almas' }],
            },
          ],
        },
      },
      user: admin,
      overrideAccess: false,
    })
    expect(keys(updated)).toEqual(['nivel-200', 'captura'])
  })
})
