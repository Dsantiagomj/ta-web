import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { checklistArt, checklistArtKey } from '../../scripts/import/checklists/art'
import type { ChecklistCatalogEntry } from '../../scripts/import/checklists/catalog'
import { loadChecklists, type LoadChecklistsOptions } from '../../scripts/import/checklists/load'
import type { ChecklistDraft } from '../../scripts/import/checklists/to-checklist'
import { createHtmlToLexical } from '../../scripts/import/rich-text'
import type { Checklist } from '@/payload-types'

import { createPanelUser, startPayload, tinyPng } from './payload'

// La importación de las checklists: crea el borrador con todo enlazado, en seco no escribe,
// una segunda pasada no cambia nada, lo que Torre cambia en el panel se queda y cada paso
// conserva su stepId al reimportar. Las fichas sin portar se crean En preparación.

let payload: Payload
let htmlToLexical: LoadChecklistsOptions['htmlToLexical']

const PREFIX = 'prueba-importar-checklist'
const IDS = { quest: 997_001, stopQuest: 997_002, missingQuest: 997_099 }
const ids = { quest: 0, stopQuest: 0, achievement: 0, item: 0, npc: 0, boss: 0, guide: 0, icon: 0 }
// Un icono que Media ya tiene con su clave de arte del juego: se reutiliza, no se sube.
const ICON_KEY = 'prueba-checklist-icono-del-juego'
const ART = [
  'prueba-checklist/mapa-1.jpg',
  'prueba-checklist/dios.png',
  'prueba-checklist/zona.jpg',
]

const entry = (
  slug: string,
  fields: Partial<ChecklistCatalogEntry> = {},
): ChecklistCatalogEntry => ({
  id: slug,
  slug,
  name: 'Dofus de prueba',
  description: 'Una checklist de prueba, sin cifras.',
  order: 7,
  dofusGuide: `${PREFIX}-guia`,
  legacyHref: `https://www.torrentearcano.com/${slug}`,
  ported: true,
  ...fields,
})

/** Tres pasos: uno normal, uno que para una misión y uno que la resuelve. */
const draftFor = (slug: string, overrides: Partial<ChecklistDraft> = {}): ChecklistDraft => {
  const { legacyHref, ...rest } = entry(slug)
  return {
    ...rest,
    legacyHref,
    prerequisites: {
      intro: 'Nivel recomendado: 180 o superior.',
      groups: [{ title: 'Oficios', rows: [{ key: 'o1', text: 'Cualquier oficio nivel 200' }] }],
      notes: [],
      needs: [],
    },
    steps: [
      {
        legacyNumber: 1,
        segments: [{ kind: 'plain', text: 'Logro "De prueba". Completo.' }],
        note: 'Una nota escrita a mano.',
        achievements: [{ achievement: IDS.quest, mode: 'all', on: [] }],
        quests: [
          { quest: IDS.quest, kind: 'mandatory', note: null, optionalDoneBy: null },
          { quest: IDS.missingQuest, kind: 'mandatory', note: null, optionalDoneBy: null },
        ],
        needs: [
          {
            item: '997301',
            name: 'Pepita',
            quantity: 3,
            note: 'o 30 000 kamas',
            category: 'resources',
            countsInTotal: true,
            quests: [IDS.quest],
          },
          {
            item: 'x:kama',
            name: 'Kama',
            quantity: 1,
            note: null,
            category: 'resources',
            countsInTotal: true,
            quests: [],
          },
          {
            item: 'x:captura de almas',
            name: 'Captura de almas',
            quantity: 1,
            note: 'Hechizo: requisito, no consumible',
            category: 'resources',
            countsInTotal: false,
            quests: [],
          },
        ],
        figure: { npc: 997_401, art: null, role: 'Inicia el paso' },
        bosses: [],
        icon: { path: 'prueba-checklist/icono.png', alt: 'Kamatrix', key: ICON_KEY },
        banner: { path: ART[0], alt: 'Caminos rocosos' },
        zone: 'Llanuras de prueba',
        closes: [],
        updates: [],
      },
      {
        legacyNumber: 2,
        segments: [
          { kind: 'plain', text: 'Logro "De prueba", misión 2.' },
          {
            kind: 'stop',
            text: 'Avanza hasta tener que pasar la mazmorra.',
            quest: IDS.stopQuest,
            stopObjective: 2,
          },
        ],
        note: null,
        achievements: [],
        quests: [{ quest: IDS.stopQuest, kind: 'mandatory', note: null, optionalDoneBy: null }],
        needs: [
          {
            item: '997302',
            name: 'Llave',
            quantity: 1,
            note: null,
            category: 'equipment',
            countsInTotal: true,
            quests: [],
          },
        ],
        figure: { npc: null, art: { path: ART[1], alt: 'Dios de prueba' }, role: 'Se habla con' },
        bosses: [997_501],
        icon: null,
        banner: { path: ART[1], alt: 'Dios de prueba' },
        zone: 'Llanuras de prueba',
        closes: [],
        updates: [],
      },
      {
        legacyNumber: 3,
        segments: [
          { kind: 'plain', text: 'Logro "De prueba".' },
          { kind: 'resolve', text: 'Se termina pasivamente la etapa 2.', closes: [2] },
        ],
        note: null,
        achievements: [],
        quests: [],
        needs: [],
        figure: null,
        bosses: [],
        icon: null,
        banner: { path: ART[2], alt: 'Zona de prueba' },
        zone: 'Zona de prueba',
        closes: [],
        updates: [],
      },
    ],
    legacy: {
      prefix: 'prueba:',
      classicKeys: { v4: 'dofus_prueba_clean_v1', v3: null },
      guideVersion: 1,
      ownedMoves: { '519@orden': ['519', [1]] },
      previousSteps: [[1], [2], [3]],
    },
    completedBy: [],
    names: { quests: { [IDS.missingQuest]: 'Misión que falta' } },
    ...overrides,
  }
}

const byDofusId = (collection: 'items' | 'npcs') => async (dofusId: number) =>
  (
    await payload.find({
      collection,
      where: { dofusId: { equals: dofusId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
  ).docs[0]?.id ?? null

const options = (
  checklists: LoadChecklistsOptions['checklists'],
  apply = true,
): LoadChecklistsOptions => {
  const art = checklistArt(payload, { readArt: async () => tinyPng().data, dryRun: !apply })
  return {
    checklists,
    apply,
    htmlToLexical,
    ensureItem: byDofusId('items'),
    findItem: async () => null,
    ensureNpc: byDofusId('npcs'),
    artFor: art.media,
  }
}

const read = async (slug: string) =>
  (
    await payload.find({
      collection: 'checklists',
      where: { slug: { equals: slug } },
      draft: true,
      depth: 0,
      overrideAccess: true,
    })
  ).docs[0] as Checklist | undefined

const artCount = async () =>
  (
    await payload.count({
      collection: 'media',
      where: { gameAsset: { in: ART.map(checklistArtKey) } },
      overrideAccess: true,
    })
  ).totalDocs

async function cleanUp() {
  await payload.delete({
    collection: 'checklists',
    where: { slug: { like: PREFIX } },
    overrideAccess: true,
  })
  await payload.delete({
    collection: 'dofus-guides',
    where: { slug: { like: PREFIX } },
    overrideAccess: true,
  })
  await payload.delete({
    collection: 'media',
    where: { gameAsset: { in: [...ART.map(checklistArtKey), ICON_KEY] } },
    overrideAccess: true,
  })
  await payload.delete({
    collection: 'quests',
    where: { dofusId: { in: [IDS.quest, IDS.stopQuest] } },
    overrideAccess: true,
  })
  await payload.delete({
    collection: 'achievements',
    where: { dofusId: { equals: IDS.quest } },
    overrideAccess: true,
  })
  await payload.delete({
    collection: 'items',
    where: { dofusId: { in: [997_301, 997_302] } },
    overrideAccess: true,
  })
  await payload.delete({
    collection: 'npcs',
    where: { dofusId: { equals: 997_401 } },
    overrideAccess: true,
  })
  await payload.delete({
    collection: 'monsters',
    where: { dofusId: { equals: 997_501 } },
    overrideAccess: true,
  })
}

beforeAll(async () => {
  payload = await startPayload()
  await cleanUp()
  htmlToLexical = await createHtmlToLexical(payload.config)
  const objective = (dofusId: number) => ({ dofusId, kind: 'npc' as const })
  const create = <T extends Parameters<Payload['create']>[0]>(args: T) =>
    payload.create({ ...args, overrideAccess: true, depth: 0 })
  ids.quest = (
    await create({ collection: 'quests', data: { dofusId: IDS.quest, name: 'Misión de prueba' } })
  ).id
  ids.stopQuest = (
    await create({
      collection: 'quests',
      data: {
        dofusId: IDS.stopQuest,
        name: 'Misión que se para',
        stages: [{ dofusId: 1, objectives: [objective(1), objective(2), objective(3)] }],
      },
    })
  ).id
  ids.achievement = (
    await create({ collection: 'achievements', data: { dofusId: IDS.quest, name: 'De prueba' } })
  ).id
  ids.item = (await create({ collection: 'items', data: { dofusId: 997_301, name: 'Pepita' } })).id
  // Un objeto que ya estaba sin icono: la importación se lo trae.
  await create({ collection: 'items', data: { dofusId: 997_302, name: 'Llave', iconId: 1 } })
  ids.npc = (await create({ collection: 'npcs', data: { dofusId: 997_401, name: 'Sargento' } })).id
  ids.boss = (
    await create({ collection: 'monsters', data: { dofusId: 997_501, name: 'Vórtex' } })
  ).id
  ids.guide = (
    await create({
      collection: 'dofus-guides',
      data: { name: 'Dofus de prueba', slug: `${PREFIX}-guia`, order: 99, state: 'published' },
    })
  ).id
  ids.icon = (
    await payload.create({
      collection: 'media',
      data: { alt: 'Kamatrix', gameAsset: ICON_KEY },
      file: tinyPng(),
      overrideAccess: true,
    })
  ).id
})

afterAll(async () => {
  await cleanUp()
})

describe('importar una checklist entera', () => {
  const slug = `${PREFIX}-entera`

  it('en seco cuenta y avisa, pero no escribe nada', async () => {
    const report = await loadChecklists(
      payload,
      options([{ entry: entry(slug), draft: draftFor(slug) }], false),
    )
    expect(report.created).toBe(1)
    expect(await read(slug)).toBeUndefined()
    expect(await artCount()).toBe(0)
    expect(report.pending).toEqual({ items: 0, npcs: 0, icons: 1, art: ART.length })
  })

  it('crea un borrador En preparación con todo enlazado, en su orden y con sus stepId', async () => {
    const report = await loadChecklists(
      payload,
      options([{ entry: entry(slug), draft: draftFor(slug) }]),
    )
    expect(report.created).toBe(1)
    // Lo que no es un objeto del juego no se pierde: queda como texto, y el informe lo dice.
    expect(report.unmatched).toEqual([
      { slug, step: 1, kind: 'misión', name: `Misión que falta (${IDS.missingQuest})` },
    ])
    expect(report.labels).toEqual([
      { slug, step: 1, name: 'Kama' },
      { slug, step: 1, name: 'Captura de almas' },
    ])

    const doc = (await read(slug))!
    expect(doc).toMatchObject({
      _status: 'draft',
      state: 'preparing',
      name: 'Dofus de prueba',
      order: 7,
      legacyHref: `https://www.torrentearcano.com/${slug}`,
      dofusGuide: ids.guide,
      prerequisites: {
        intro: 'Nivel recomendado: 180 o superior.',
        groups: [{ title: 'Oficios', rows: [{ key: 'o1', text: 'Cualquier oficio nivel 200' }] }],
      },
      legacy: {
        prefix: 'prueba:',
        classicKeys: { v4: 'dofus_prueba_clean_v1', v3: null },
        guideVersion: 1,
        previousSteps: [[1], [2], [3]],
        // Las claves de objetos que cambiaron, para la migración del progreso
        ownedMoves: { '519@orden': ['519', [1]] },
      },
    })
    const steps = doc.steps!
    expect(steps.map((step) => step.legacyNumber)).toEqual([1, 2, 3])
    expect(steps.map((step) => step.zone)).toEqual([
      'Llanuras de prueba',
      'Llanuras de prueba',
      'Zona de prueba',
    ])
    expect(new Set(steps.map((step) => step.stepId)).size).toBe(3)

    const [first, second, third] = steps
    expect(first.achievements).toMatchObject([{ achievement: ids.achievement, mode: 'all' }])
    expect(first.quests).toMatchObject([{ quest: ids.quest, kind: 'mandatory' }])
    expect(first.needs).toMatchObject([
      {
        item: ids.item,
        quantity: 3,
        note: 'o 30 000 kamas',
        category: 'resources',
        countsInTotal: true,
        quests: [ids.quest],
      },
      { label: 'Kama', quantity: 1, category: 'resources', countsInTotal: true },
      {
        label: 'Captura de almas',
        quantity: 1,
        note: 'Hechizo: requisito, no consumible',
        countsInTotal: false,
      },
    ])
    expect(first.needs![1].item ?? null).toBeNull()
    expect(first.icon).toBe(ids.icon)
    expect(second.needs).toMatchObject([{ category: 'equipment' }])
    expect(first.figure).toMatchObject({ npc: ids.npc, role: 'Inicia el paso' })
    expect(JSON.stringify(first.note)).toContain('Una nota escrita a mano.')
    expect(second.segments).toMatchObject([
      { kind: 'plain', text: 'Logro "De prueba", misión 2.' },
      { kind: 'stop', quest: ids.stopQuest, stopObjective: 2 },
    ])
    expect(second.bosses).toEqual([ids.boss])
    expect(third.segments?.[1]).toMatchObject({ kind: 'resolve', closes: [second.stepId] })

    // Cada imagen sube una vez, con su clave: el dios es figura y banner del paso 2.
    expect(await artCount()).toBe(ART.length)
    expect(second.banner).toBe(second.figure?.image)
    const banner = await payload.findByID({
      collection: 'media',
      id: first.banner as number,
      depth: 0,
    })
    expect(banner).toMatchObject({ gameAsset: checklistArtKey(ART[0]), alt: 'Caminos rocosos' })
  })

  it('una segunda pasada no cambia nada ni sube otra vez las imágenes', async () => {
    const before = (await read(slug))!
    const report = await loadChecklists(
      payload,
      options([{ entry: entry(slug), draft: draftFor(slug) }]),
    )
    expect(report).toMatchObject({ created: 0, updated: 0, unchanged: 1, kept: [] })
    expect((await read(slug))!.updatedAt).toBe(before.updatedAt)
    expect(await artCount()).toBe(ART.length)
  })

  it('reimportar un texto cambiado conserva el stepId de cada paso y lo que cierra', async () => {
    const before = (await read(slug))!
    const changed = draftFor(slug)
    changed.steps[0].segments = [
      { kind: 'plain', text: 'Logro "De prueba". Completo y corregido.' },
    ]
    const report = await loadChecklists(payload, options([{ entry: entry(slug), draft: changed }]))
    expect(report.updated).toBe(1)
    const after = (await read(slug))!
    expect(after.steps![0].segments?.[0].text).toBe('Logro "De prueba". Completo y corregido.')
    expect(after.steps!.map((step) => step.stepId)).toEqual(
      before.steps!.map((step) => step.stepId),
    )
    expect(after.steps![2].segments?.[1].closes).toEqual([before.steps![1].stepId])
  })

  it('lo que Torre cambia en el panel no se pisa', async () => {
    const editor = await createPanelUser(payload)
    const doc = (await read(slug))!
    const steps = doc.steps!.map((step, index) =>
      index === 0
        ? { ...step, segments: [{ kind: 'plain' as const, text: 'Texto de Torre.' }] }
        : step,
    )
    await payload.update({
      collection: 'checklists',
      id: doc.id,
      data: { description: 'La descripción de Torre.', steps },
      draft: true,
      user: editor,
    })
    const report = await loadChecklists(
      payload,
      options([
        { entry: entry(slug), draft: draftFor(slug, { name: 'Dofus de prueba renombrado' }) },
      ]),
    )
    expect(report.kept).toEqual([
      { slug, field: 'description' },
      { slug, field: 'steps' },
    ])
    const after = (await read(slug))!
    expect(after.name).toBe('Dofus de prueba renombrado')
    expect(after.description).toBe('La descripción de Torre.')
    expect(after.steps![0].segments?.[0].text).toBe('Texto de Torre.')
    expect(after.steps!.map((step) => step.stepId)).toEqual(doc.steps!.map((step) => step.stepId))
  })
})

describe('la zona de cada paso', () => {
  const slug = `${PREFIX}-zonas`
  const withZones = (zones: string[]) => {
    const draft = draftFor(slug)
    draft.steps.forEach((step, index) => (step.zone = zones[index]))
    return draft
  }
  const zonesOf = async () => (await read(slug))!.steps!.map((step) => step.zone ?? null)

  it('se rellena aunque Torre haya editado otros campos de los pasos, sin pisar lo suyo', async () => {
    await loadChecklists(payload, options([{ entry: entry(slug), draft: draftFor(slug) }]))
    // Una checklist importada antes de que hubiera zonas: pasos sin zona y sin su recuerdo.
    const imported = (await read(slug))!
    const snapshot = { ...(imported.importSnapshot as Record<string, unknown>) }
    delete snapshot.zones
    await payload.update({
      collection: 'checklists',
      id: imported.id,
      data: {
        steps: imported.steps!.map((step) => ({ ...step, zone: null })),
        importSnapshot: snapshot,
      },
      draft: true,
      overrideAccess: true,
    })
    // Torre corrige el texto de un paso.
    const editor = await createPanelUser(payload)
    const before = (await read(slug))!
    await payload.update({
      collection: 'checklists',
      id: before.id,
      data: {
        steps: before.steps!.map((step, index) =>
          index === 0
            ? { ...step, segments: [{ kind: 'plain' as const, text: 'Texto de Torre.' }] }
            : step,
        ),
      },
      draft: true,
      user: editor,
    })

    const report = await loadChecklists(
      payload,
      options([{ entry: entry(slug), draft: draftFor(slug) }]),
    )

    expect(report.kept).toEqual([{ slug, field: 'steps' }])
    const after = (await read(slug))!
    expect(after.steps![0].segments?.[0].text).toBe('Texto de Torre.')
    expect(await zonesOf()).toEqual(['Llanuras de prueba', 'Llanuras de prueba', 'Zona de prueba'])
    expect(after.steps!.map((step) => step.stepId)).toEqual(
      before.steps!.map((step) => step.stepId),
    )
  })

  it('una segunda pasada no cambia nada', async () => {
    const before = (await read(slug))!
    const report = await loadChecklists(
      payload,
      options([{ entry: entry(slug), draft: draftFor(slug) }]),
    )
    expect(report).toMatchObject({ updated: 0, unchanged: 1 })
    expect((await read(slug))!.updatedAt).toBe(before.updatedAt)
  })

  it('la zona que Torre cambió se queda; la que no tocó sigue a la importación', async () => {
    const editor = await createPanelUser(payload)
    const doc = (await read(slug))!
    await payload.update({
      collection: 'checklists',
      id: doc.id,
      data: {
        steps: doc.steps!.map((step, index) =>
          index === 0 ? { ...step, zone: 'Zona de Torre' } : step,
        ),
      },
      draft: true,
      user: editor,
    })

    await loadChecklists(
      payload,
      options([
        {
          entry: entry(slug),
          draft: withZones(['Llanuras nuevas', 'Llanuras nuevas', 'Zona nueva']),
        },
      ]),
    )

    expect(await zonesOf()).toEqual(['Zona de Torre', 'Llanuras nuevas', 'Zona nueva'])
  })
})

describe('lo que trae el Silvestre', () => {
  const slug = `${PREFIX}-silvestre`
  /** Los tres pasos de prueba con avisos, varias paradas, alternativas y objetos de prerrequisito. */
  const silvestreDraft = () => {
    const draft = draftFor(slug)
    draft.prerequisites = {
      ...draft.prerequisites,
      notes: [{ title: 'Empieza el Dofus Ocre cuanto antes', text: 'Es una misión larga.' }],
      needs: [
        {
          item: '997301',
          name: 'Pepita',
          quantity: 50,
          note: null,
          category: 'resources',
          group: 'Opcional · Altos vuelos',
          countsInTotal: true,
          quests: [],
          prerequisite: 'o1',
        },
      ],
    }
    draft.steps[0].segments = [
      { kind: 'plain', text: 'Logro "De prueba".' },
      { kind: 'note', text: '(opcional pero útil):' },
      { kind: 'tip', text: '(Se pueden encadenar)' },
    ]
    draft.steps[0].needs[0] = {
      ...draft.steps[0].needs[0],
      alternatives: [{ item: '997302', name: 'Llave', quantity: 2 }],
      reusable: true,
    }
    draft.steps[1].segments = [
      { kind: 'plain', text: 'Logro "De prueba", misión 2.' },
      {
        kind: 'stop',
        text: '(Hasta tener que luchar)',
        quest: IDS.stopQuest,
        stopObjective: 0,
        resumeLine: 'Se hacen las peleas.',
        more: [{ quest: IDS.stopQuest, stopObjective: 2, later: true, line: 'Hasta la bendición' }],
      },
    ]
    draft.steps[2].closes = [2]
    draft.steps[2].updates = [1]
    draft.steps[2].segments = [{ kind: 'plain', text: 'Logro "De prueba".' }]
    draft.steps[2].achievements = [{ achievement: IDS.quest, mode: 'upto', on: [1, 2] }]
    return draft
  }

  it('lo guarda todo: avisos, paradas, alternativas, pasos que cierra y prerrequisitos', async () => {
    const report = await loadChecklists(
      payload,
      options([{ entry: entry(slug), draft: silvestreDraft() }]),
    )
    expect(report.created).toBe(1)
    const doc = (await read(slug))!
    const [first, second, third] = doc.steps!
    expect(first.segments?.map((segment) => segment.kind)).toEqual(['plain', 'note', 'tip'])
    expect(first.needs?.[0]).toMatchObject({
      item: ids.item,
      reusable: true,
      alternatives: [{ quantity: 2 }],
    })
    expect(second.segments?.[1]).toMatchObject({
      kind: 'stop',
      quest: ids.stopQuest,
      stopObjective: 0,
      resumeLine: 'Se hacen las peleas.',
      more: [{ quest: ids.stopQuest, stopObjective: 2, later: true, line: 'Hasta la bendición' }],
    })
    expect(third).toMatchObject({ closes: [second.stepId], updates: [first.stepId] })
    expect(third.achievements).toMatchObject([{ mode: 'upto', on: [1, 2] }])
    expect(doc.prerequisites).toMatchObject({
      notes: [{ title: 'Empieza el Dofus Ocre cuanto antes', text: 'Es una misión larga.' }],
      needs: [
        { item: ids.item, quantity: 50, group: 'Opcional · Altos vuelos', prerequisite: 'o1' },
      ],
    })
  })

  it('una segunda pasada no cambia nada', async () => {
    const before = (await read(slug))!
    const report = await loadChecklists(
      payload,
      options([{ entry: entry(slug), draft: silvestreDraft() }]),
    )
    expect(report).toMatchObject({ created: 0, updated: 0, unchanged: 1, kept: [] })
    expect((await read(slug))!.updatedAt).toBe(before.updatedAt)
  })

  it('lo que Torre cambia en los avisos o en una parada no se pisa', async () => {
    const editor = await createPanelUser(payload)
    const doc = (await read(slug))!
    await payload.update({
      collection: 'checklists',
      id: doc.id,
      data: {
        prerequisites: {
          ...doc.prerequisites,
          notes: [{ title: 'Aviso de Torre', text: 'Con sus palabras.' }],
        },
        steps: doc.steps!.map((step, index) =>
          index === 1
            ? {
                ...step,
                segments: step.segments!.map((segment) =>
                  segment.kind === 'stop'
                    ? { ...segment, more: [{ ...segment.more![0], later: false }] }
                    : segment,
                ),
              }
            : step,
        ),
      },
      draft: true,
      user: editor,
    })
    const report = await loadChecklists(
      payload,
      options([{ entry: entry(slug), draft: silvestreDraft() }]),
    )
    expect(report.kept).toEqual([
      { slug, field: 'prerequisites' },
      { slug, field: 'steps' },
    ])
    const after = (await read(slug))!
    expect(after.prerequisites?.notes).toMatchObject([{ title: 'Aviso de Torre' }])
    expect(after.steps![1].segments?.[1].more?.[0].later).toBe(false)
  })

  it('al portar una ficha publicada, los pasos van a un borrador: la ficha publicada no cambia', async () => {
    const ported = `${PREFIX}-ficha-portada`
    await loadChecklists(
      payload,
      options([{ entry: entry(ported, { ported: false }), draft: null }]),
    )
    await loadChecklists(payload, options([{ entry: entry(ported), draft: draftFor(ported) }]))
    expect((await read(ported))!.steps).toHaveLength(3)
    const published = await payload.find({
      collection: 'checklists',
      where: { slug: { equals: ported } },
      draft: false,
      depth: 0,
      overrideAccess: true,
    })
    expect(published.docs[0]).toMatchObject({ _status: 'published', state: 'preparing' })
    expect(published.docs[0].steps ?? []).toEqual([])
  })
})

describe('revisión de #115: nada se pierde sin decirlo', () => {
  const slug = `${PREFIX}-referencias`

  it('un paso antiguo que no existe y la misión de un objeto de los prerrequisitos se dicen', async () => {
    const draft = draftFor(slug)
    draft.steps[2].closes = [2, 9]
    draft.steps[0].quests[0].optionalDoneBy = 8
    draft.prerequisites.needs = [
      {
        item: '997301',
        name: 'Pepita',
        quantity: 1,
        note: null,
        category: 'resources',
        countsInTotal: true,
        // La misión del paso 2, que solo está en otro paso, y una que no existe.
        quests: [IDS.stopQuest, IDS.missingQuest],
        prerequisite: 'o1',
      },
    ]
    const report = await loadChecklists(payload, options([{ entry: entry(slug), draft }]))
    expect(report.unmatched).toEqual(
      expect.arrayContaining([
        { slug, step: 3, kind: 'paso', name: 'paso 9' },
        { slug, step: 1, kind: 'paso', name: 'paso 8' },
        { slug, step: 0, kind: 'misión', name: `Misión que falta (${IDS.missingQuest})` },
      ]),
    )
    const doc = (await read(slug))!
    expect(doc.prerequisites?.needs?.[0].quests).toEqual([ids.stopQuest])
  })
})

describe('lo que trae el Hielos', () => {
  const slug = `${PREFIX}-hielos`
  const hielosDraft = () => {
    const draft = draftFor(slug)
    draft.steps[0].quests = [
      {
        quest: IDS.quest,
        kind: 'mandatory',
        note: null,
        optionalDoneBy: null,
        label: 'Recolección en los campos de hielo',
        alternatives: [IDS.stopQuest],
      },
    ]
    draft.completedBy = [{ quest: IDS.stopQuest, by: [IDS.quest] }]
    draft.legacy = { ...draft.legacy, genericQuests: { 'alt:607:1568': IDS.quest } }
    return draft
  }

  it('guarda las filas genéricas y las misiones que se terminan solas', async () => {
    const report = await loadChecklists(
      payload,
      options([{ entry: entry(slug), draft: hielosDraft() }]),
    )
    expect(report.created).toBe(1)
    const doc = (await read(slug))!
    expect(doc.steps![0].quests).toMatchObject([
      {
        quest: ids.quest,
        label: 'Recolección en los campos de hielo',
        alternatives: [ids.stopQuest],
      },
    ])
    expect(doc.completedBy).toMatchObject([{ quest: ids.stopQuest, by: [ids.quest] }])
    expect(doc.legacy?.genericQuests).toEqual({ 'alt:607:1568': IDS.quest })
  })

  it('una segunda pasada no cambia nada', async () => {
    const before = (await read(slug))!
    const report = await loadChecklists(
      payload,
      options([{ entry: entry(slug), draft: hielosDraft() }]),
    )
    expect(report).toMatchObject({ created: 0, updated: 0, unchanged: 1, kept: [] })
    expect((await read(slug))!.updatedAt).toBe(before.updatedAt)
  })

  it('lo que Torre cambia en las que se terminan solas no se pisa', async () => {
    const editor = await createPanelUser(payload)
    const doc = (await read(slug))!
    await payload.update({
      collection: 'checklists',
      id: doc.id,
      data: { completedBy: [] },
      draft: true,
      user: editor,
    })
    const report = await loadChecklists(
      payload,
      options([{ entry: entry(slug), draft: hielosDraft() }]),
    )
    expect(report.kept).toEqual([{ slug, field: 'completedBy' }])
    expect((await read(slug))!.completedBy ?? []).toEqual([])
  })
})

describe('el Ocre: una checklist de almas', () => {
  const slug = `${PREFIX}-almas`
  const SOULS_QUEST = 997_003
  const souls = (fields: Partial<ChecklistCatalogEntry> = {}) =>
    entry(slug, { ported: true, kind: 'souls', soulsQuest: SOULS_QUEST, ...fields })

  beforeAll(async () => {
    const bring = (dofusId: number, monsterId: number | null) => ({
      dofusId,
      kind: 'bring' as const,
      monsterId,
      text: 'Lleva 1 alma(s) de {monster,1} a {npc,2}',
    })
    await payload.create({
      collection: 'quests',
      data: {
        dofusId: SOULS_QUEST,
        name: 'La eterna cosecha de prueba',
        stages: [
          { dofusId: 1, objectives: [bring(1, 997_501), bring(2, 997_599)] },
          // Los mismos monstruos otra vez: siguen siendo dos almas.
          { dofusId: 2, objectives: [bring(3, null), bring(4, 997_501), bring(5, 997_599)] },
        ],
      },
      overrideAccess: true,
    })
  })

  afterAll(async () => {
    await payload.delete({
      collection: 'quests',
      where: { dofusId: { equals: SOULS_QUEST } },
      overrideAccess: true,
    })
  })

  it('se crea con su misión, sin filas propias, y dice qué almas no puede pintar', async () => {
    const report = await loadChecklists(payload, options([{ entry: souls(), draft: null }]))
    expect(report.created).toBe(1)
    const doc = (await read(slug))!
    expect(doc).toMatchObject({ kind: 'souls', state: 'preparing', legacy: { prefix: 'cosecha:' } })
    expect(
      (
        await payload.find({
          collection: 'quests',
          where: { dofusId: { equals: SOULS_QUEST } },
          depth: 0,
        })
      ).docs[0].id,
    ).toBe(doc.soulsQuest)
    expect(doc.steps ?? []).toEqual([])
    expect(report.souls).toEqual([
      {
        slug,
        souls: 2,
        missingMonsters: [997_599],
        // Vórtex está, pero sin niveles ni subzona: hace falta refrescar los datos del juego.
        withoutGameData: [997_501],
        notSouls: 1,
      },
    ])
  })

  it('una segunda pasada no cambia nada, y lo que Torre cambia se queda', async () => {
    expect(await loadChecklists(payload, options([{ entry: souls(), draft: null }]))).toMatchObject(
      {
        created: 0,
        updated: 0,
        unchanged: 1,
      },
    )
    const editor = await createPanelUser(payload)
    const doc = (await read(slug))!
    await payload.update({
      collection: 'checklists',
      id: doc.id,
      data: { description: 'Las almas, con las palabras de Torre.' },
      draft: true,
      user: editor,
    })
    const report = await loadChecklists(payload, options([{ entry: souls(), draft: null }]))
    expect(report.kept).toEqual([{ slug, field: 'description' }])
    expect((await read(slug))!.description).toBe('Las almas, con las palabras de Torre.')
  })

  it('al portar la ficha publicada, el tipo y la misión van a un borrador', async () => {
    const ported = `${PREFIX}-almas-ficha`
    await loadChecklists(
      payload,
      options([{ entry: entry(ported, { ported: false }), draft: null }]),
    )
    await loadChecklists(
      payload,
      options([
        {
          entry: entry(ported, { ported: true, kind: 'souls', soulsQuest: SOULS_QUEST }),
          draft: null,
        },
      ]),
    )
    expect((await read(ported))!.kind).toBe('souls')
    const published = await payload.find({
      collection: 'checklists',
      where: { slug: { equals: ported } },
      draft: false,
      depth: 0,
      overrideAccess: true,
    })
    expect(published.docs[0].kind).toBe('steps')
  })

  it('sin su misión en la base, lo dice', async () => {
    const report = await loadChecklists(
      payload,
      options(
        [
          {
            entry: entry(`${PREFIX}-almas-sin-mision`, {
              ported: true,
              kind: 'souls',
              soulsQuest: 997_998,
            }),
            draft: null,
          },
        ],
        false,
      ),
    )
    expect(report.unmatched).toContainEqual({
      slug: `${PREFIX}-almas-sin-mision`,
      step: null,
      kind: 'misión',
      name: '997998',
    })
  })

  // Payload con la búsqueda de monstruos que pide sus datos del juego rota con `error`.
  const failingMonsters = (error: Error): typeof payload =>
    new Proxy(payload, {
      get(target, key, receiver) {
        if (key !== 'find') return Reflect.get(target, key, receiver)
        return (args: Parameters<typeof payload.find>[0]) =>
          args.collection === 'monsters' && args.select && 'levels' in args.select
            ? Promise.reject(error)
            : target.find(args)
      },
    })
  // Sin la migración falta la columna de la subzona (42703) o la tabla de los niveles (42P01,
  // `monsters_numbers`, lo que da dev antes de desplegar).
  const missingColumn = (code = '42703') =>
    Object.assign(new Error('Failed query: select "levels"'), {
      cause: Object.assign(new Error('does not exist'), { code }),
    })

  it.each(['42703', '42P01'])(
    'en seco, contra una base sin la migración de monstruos (%s), los da sin datos',
    async (code) => {
      const report = await loadChecklists(
        failingMonsters(missingColumn(code)),
        options([{ entry: souls(), draft: null }], false),
      )
      expect(report.souls[0]).toMatchObject({ withoutGameData: [997_501] })
    },
  )

  it('otro error, o el mismo escribiendo, no se traga', async () => {
    await expect(
      loadChecklists(
        failingMonsters(new Error('la conexión se cortó')),
        options([{ entry: souls(), draft: null }], false),
      ),
    ).rejects.toThrow('la conexión se cortó')
    await expect(
      loadChecklists(failingMonsters(missingColumn()), options([{ entry: souls(), draft: null }])),
    ).rejects.toThrow('Failed query')
  })
})

describe('las checklists sin portar', () => {
  const slug = `${PREFIX}-ficha`

  it('se crean publicadas, En preparación y sin pasos, con su enlace a Squarespace', async () => {
    const ficha = entry(slug, { ported: false, order: 8 })
    const report = await loadChecklists(payload, options([{ entry: ficha, draft: null }]))
    expect(report.created).toBe(1)
    const doc = (await read(slug))!
    expect(doc).toMatchObject({
      _status: 'published',
      state: 'preparing',
      name: 'Dofus de prueba',
      order: 8,
      description: 'Una checklist de prueba, sin cifras.',
      legacyHref: `https://www.torrentearcano.com/${slug}`,
      dofusGuide: ids.guide,
    })
    expect(doc.steps ?? []).toEqual([])

    const again = await loadChecklists(payload, options([{ entry: ficha, draft: null }]))
    expect(again).toMatchObject({ created: 0, updated: 0, unchanged: 1 })
  })

  it('avisa de la guía de Dofus que no encuentra', async () => {
    const ficha = entry(`${PREFIX}-sin-guia`, { ported: false, dofusGuide: 'no-existe' })
    const report = await loadChecklists(payload, options([{ entry: ficha, draft: null }], false))
    expect(report.unmatched).toEqual([
      { slug: ficha.slug, step: null, kind: 'guía de Dofus', name: 'no-existe' },
    ])
  })
})
