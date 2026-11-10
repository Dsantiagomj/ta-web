import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { readDofusGuide, readDofusList } from '@/lib/dofus-guides/queries'
import type { User } from '@/payload-types'

import { createPanelUser, startPayload } from './payload'

// Lo que lee la página de una guía de Dofus, como un visitante (overrideAccess: false): solo
// lo publicado, y una guía En preparación no tiene página. Con la vista previa del panel, sí.
// Lo que enlaza (logros, guías) siempre como un visitante: lo sin publicar no sale.

let payload: Payload
let editor: User
const ids = { page: 0, hidden: 0, loose: 0, draftGuide: 0 }

async function cleanUp() {
  await payload.delete({ collection: 'dofus-guides', where: { slug: { like: 'prueba-dq' } } })
  await payload.delete({ collection: 'achievement-pages', where: { slug: { like: 'prueba-dq' } } })
  await payload.delete({ collection: 'achievements', where: { dofusId: { in: [929001, 929002] } } })
  await payload.delete({ collection: 'quest-guides', where: { slug: { like: 'prueba-dq' } } })
  await payload.delete({
    collection: 'quests',
    where: { dofusId: { in: [929101, 929102, 929103] } },
  })
  await payload.delete({ collection: 'npcs', where: { dofusId: { equals: 929201 } } })
}

beforeAll(async () => {
  payload = await startPayload()
  await cleanUp()
  editor = await createPanelUser(payload)
  await payload.create({ collection: 'npcs', data: { dofusId: 929201, name: 'Meriana' } })
  const [pesca, heroe, luces] = [
    await payload.create({
      collection: 'quests',
      data: {
        dofusId: 929101,
        name: 'A la pesca',
        levelMin: 180,
        startPositions: [{ npcId: 929201 }],
      },
    }),
    await payload.create({
      collection: 'quests',
      data: { dofusId: 929102, name: 'El héroe', levelMin: 190 },
    }),
    await payload.create({
      collection: 'quests',
      data: { dofusId: 929103, name: 'Luces', levelMin: 160 },
    }),
  ]
  const achievement = await payload.create({
    collection: 'achievements',
    data: { dofusId: 929001, name: '¡Plof!' },
  })
  const hidden = await payload.create({
    collection: 'achievements',
    data: { dofusId: 929002, name: 'Sin publicar' },
  })
  ids.page = (
    await payload.create({
      collection: 'achievement-pages',
      data: {
        achievement: achievement.id,
        name: '¡Plof!',
        slug: 'prueba-dq-plof',
        state: 'published',
        _status: 'published',
        quests: [
          { name: 'A la pesca', quests: [pesca.id] },
          { name: 'El héroe', quests: [heroe.id] },
        ],
      },
    })
  ).id
  ids.hidden = (
    await payload.create({
      collection: 'achievement-pages',
      data: {
        achievement: hidden.id,
        name: 'Sin publicar',
        slug: 'prueba-dq-oculto',
        state: 'published',
        _status: 'draft',
      },
      draft: true,
    })
  ).id
  await payload.create({
    collection: 'quest-guides',
    data: { title: 'A la pesca', slug: 'prueba-dq-pesca', quest: pesca.id, _status: 'published' },
  })
  ids.loose = (
    await payload.create({
      collection: 'quest-guides',
      data: { title: 'Luces', slug: 'prueba-dq-luces', quest: luces.id, _status: 'published' },
    })
  ).id
  ids.draftGuide = (
    await payload.create({
      collection: 'quest-guides',
      data: { title: 'Borrador', slug: 'prueba-dq-borrador', _status: 'draft' },
      draft: true,
    })
  ).id

  const base = { level: 180, _status: 'published' as const }
  await payload.create({
    collection: 'dofus-guides',
    data: {
      ...base,
      name: 'Dofus de prueba',
      slug: 'prueba-dq-abisal',
      order: 1,
      state: 'published',
      parts: [
        { blockType: 'dofusAchievement', achievement: ids.page },
        { blockType: 'dofusAchievement', achievement: ids.hidden },
        {
          blockType: 'dofusQuests',
          title: 'Sueltas',
          quests: [{ guide: ids.loose, note: '(solo empezarla)' }, { guide: ids.draftGuide }],
        },
      ],
    },
  })
  await payload.create({
    collection: 'dofus-guides',
    data: {
      ...base,
      name: 'Dofus en preparación',
      slug: 'prueba-dq-jyfus',
      order: 2,
      state: 'preparing',
    },
  })
})

afterAll(async () => {
  await cleanUp()
})

describe('readDofusGuide', () => {
  it('trae la guía con sus logros publicados, sus misiones, sus guías y quién las da', async () => {
    const data = await readDofusGuide(payload, 'prueba-dq-abisal')
    expect(data?.guide.name).toBe('Dofus de prueba')
    // El logro sin publicar no llega: la página no lo pinta.
    expect([...data!.achievements.keys()]).toEqual([ids.page])
    expect([...data!.questGuides.keys()]).toEqual([ids.loose])
    expect([...data!.guideByQuest.values()]).toEqual([{ slug: 'prueba-dq-pesca' }])
    expect([...data!.givers.keys()]).toEqual([929201])
  })

  it('una guía En preparación no tiene página para un visitante; sí en la vista previa', async () => {
    expect(await readDofusGuide(payload, 'prueba-dq-jyfus')).toBeNull()
    const preview = await readDofusGuide(payload, 'prueba-dq-jyfus', { preview: { user: editor } })
    expect(preview?.guide.state).toBe('preparing')
  })

  it('un slug que no es de guía no consulta nada', async () => {
    expect(await readDofusGuide(payload, 'Guías Dofus')).toBeNull()
  })
})

describe('readDofusList', () => {
  it('lista los Dofus en el orden de Torre con sus logros y misiones', async () => {
    const list = (await readDofusList(payload)).filter((doc) => doc.slug.startsWith('prueba-dq'))
    expect(list.map((doc) => [doc.slug, doc.state, doc.achievements, doc.quests])).toEqual([
      // Ni el logro sin publicar ni la guía en borrador cuentan.
      ['prueba-dq-abisal', 'published', 1, 3],
      ['prueba-dq-jyfus', 'preparing', 0, 0],
    ])
  })
})
