// El Rush de todos los Dofus tal como lo deja la importación, antes de tocar la base: los 200
// pasos de Sandglass con su texto exacto, los Dofus que da cada paso (el camino), sus objetos
// en los seis grupos de siempre, sus avisos y lo que necesita la migración de «todos:».
import path from 'node:path'

import { beforeAll, describe, expect, it } from 'vitest'

import { CHECKLIST_CATALOG } from '../../scripts/import/checklists/catalog'
import { readLegacyChecklist, type LegacyChecklist } from '../../scripts/import/checklists/legacy'
import {
  stepText,
  toChecklistDraft,
  type ChecklistDraft,
} from '../../scripts/import/checklists/to-checklist'

import generic from '../fixtures/legacy-checklist/generic-alternatives.json'

const alternatives = generic as unknown as Record<string, number[]>

const ROOT = path.resolve(__dirname, '../fixtures/silvestre-checklist')
const todos = CHECKLIST_CATALOG.find((entry) => entry.id === 'todos')!

let legacy: LegacyChecklist
let draft: ChecklistDraft

beforeAll(async () => {
  legacy = await readLegacyChecklist(ROOT, 'todos')
  draft = toChecklistDraft(todos, legacy, alternatives)
})

const step = (n: number) => draft.steps.find((candidate) => candidate.legacyNumber === n)!

describe('el Rush de todos los Dofus en el catálogo', () => {
  it('se trae entero, sin una sola guía de Dofus, con su página de Squarespace', () => {
    expect(todos).toMatchObject({
      slug: 'checklist-todos-dofus',
      name: 'Rush de todos los Dofus',
      legacyHref: 'https://www.torrentearcano.com/checklist-todos-dofus',
      ported: true,
    })
    expect(todos.dofusGuide).toBeUndefined()
    // La descripción no lleva cifras: cambian con la guía.
    expect(todos.description).not.toMatch(/\d/)
  })

  it('va en el orden del hub antiguo: tras el Nebuloso y antes del Ocre', () => {
    expect(CHECKLIST_CATALOG.map((entry) => [entry.id, entry.order])).toEqual([
      ['silvestre', 1],
      ['hielos', 2],
      ['nebuloso', 3],
      ['todos', 4],
      ['ocre', 5],
    ])
  })

  it('su cartel lleva la escena de las misiones de mundo, sin PNJ, en el oro del hub', () => {
    expect(todos.card).toEqual({
      scene: { path: 'zones/misiones-de-mundo.jpg', alt: 'Las misiones de mundo' },
      color: '#e3c565',
    })
  })
})

describe('el Rush de todos los Dofus', () => {
  it('sus 200 pasos, con el texto exacto de la guía', () => {
    expect(draft.steps).toHaveLength(200)
    for (const [index, old] of legacy.steps.entries()) {
      expect(stepText(draft.steps[index])).toBe(old.text)
    }
  })

  it('cada paso lleva los Dofus que da, en el orden del camino', () => {
    const road = draft.steps.flatMap((s) => s.dofus.map((name) => [s.legacyNumber, name]))
    expect(road).toHaveLength(26)
    expect(road[0]).toEqual([5, 'Dofawa'])
    expect(road.at(-1)).toEqual([200, 'Dofus vulbis'])
    expect(step(127).dofus).toEqual(['Dofus Ocre'])
    // El 190 da dos.
    expect(step(190).dofus).toEqual(['Dofus de los hielos', 'Dofus plateado centelleante'])
    expect(step(1).dofus).toEqual([])
  })

  it('el paso 200 cierra las paradas de los sueños de 158, 159 y 160', () => {
    // Sin verde: los cierra el paso entero.
    expect(step(200).segments.some((segment) => segment.kind === 'resolve')).toBe(false)
    expect(step(200).closes).toEqual([158, 159, 160])
  })

  it('con dos verdes, cada uno cierra el paso cuya misión dice terminar (el 144)', () => {
    const greens = step(144).segments.flatMap((segment) =>
      segment.kind === 'resolve' ? [segment.closes] : [],
    )
    expect(greens).toEqual([[143], [141]])
  })

  it('dos verdes que no dicen qué paso termina cada uno no se adivinan', () => {
    const broken: LegacyChecklist = {
      ...legacy,
      steps: legacy.steps.map((old) =>
        old.n === 144
          ? {
              ...old,
              text: 'Paso de prueba. Verde uno. Verde dos.',
              marks: [
                ['done', 'Verde uno.'],
                ['done', 'Verde dos.'],
              ],
            }
          : old,
      ),
    }
    expect(() => toChecklistDraft(todos, broken, alternatives)).toThrow(
      'Paso 144: varios verdes y no se sabe cuál cierra cada paso',
    )
  })

  it('la parada del 18 cae en «Arma letal»', () => {
    const stops = step(18).segments.filter((segment) => segment.kind === 'stop')
    expect(stops.map((stop) => stop.kind === 'stop' && stop.quest)).toEqual([1939])
  })

  it('sus objetos van en los seis grupos de siempre', () => {
    const categories = new Set(
      [...draft.steps.flatMap((s) => s.needs), ...draft.prerequisites.needs].map(
        (need) => need.category,
      ),
    )
    expect([...categories].sort()).toEqual(
      ['consumables', 'cosmetics', 'creatures', 'equipment', 'resources', 'souls'].sort(),
    )
    // Las jalabolas, con los consumibles.
    const jalabolas = draft.steps
      .flatMap((s) => s.needs)
      .filter((need) => /jalabola/i.test(need.name))
    expect(jalabolas.length).toBeGreaterThan(0)
    expect(jalabolas.every((need) => need.category === 'consumables')).toBe(true)
  })

  it('lleva el aviso del Dofus Ocre en el paso 127 y el de la orden de alineamiento', () => {
    expect(draft.prerequisites.notes.map((note) => note.title)).toEqual([
      'Ten el Dofus Ocre antes del paso 127',
      'La guía sigue la orden Espíritu de la salvación',
    ])
    expect(draft.prerequisites.notes[0].text).toContain(
      'que la guía termina en el paso 127 con el logro «El fin de la eternidad»',
    )
  })

  it('las notas escritas a mano van en sus pasos', () => {
    expect(step(113).note).toMatch(/^Para empezar la misión 2/)
    expect(step(151).note).toMatch(/^Sus dos misiones piden/)
    expect(step(62).quests.find((row) => row.quest === 1665)?.note).toBe(
      'Se puede hacer en cualquier momento antes del paso 131.',
    )
  })

  it('guarda lo que necesita la migración de su progreso antiguo', () => {
    expect(draft.legacy).toMatchObject({
      prefix: 'todos:',
      classicKeys: { v4: null, v3: null },
      guideVersion: 1,
    })
    expect(draft.legacy.previousSteps).toHaveLength(200)
  })
})

describe('el camino de Dofus de las otras checklists', () => {
  it('el Nebuloso da el Dofus de los Vigilantes en su paso 4', async () => {
    const nebuloso = CHECKLIST_CATALOG.find((entry) => entry.id === 'nebuloso')!
    const old = await readLegacyChecklist(ROOT, 'nebuloso')
    const other = toChecklistDraft(nebuloso, old, alternatives)
    expect(other.steps.flatMap((s) => s.dofus.map((name) => [s.legacyNumber, name]))).toEqual([
      [4, 'Dofus de los vigilantes'],
    ])
  })

  it('un Dofus del camino en un paso que no existe para la importación', () => {
    const broken: LegacyChecklist = {
      ...legacy,
      assets: {
        ...legacy.assets,
        DOFUS_ROAD: [{ name: 'Dofus fantasma', img: 'items/1.png', step: 999 }],
      },
    }
    expect(() => toChecklistDraft(todos, broken, alternatives)).toThrow(
      'El Dofus del camino «Dofus fantasma» va en el paso 999, que no existe',
    )
  })
})
