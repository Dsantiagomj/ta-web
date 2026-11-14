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
const SUBAREA = 990_207
// El Ocre de prueba: una misión de almas con un monstruo que está (jefe de su mazmorra) y otro
// que no; otra que solo pide uno que no está; y una mazmorra de un jefe que no es alma.
const SOULS = { quest: 990_210, onlyMissing: 990_211 }
const MONSTERS = { boss: 990_301, other: 990_302, missing: 990_399 }
const DUNGEONS = { boss: 990_401, other: 990_402 }

async function cleanUp() {
  for (const [collection, where] of [
    ['checklists', { slug: { like: PREFIX } }],
    ['quest-guides', { slug: { like: PREFIX } }],
    ['achievement-pages', { slug: { like: PREFIX } }],
    ['quests', { dofusId: { in: Object.values(QUESTS) } }],
    ['npcs', { dofusId: { equals: NPC } }],
    ['items', { dofusId: { equals: ITEM } }],
    ['achievements', { dofusId: { equals: ACHIEVEMENT } }],
    ['subareas', { dofusId: { equals: SUBAREA } }],
    ['quests', { dofusId: { in: Object.values(SOULS) } }],
    ['dungeons', { dofusId: { in: Object.values(DUNGEONS) } }],
    ['monsters', { dofusId: { in: Object.values(MONSTERS) } }],
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
              {
                dofusId: 1,
                kind: 'npc',
                text: 'Ve a ver a {npc,990203}',
                x: -4,
                y: -2,
                subAreaId: SUBAREA,
              },
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
  await payload.create({ collection: 'subareas', data: { dofusId: SUBAREA, name: 'Anutropía' } })
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

  const monster = async (dofusId: number, name: string) =>
    (
      await payload.create({
        collection: 'monsters',
        data: { dofusId, name, levels: [20, 30], boss: true, subAreaId: SUBAREA },
      })
    ).id
  const boss = await monster(MONSTERS.boss, 'Mob Lasponja')
  const other = await monster(MONSTERS.other, 'Otro jefe')
  await payload.create({
    collection: 'dungeons',
    data: { dofusId: DUNGEONS.boss, name: 'Castillo de Arena', level: 25, bosses: [boss] },
  })
  await payload.create({
    collection: 'dungeons',
    data: { dofusId: DUNGEONS.other, name: 'Otra mazmorra', level: 90, bosses: [other] },
  })
  const bring = (dofusId: number, monsterId: number) => ({
    dofusId,
    kind: 'bring' as const,
    monsterId,
    text: 'Lleva 1 alma',
  })
  for (const [dofusId, objectives] of [
    [SOULS.quest, [bring(1, MONSTERS.boss), bring(2, MONSTERS.missing)]],
    [SOULS.onlyMissing, [bring(1, MONSTERS.missing)]],
  ] as const) {
    const quest = await payload.create({
      collection: 'quests',
      data: {
        dofusId,
        name: `Almas ${dofusId}`,
        stages: [{ dofusId: 1, objectives: [...objectives] }],
      },
    })
    await payload.create({
      collection: 'checklists',
      data: {
        name: `Almas ${dofusId}`,
        slug: `${PREFIX}-almas-${dofusId}`,
        order: 92,
        state: 'published',
        kind: 'souls',
        soulsQuest: quest.id,
        _status: 'published',
      },
    })
  }
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

describe('readChecklist de una checklist de almas', () => {
  it('lee sus monstruos, sus subzonas y solo las mazmorras de sus jefes', async () => {
    const data = await readChecklist(payload, `${PREFIX}-almas-${SOULS.quest}`)
    expect(Object.keys(data?.souls?.monsters ?? {})).toEqual([String(MONSTERS.boss)])
    expect(data?.souls?.subareas[SUBAREA]).toMatchObject({ name: 'Anutropía' })
    expect(data?.souls?.dungeons).toEqual([
      { name: 'Castillo de Arena', level: 25, bosses: [MONSTERS.boss] },
    ])
  })

  it('sin ninguno de sus monstruos en la base, no busca mazmorras', async () => {
    const asked: string[] = []
    const counting = new Proxy(payload, {
      get(target, key, receiver) {
        if (key !== 'find') return Reflect.get(target, key, receiver)
        return (args: Parameters<Payload['find']>[0]) => {
          asked.push(args.collection)
          return target.find(args)
        }
      },
    })
    const data = await readChecklist(counting, `${PREFIX}-almas-${SOULS.onlyMissing}`)
    expect(data?.souls).toMatchObject({ monsters: {}, subareas: {}, dungeons: [] })
    expect(asked).not.toContain('dungeons')
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
        ['npc', 'Ve a ver a Desalmago', -4, -2, 'Anutropía'],
        ['bring', 'Entrégale a Wello: 3 x Muestra', null, null, null],
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
