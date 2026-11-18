import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { backfillSummaryText } from '../../scripts/import/backfill-summary-text'
import { createHtmlToLexical, type LexicalState } from '../../scripts/import/rich-text'
import type { QuestGuide } from '@/payload-types'

import { startPayload } from './payload'

// El texto del resumen de las guías ya importadas se pone al día con lo que da ahora la
// conversión de su página guardada (las páginas de oro): las recompensas por nivel repetidas y
// los Prerrequisitos con la etiqueta «Prerequisitos». En seco no escribe; con apply sí, con la
// regla de la importación; repetirlo no cambia nada.

const SITE = 'https://www.torrentearcano.com'
const PAGES = path.join(__dirname, '../fixtures/import-golden/pages')
// Cada guía con su propia dirección: la página se busca por la URL original, no por el slug.
const SLUGS = {
  gajes: 'prueba-resumen-gajes',
  wali: 'prueba-resumen-wali',
  ron: 'prueba-resumen-ron',
}
const SOURCES: Record<string, string> = {
  'gajes-de-la-chocolateria': SLUGS.gajes,
  'wali-y-la-fabrica-de-chocolate': SLUGS.wali,
  'ron-marino': SLUGS.ron,
}

// Lo que guardaba la importación antes del arreglo de las sublistas.
const GAJES_BEFORE = [
  'Si eres nivel 1 a 109: 2 659 173 XP.28 082 kamas.5 x Cupón chocolate.',
  '2 659 173 XP.',
  '28 082 kamas.',
  '5 x Cupón chocolate.',
  'Si eres nivel 110 a 179:5 089 075 XP.71 202 kamas.5 x Cupón avellana.',
  '5 089 075 XP.',
  '71 202 kamas.',
  '5 x Cupón avellana.',
  'Si eres nivel 180 a 200:5 500 000 XP.87 960 kamas.5 x Cupón praliné.',
  '5 500 000 XP.',
  '87 960 kamas.',
  '5 x Cupón praliné.',
].join('\n')
const GAJES_AFTER = [
  'Si eres nivel 1 a 109:',
  '2 659 173 XP.',
  '28 082 kamas.',
  '5 x Cupón chocolate.',
  'Si eres nivel 110 a 179:',
  '5 089 075 XP.',
  '71 202 kamas.',
  '5 x Cupón avellana.',
  'Si eres nivel 180 a 200:',
  '5 500 000 XP.',
  '87 960 kamas.',
  '5 x Cupón praliné.',
].join('\n')

// Los demás campos del resumen, como los da la conversión de su página.
const GAJES_PREREQUISITES = 'La isla flotante de chocolate.\nNivel mínimo 20.'
const GAJES_NEEDS = [
  'Si eres 119 o menos: Fundición de los Waddictos (no hace falta explicarla xD).',
  'Si eres nivel 120 a 179: Crocantería.',
  'Si eres 180 o más: Templo del Dios Kao.',
].join('\n')
const WALI_PREREQUISITES = 'Nivel mínimo 20.\nLa isla flotante de chocolate.'

let payload: Payload
let toLexical: (html: string) => LexicalState

const readPage = async (slug: string) =>
  slug in SOURCES ? readFile(path.join(PAGES, `${slug}.html`), 'utf8') : null

async function guide(slug: string, draft = true): Promise<QuestGuide> {
  const { docs } = await payload.find({
    collection: 'quest-guides',
    where: { slug: { equals: slug } },
    draft,
    depth: 0,
    limit: 1,
  })
  return docs[0]!
}

const mine = <T extends { slug: string }>(updates: T[]) =>
  updates.filter((update) => Object.values(SLUGS).includes(update.slug))

async function removeGuides() {
  await payload.delete({
    collection: 'quest-guides',
    where: { slug: { in: Object.values(SLUGS) } },
  })
}

beforeAll(async () => {
  payload = await startPayload()
  toLexical = await createHtmlToLexical(payload.config)
})

afterAll(async () => {
  await removeGuides()
  await payload.destroy()
})

beforeEach(async () => {
  await removeGuides()
  // Publicada, con las recompensas como las dejó la importación.
  await payload.create({
    collection: 'quest-guides',
    data: {
      title: 'Gajes',
      slug: SLUGS.gajes,
      originalUrl: `${SITE}/gajes-de-la-chocolateria`,
      summary: {
        prerequisites: GAJES_PREREQUISITES,
        needs: { notes: GAJES_NEEDS },
        rewards: GAJES_BEFORE,
      },
      importSnapshot: {
        'summary.prerequisites': GAJES_PREREQUISITES,
        'summary.needs.notes': GAJES_NEEDS,
        'summary.rewards': GAJES_BEFORE,
      },
      _status: 'published',
    },
  })
  // Torre cambió sus recompensas en el panel.
  await payload.create({
    collection: 'quest-guides',
    data: {
      title: 'Wali',
      slug: SLUGS.wali,
      originalUrl: `${SITE}/wali-y-la-fabrica-de-chocolate`,
      summary: { prerequisites: WALI_PREREQUISITES, rewards: 'Las de Torre.' },
      importSnapshot: {
        'summary.prerequisites': WALI_PREREQUISITES,
        'summary.needs.notes': null,
        'summary.rewards': 'Lo que escribió la importación.',
      },
      _status: 'draft',
    },
    draft: true,
  })
  // Sin Prerrequisitos y con la etiqueta y su lista al principio del primer paso.
  const body = [
    {
      blockType: 'step' as const,
      body: [
        {
          blockType: 'richText' as const,
          content: toLexical(
            '<p><strong>Prerequisitos:</strong></p><ul><li><p>Nivel mínimo 180.</p></li></ul>',
          ),
        },
        {
          blockType: 'richText' as const,
          content: toLexical('<p>Algunas partes te las puedes saltar.</p>'),
        },
      ],
    },
  ]
  await payload.create({
    collection: 'quest-guides',
    data: {
      title: 'Ron',
      slug: SLUGS.ron,
      originalUrl: `${SITE}/ron-marino`,
      summary: { needs: { notes: 'Un par de pilas steamer (opcional)' } },
      body,
      importSnapshot: {
        'summary.prerequisites': null,
        'summary.needs.notes': 'Un par de pilas steamer (opcional)',
        'summary.rewards': null,
        body,
      },
      _status: 'draft',
    },
    draft: true,
  })
})

describe('backfillSummaryText', () => {
  it('en seco lista cada guía que cambiaría y lo que se queda de Torre, sin escribir', async () => {
    const result = await backfillSummaryText(payload, { readPage, apply: false })
    const updates = mine(result.updates)
    expect(
      updates.map(({ slug, changes, kept, labelBlock }) => ({
        slug,
        fields: changes.map(({ field }) => field),
        kept,
        labelBlock,
      })),
    ).toEqual([
      { slug: SLUGS.gajes, fields: ['summary.rewards'], kept: [], labelBlock: 'none' },
      { slug: SLUGS.ron, fields: ['summary.prerequisites'], kept: [], labelBlock: 'removed' },
      { slug: SLUGS.wali, fields: [], kept: ['summary.rewards'], labelBlock: 'none' },
    ])
    expect(result).toMatchObject({ published: 0, drafts: 0 })
    expect((await guide(SLUGS.gajes)).summary?.rewards).toBe(GAJES_BEFORE)
    expect((await guide(SLUGS.ron)).summary?.prerequisites).toBeNull()
  })

  it('con apply guarda lo que cambia, publicada como publicada y borrador como borrador', async () => {
    const result = await backfillSummaryText(payload, { readPage, apply: true })
    expect(result.published).toBeGreaterThanOrEqual(1)

    const gajes = await guide(SLUGS.gajes, false)
    expect(gajes._status).toBe('published')
    expect(gajes.summary?.rewards).toBe(GAJES_AFTER)
    expect(gajes.importSnapshot).toMatchObject({ 'summary.rewards': GAJES_AFTER })

    const ron = await guide(SLUGS.ron)
    expect(ron._status).toBe('draft')
    expect(ron.summary?.prerequisites).toBe('Nivel mínimo 180.')
    const step = ron.body?.[0] as { blockType: string; body: unknown[] }
    expect(step.body).toHaveLength(1)
    expect(JSON.stringify(step.body)).not.toContain('Prerequisitos')
    // Su cuerpo seguía como lo dejó la importación: el snapshot sigue al cuerpo nuevo.
    const snapshot = ron.importSnapshot as { body: { body: unknown[] }[] }
    expect(snapshot.body[0]!.body).toHaveLength(1)

    expect((await guide(SLUGS.wali)).summary?.rewards).toBe('Las de Torre.')
  })

  it('repetirlo no cambia nada', async () => {
    await backfillSummaryText(payload, { readPage, apply: true })
    const again = await backfillSummaryText(payload, { readPage, apply: true })
    expect(mine(again.updates).filter((update) => update.data)).toEqual([])
  })
})
