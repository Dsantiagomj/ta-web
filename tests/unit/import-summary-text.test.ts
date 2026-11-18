import { beforeAll, describe, expect, it } from 'vitest'

import config from '@payload-config'

import { summaryTextUpdate, type StoredGuide } from '../../scripts/import/backfill-summary-text'
import { createHtmlToLexical, type LexicalState } from '../../scripts/import/rich-text'
import type { GuideDraft } from '../../scripts/import/squarespace/to-quest-guide'

let toLexical: (html: string) => LexicalState

beforeAll(async () => {
  toLexical = await createHtmlToLexical(await config)
})

// Lo que guardaba la importación con una sublista en Recompensas, y lo que da ahora.
const DUPLICATED = [
  'Si eres nivel 1 a 109: 664 793 XP.7 020 kamas.3 x Cupón chocolate.',
  '664 793 XP.',
  '7 020 kamas.',
  '3 x Cupón chocolate.',
  'Si eres nivel 110 a 200:1 375 000 XP.',
  '1 375 000 XP.',
].join('\n')
const FIXED = [
  'Si eres nivel 1 a 109:',
  '664 793 XP.',
  '7 020 kamas.',
  '3 x Cupón chocolate.',
  'Si eres nivel 110 a 200:',
  '1 375 000 XP.',
].join('\n')

const richText = (html: string) => ({ blockType: 'richText', content: toLexical(html) })
const LABEL_BLOCK =
  '<p><strong>Prerequisitos:</strong></p><ul><li><p>Nivel mínimo 180.</p></li></ul>'
const FIRST_STEP_TEXT = '<p>Algunas partes te las puedes saltar.</p>'

function converted(summary: GuideDraft['summary']): GuideDraft {
  return {
    title: 'Prueba',
    slug: 'prueba',
    originalUrl: 'https://www.torrentearcano.com/prueba',
    summary,
    body: [],
    questDofusIds: [],
  }
}

function stored(guide: Partial<StoredGuide>): StoredGuide {
  return { slug: 'prueba', summary: {}, body: [], importSnapshot: null, ...guide }
}

/** Una guía con un campo como lo dejó la última importación. */
const asImported = (field: string, value: unknown) => ({ [field]: value })

describe('texto del resumen de las guías ya importadas', () => {
  it('cambia unas recompensas repetidas que siguen como las dejó la importación', () => {
    const update = summaryTextUpdate(
      stored({
        summary: { rewards: DUPLICATED },
        importSnapshot: asImported('summary.rewards', DUPLICATED),
      }),
      converted({ rewards: FIXED }),
    )
    expect(update.changes).toEqual([{ field: 'summary.rewards', from: DUPLICATED, to: FIXED }])
    expect(update.kept).toEqual([])
    expect(update.data).toEqual({
      summary: { rewards: FIXED },
      importSnapshot: { 'summary.rewards': FIXED },
    })
  })

  it('un campo que Torre cambió en el panel se queda y se lista', () => {
    const update = summaryTextUpdate(
      stored({
        summary: { rewards: 'Mis recompensas.' },
        importSnapshot: asImported('summary.rewards', DUPLICATED),
      }),
      converted({ rewards: FIXED }),
    )
    expect(update.changes).toEqual([])
    expect(update.kept).toEqual(['summary.rewards'])
    expect(update.data).toBeNull()
  })

  describe('guías importadas antes del snapshot', () => {
    it('cambia un texto que es justo como lo dejaba la importación de antes con esa página', () => {
      const update = summaryTextUpdate(
        stored({ summary: { rewards: DUPLICATED } }),
        converted({ rewards: FIXED }),
      )
      expect(update.changes).toEqual([{ field: 'summary.rewards', from: DUPLICATED, to: FIXED }])
      expect(update.data).toEqual({
        summary: { rewards: FIXED },
        importSnapshot: { 'summary.rewards': FIXED },
      })
    })

    it('también con sublistas dentro de sublistas', () => {
      const before = 'Misión A:Paso 1Detalle.Paso 2\nPaso 1Detalle.\nDetalle.\nPaso 2\nMisión B'
      const after = 'Misión A:\nPaso 1\nDetalle.\nPaso 2\nMisión B'
      const update = summaryTextUpdate(
        stored({ summary: { prerequisites: before } }),
        converted({ prerequisites: after }),
      )
      expect(update.changes).toEqual([{ field: 'summary.prerequisites', from: before, to: after }])
    })

    it('un texto con otra cosa es de Torre: se queda, aunque se parezca', () => {
      for (const rewards of ['Mis recompensas.', DUPLICATED.replace('7 020 kamas.\n', '')]) {
        const update = summaryTextUpdate(
          stored({ summary: { rewards } }),
          converted({ rewards: FIXED }),
        )
        expect(update.kept, rewards).toEqual(['summary.rewards'])
        expect(update.data, rewards).toBeNull()
      }
    })

    it('un campo vacío se llena', () => {
      const update = summaryTextUpdate(
        stored({ summary: { prerequisites: null } }),
        converted({ prerequisites: 'Nivel mínimo 180.' }),
      )
      expect(update.changes).toEqual([
        { field: 'summary.prerequisites', from: null, to: 'Nivel mínimo 180.' },
      ])
    })
  })

  it('una guía ya al día no cambia: repetirlo no hace nada', () => {
    const update = summaryTextUpdate(
      stored({
        summary: { rewards: FIXED, needs: { notes: 'Nada.' } },
        importSnapshot: asImported('summary.rewards', FIXED),
      }),
      converted({ rewards: FIXED, needs: { notes: 'Nada.' } }),
    )
    expect(update).toMatchObject({ changes: [], kept: [], data: null })
  })

  it('no toca unas recompensas cuyo arreglo cambiaría las cifras que se leen de ellas', () => {
    const before = '1 000 XP.\n2 x Pluma.'
    const update = summaryTextUpdate(
      stored({
        summary: { rewards: before },
        importSnapshot: asImported('summary.rewards', before),
      }),
      converted({ rewards: '2 000 XP.\n2 x Pluma.' }),
    )
    expect(update.changes).toEqual([])
    expect(update.skipped).toEqual([
      {
        field: 'summary.rewards',
        reason: 'cambiarían las cifras que se leen de su texto; pasa por pnpm import:guides',
      },
    ])
    expect(update.data).toBeNull()
  })

  it('la nota de Necesitarás pegada a su sublista se arregla y su mazmorra elegida a mano se quita', () => {
    const glued = 'Hacer estas mazmorras:Mazmorra de los Bworks.\nMazmorra de los Bworks.'
    const fixed = 'Hacer estas mazmorras:\nMazmorra de los Bworks.'
    const update = summaryTextUpdate(
      stored({
        summary: {
          needs: {
            notes: glued,
            dungeons: [
              { note: 'Hacer estas mazmorras:Mazmorra de los Bworks.', dungeon: 1 },
              { note: 'Mazmorra de los Bworks.', dungeon: 2 },
            ],
          },
        },
        importSnapshot: asImported('summary.needs.notes', glued),
      }),
      converted({ needs: { notes: fixed } }),
    )
    expect(update.changes).toEqual([{ field: 'summary.needs.notes', from: glued, to: fixed }])
    expect(update.staleDungeons).toEqual(['Hacer estas mazmorras:Mazmorra de los Bworks.'])
    expect(update.data).toEqual({
      summary: {
        needs: { notes: fixed, dungeons: [{ note: 'Mazmorra de los Bworks.', dungeon: 2 }] },
      },
      importSnapshot: { 'summary.needs.notes': fixed },
    })
  })

  describe('la etiqueta «Prerequisitos» que se quedó en el cuerpo', () => {
    const body = () => [
      {
        blockType: 'step',
        x: null,
        y: null,
        body: [richText(LABEL_BLOCK), richText(FIRST_STEP_TEXT)],
      },
    ]

    it('llena Prerrequisitos y quita del paso el bloque con la etiqueta y su lista', () => {
      const update = summaryTextUpdate(
        stored({
          summary: { prerequisites: null },
          body: body(),
          importSnapshot: { 'summary.prerequisites': null, body: body() },
        }),
        converted({ prerequisites: 'Nivel mínimo 180.' }),
      )
      expect(update.changes).toEqual([
        { field: 'summary.prerequisites', from: null, to: 'Nivel mínimo 180.' },
      ])
      expect(update.labelBlock).toBe('removed')
      const data = update.data as {
        body: { body: { content: unknown }[] }[]
        importSnapshot: { body: { body: unknown[] }[] }
      }
      expect(data.body[0]!.body).toEqual([richText(FIRST_STEP_TEXT)])
      // El cuerpo seguía como lo dejó la importación: su snapshot pasa al nuevo.
      expect(data.importSnapshot.body[0]!.body).toHaveLength(1)
    })

    it('un bloque suelto en la entrada también se quita', () => {
      const update = summaryTextUpdate(
        stored({
          summary: { prerequisites: null },
          body: [richText(LABEL_BLOCK), richText(FIRST_STEP_TEXT)],
          importSnapshot: { 'summary.prerequisites': null },
        }),
        converted({ prerequisites: 'Nivel mínimo 180.' }),
      )
      expect(update.labelBlock).toBe('removed')
      expect((update.data as { body: unknown[] }).body).toEqual([richText(FIRST_STEP_TEXT)])
    })

    it('con el cuerpo ya cambiado por otra cosa, quita el bloque y deja el snapshot del cuerpo como estaba', () => {
      const imported = body()
      const changed = [...body(), richText('<p>Un párrafo de Torre.</p>')]
      const update = summaryTextUpdate(
        stored({
          summary: { prerequisites: null },
          body: changed,
          importSnapshot: { 'summary.prerequisites': null, body: imported },
        }),
        converted({ prerequisites: 'Nivel mínimo 180.' }),
      )
      expect(update.labelBlock).toBe('removed')
      const data = update.data as { body: unknown[]; importSnapshot: Record<string, unknown> }
      expect(data.body).toHaveLength(2)
      expect(data.importSnapshot.body).toEqual(imported)
    })

    it('si los Prerrequisitos ya dicen lo mismo, aunque sin el punto final, el bloque sobra y se quita', () => {
      for (const prerequisites of ['Nivel mínimo 180.', 'Nivel mínimo 180']) {
        const update = summaryTextUpdate(
          stored({ summary: { prerequisites }, body: body() }),
          converted({ prerequisites: 'Nivel mínimo 180.' }),
        )
        expect(update.changes, prerequisites).toEqual([])
        expect(update.labelBlock, prerequisites).toBe('removed')
        expect(update.data, prerequisites).toEqual({
          body: [{ ...body()[0], body: [richText(FIRST_STEP_TEXT)] }],
        })
      }
    })

    it('si Torre escribió otros Prerrequisitos, el cuerpo se queda como está y se lista', () => {
      const update = summaryTextUpdate(
        stored({
          summary: { prerequisites: 'Los míos.' },
          body: body(),
          importSnapshot: { 'summary.prerequisites': null },
        }),
        converted({ prerequisites: 'Nivel mínimo 180.' }),
      )
      expect(update.kept).toEqual(['summary.prerequisites'])
      expect(update.labelBlock).toBe('kept')
      expect(update.data).toBeNull()
    })

    it('si la lista del bloque no es la de los Prerrequisitos nuevos, no se quita y se dice', () => {
      const update = summaryTextUpdate(
        stored({
          summary: { prerequisites: null },
          body: body(),
          importSnapshot: { 'summary.prerequisites': null },
        }),
        converted({ prerequisites: 'Otra cosa.' }),
      )
      expect(update.labelBlock).toBe('missing')
      expect(update.data).not.toHaveProperty('body')
    })

    it('no deja un paso vacío: si el bloque es lo único del paso, se queda', () => {
      const update = summaryTextUpdate(
        stored({
          summary: { prerequisites: null },
          body: [{ blockType: 'step', body: [richText(LABEL_BLOCK)] }],
          importSnapshot: { 'summary.prerequisites': null },
        }),
        converted({ prerequisites: 'Nivel mínimo 180.' }),
      )
      expect(update.labelBlock).toBe('missing')
    })
  })
})
