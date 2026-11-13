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
const ids = { quest: 0, stopQuest: 0, achievement: 0, item: 0, npc: 0, boss: 0, guide: 0 }
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
            quests: [IDS.quest],
          },
          { item: 'x:kama', name: 'Kama', quantity: 1, note: null, quests: [] },
        ],
        figure: { npc: 997_401, art: null, role: 'Inicia el paso' },
        bosses: [],
        banner: { path: ART[0], alt: 'Caminos rocosos' },
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
        needs: [],
        figure: { npc: null, art: { path: ART[1], alt: 'Dios de prueba' }, role: 'Se habla con' },
        bosses: [997_501],
        banner: { path: ART[1], alt: 'Dios de prueba' },
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
        banner: { path: ART[2], alt: 'Zona de prueba' },
      },
    ],
    legacy: {
      prefix: 'prueba:',
      classicKeys: { v4: 'dofus_prueba_clean_v1', v3: null },
      guideVersion: 1,
      previousSteps: [[1], [2], [3]],
    },
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
    where: { gameAsset: { in: ART.map(checklistArtKey) } },
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
    where: { dofusId: { equals: 997_301 } },
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
    expect(report.pending.art).toBe(ART.length)
  })

  it('crea un borrador En preparación con todo enlazado, en su orden y con sus stepId', async () => {
    const report = await loadChecklists(
      payload,
      options([{ entry: entry(slug), draft: draftFor(slug) }]),
    )
    expect(report.created).toBe(1)
    expect(report.unmatched).toEqual([
      { slug, step: 1, kind: 'misión', name: `Misión que falta (${IDS.missingQuest})` },
      { slug, step: 1, kind: 'objeto', name: 'Kama' },
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
      },
    })
    const steps = doc.steps!
    expect(steps.map((step) => step.legacyNumber)).toEqual([1, 2, 3])
    expect(new Set(steps.map((step) => step.stepId)).size).toBe(3)

    const [first, second, third] = steps
    expect(first.achievements).toMatchObject([{ achievement: ids.achievement, mode: 'all' }])
    expect(first.quests).toMatchObject([{ quest: ids.quest, kind: 'mandatory' }])
    expect(first.needs).toMatchObject([
      { item: ids.item, quantity: 3, note: 'o 30 000 kamas', quests: [ids.quest] },
    ])
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
