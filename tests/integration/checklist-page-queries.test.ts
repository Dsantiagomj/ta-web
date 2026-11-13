import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { readChecklist, readChecklistDetails } from '@/lib/checklists/queries'
import type { User } from '@/payload-types'

import { createPanelUser, startPayload } from './payload'

// Lo que lee la página de una checklist y su API de detalles: un visitante, lo publicado; un
// usuario del panel con la vista previa, el último borrador. Lo enlazado (guías de misión,
// páginas de logro), siempre como lo ve un visitante.

let payload: Payload
let editor: User

const PREFIX = 'prueba-clq'
const QUESTS = { stop: 990_201, guided: 990_202, before: 990_206 }
const NPC = 990_203
const ITEM = 990_204
const ACHIEVEMENT = 990_205

async function cleanUp() {
  for (const [collection, where] of [
    ['checklists', { slug: { like: PREFIX } }],
    ['quest-guides', { slug: { like: PREFIX } }],
    ['achievement-pages', { slug: { like: PREFIX } }],
    ['quests', { dofusId: { in: Object.values(QUESTS) } }],
    ['npcs', { dofusId: { equals: NPC } }],
    ['items', { dofusId: { equals: ITEM } }],
    ['achievements', { dofusId: { equals: ACHIEVEMENT } }],
  ] as const) {
    await payload.delete({ collection, where, overrideAccess: true })
  }
}

const ids = { stop: 0, guided: 0, before: 0, achievement: 0 }

beforeAll(async () => {
  payload = await startPayload()
  await cleanUp()
  editor = await createPanelUser(payload)

  ids.stop = (
    await payload.create({
      collection: 'quests',
      data: {
        dofusId: QUESTS.stop,
        name: 'Sangre fría',
        levelMin: 200,
        startPositions: [{ npcId: 1, npcName: 'Wello', x: -5, y: -5 }],
        stages: [
          {
            dofusId: 1,
            objectives: [
              { dofusId: 1, kind: 'npc', text: 'Ve a ver a {npc,990203}', x: -4, y: -2 },
              { dofusId: 2, kind: 'bring', text: 'Entrégale a Wello: 3 x {item,990204}' },
            ],
          },
        ],
      },
    })
  ).id
  // Con guía pide terminada una de fuera de la checklist, que pide la del «detente aquí».
  ids.before = (
    await payload.create({
      collection: 'quests',
      data: { dofusId: QUESTS.before, name: 'De fuera', prerequisites: [ids.stop] },
    })
  ).id
  ids.guided = (
    await payload.create({
      collection: 'quests',
      data: {
        dofusId: QUESTS.guided,
        name: 'Con guía',
        levelMin: 100,
        startCriterion: `Qa=${QUESTS.stop}&Qo>1`,
        prerequisites: [ids.before],
      },
    })
  ).id
  await payload.create({ collection: 'npcs', data: { dofusId: NPC, name: 'Desalmago' } })
  await payload.create({ collection: 'items', data: { dofusId: ITEM, name: 'Muestra' } })
  ids.achievement = (
    await payload.create({
      collection: 'achievements',
      data: { dofusId: ACHIEVEMENT, name: 'El rey y yo' },
    })
  ).id

  await payload.create({
    collection: 'quest-guides',
    data: {
      title: 'Con guía',
      slug: `${PREFIX}-guia`,
      quest: ids.guided,
      summary: { prerequisites: 'Nivel mínimo 80.' },
      _status: 'published',
    },
  })
  await payload.create({
    collection: 'achievement-pages',
    data: {
      achievement: ids.achievement,
      name: 'El rey y yo',
      slug: `${PREFIX}-logro`,
      state: 'published',
      _status: 'published',
    },
  })

  const steps = (text: string) => [
    {
      segments: [
        { kind: 'plain' as const, text },
        {
          kind: 'stop' as const,
          text: 'Avanza hasta las muestras.',
          quest: ids.stop,
          stopObjective: 1,
        },
      ],
      achievements: [{ achievement: ids.achievement, mode: 'all' as const }],
      quests: [
        { quest: ids.stop, kind: 'mandatory' as const },
        { quest: ids.guided, kind: 'optional' as const },
      ],
    },
  ]
  const created = await payload.create({
    collection: 'checklists',
    data: {
      name: 'Dofus de prueba',
      slug: `${PREFIX}-publicada`,
      order: 90,
      state: 'published',
      steps: steps('Logro "El rey y yo". Publicado.'),
      legacy: { prefix: 'prueba:' },
      _status: 'published',
    },
  })
  // Un borrador encima de lo publicado: solo la vista previa lo ve.
  await payload.update({
    collection: 'checklists',
    id: created.id,
    data: { steps: steps('Logro "El rey y yo". Borrador.') },
    draft: true,
  })
  await payload.create({
    collection: 'checklists',
    data: { name: 'Solo borrador', slug: `${PREFIX}-borrador`, order: 91, state: 'published' },
    draft: true,
  })
}, 60_000)

afterAll(async () => {
  await cleanUp()
})

describe('readChecklist', () => {
  it('a un visitante le da lo publicado, con los slugs de lo que enlaza y los objetivos de la misión donde para', async () => {
    const data = await readChecklist(payload, `${PREFIX}-publicada`)

    expect(data?.checklist.steps?.[0].segments?.[0].text).toBe('Logro "El rey y yo". Publicado.')
    expect(data?.questGuides).toEqual({ [ids.guided]: `${PREFIX}-guia` })
    expect(data?.achievementPages).toEqual({ [ids.achievement]: `${PREFIX}-logro` })
    expect(Object.keys(data?.stopQuests ?? {})).toEqual([String(ids.stop)])
    expect(data?.names.npc).toEqual({ 1: 'Wello', [NPC]: 'Desalmago' })
    expect(data?.names.item).toEqual({ [ITEM]: 'Muestra' })
  })

  it('con lo que necesita el progreso: objetivos, criterios y lo que pide cada misión, el nivel de Torre y las checklists', async () => {
    const data = await readChecklist(payload, `${PREFIX}-publicada`)

    expect(data?.questGraph[ids.stop]).toEqual({
      dofusId: QUESTS.stop,
      levelMin: 200,
      startCriterion: null,
      objectives: [1, 2],
      prerequisites: [],
    })
    expect(data?.questGraph[ids.guided]).toMatchObject({
      dofusId: QUESTS.guided,
      startCriterion: `Qa=${QUESTS.stop}&Qo>1`,
      prerequisites: [QUESTS.before],
    })
    // La de fuera de la checklist también, para seguir lo que pide
    expect(data?.questGraph[ids.before]).toMatchObject({
      dofusId: QUESTS.before,
      prerequisites: [QUESTS.stop],
    })
    expect(data?.torreLevels).toEqual({ [ids.guided]: 80 })
    expect(data?.checklists).toContainEqual({
      id: data?.checklist.id,
      name: 'Dofus de prueba',
      legacyId: 'prueba',
    })
  })

  it('un borrador que nunca se publicó no existe para un visitante', async () => {
    expect(await readChecklist(payload, `${PREFIX}-borrador`)).toBeNull()
  })

  it('con la vista previa del panel, el último borrador', async () => {
    const preview = { preview: { user: editor } }

    const data = await readChecklist(payload, `${PREFIX}-publicada`, preview)
    expect(data?.checklist.steps?.[0].segments?.[0].text).toBe('Logro "El rey y yo". Borrador.')
    expect((await readChecklist(payload, `${PREFIX}-borrador`, preview))?.checklist.name).toBe(
      'Solo borrador',
    )
  })

  it('una guía de misión sin publicar no se enlaza, ni en la vista previa', async () => {
    await payload.update({
      collection: 'quest-guides',
      where: { slug: { equals: `${PREFIX}-guia` } },
      data: { _status: 'draft' },
    })
    try {
      const data = await readChecklist(payload, `${PREFIX}-publicada`, {
        preview: { user: editor },
      })
      expect(data?.questGuides).toEqual({})
    } finally {
      await payload.update({
        collection: 'quest-guides',
        where: { slug: { equals: `${PREFIX}-guia` } },
        data: { _status: 'published' },
      })
    }
  })

  it('un slug reservado o con mal formato no consulta nada', async () => {
    expect(await readChecklist(payload, 'admin')).toBeNull()
    expect(await readChecklist(payload, 'No Vale')).toBeNull()
  })
})

describe('readChecklistDetails', () => {
  it('da quién da cada misión, dónde, y sus objetivos con coordenadas y nombres', async () => {
    const details = await readChecklistDetails(payload, `${PREFIX}-publicada`)

    expect(details?.q[QUESTS.stop]).toEqual([
      'Wello',
      -5,
      -5,
      [
        ['npc', 'Ve a ver a Desalmago', -4, -2],
        ['bring', 'Entrégale a Wello: 3 x Muestra', null, null],
      ],
    ])
    expect(details?.q[QUESTS.guided]).toEqual([null, null, null, []])
  })

  it('con la misma visibilidad que la página: un borrador solo en la vista previa', async () => {
    expect(await readChecklistDetails(payload, `${PREFIX}-borrador`)).toBeNull()
    expect(
      await readChecklistDetails(payload, `${PREFIX}-borrador`, { preview: { user: editor } }),
    ).toEqual({ q: {} })
  })
})
