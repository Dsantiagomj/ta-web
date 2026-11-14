// La checklist del Silvestre tal como la deja la importación, antes de tocar la base. Lleva lo
// que el Nebuloso no tenía: resaltados que no van con la misma mayúscula ni con sus paréntesis,
// avisos (nota, consejo, «se debe», «incluye»), varias paradas en un mismo rojo, paradas que
// termina un paso posterior, el verde que deja una parada nueva, pasos que cierran otros sin
// verde, filas con alternativas, en un grupo o que se conservan, los objetos de los
// prerrequisitos y los avisos de los prerrequisitos (el Dofus Ocre y la orden de Bonta).
import path from 'node:path'

import { beforeAll, describe, expect, it } from 'vitest'

import { CHECKLIST_CATALOG } from '../../scripts/import/checklists/catalog'
import { readLegacyChecklist, type LegacyChecklist } from '../../scripts/import/checklists/legacy'
import {
  stepText,
  toChecklistDraft,
  type ChecklistDraft,
  type SegmentDraft,
} from '../../scripts/import/checklists/to-checklist'

import oldStops from '../fixtures/legacy-checklist/silvestre-stops.json'

const ROOT = path.resolve(__dirname, '../fixtures/silvestre-checklist')
const silvestre = CHECKLIST_CATALOG.find((entry) => entry.id === 'silvestre')!

let legacy: LegacyChecklist
let draft: ChecklistDraft

beforeAll(async () => {
  legacy = await readLegacyChecklist(ROOT, 'silvestre')
  draft = toChecklistDraft(silvestre, legacy)
})

const step = (n: number) => {
  const found = draft.steps.find((candidate) => candidate.legacyNumber === n)
  if (!found) throw new Error(`Falta el paso ${n}`)
  return found
}
const kinds = (n: number) => step(n).segments.map((segment) => segment.kind)
type Stop = Extract<SegmentDraft, { kind: 'stop' }>
const stops = (n: number) =>
  step(n).segments.filter((segment): segment is Stop => segment.kind === 'stop')

describe('el texto de cada paso', () => {
  it('sale entero y en su orden: sus tramos, unidos, son el texto del paso antiguo', () => {
    expect(draft.steps).toHaveLength(100)
    for (const [index, old] of legacy.steps.entries()) {
      expect(draft.steps[index].legacyNumber).toBe(old.n)
      expect(stepText(draft.steps[index])).toBe(old.text)
    }
  })

  it('un resaltado escrito con otra mayúscula o entre paréntesis toma el texto de la guía', () => {
    // El rojo antiguo es «Hasta tener que pasar Maxilubo»; la guía lo escribe en minúscula.
    expect(stops(17)[0].text).toBe('(hasta tener que pasar Maxilubo)')
    expect(stops(10)[0].text).toBe('(Hasta tener que pasar Maxilubo)')
    expect(step(10).segments[0]).toEqual({
      kind: 'plain',
      text: 'Sidimote: Logro "Entre lubos anda el juego", misión 7: La bestia interior, misión 8: Encender la mecha.',
    })
  })

  it('los avisos de la guía van en su tramo: nota, consejo, «se debe» e «incluye»', () => {
    expect(kinds(1)).toEqual(['plain', 'includes'])
    expect(kinds(7)).toEqual(['plain', 'note', 'plain', 'stop'])
    expect(step(7).segments[1].text).toBe('(opcional pero útil):')
    expect(kinds(28)).toEqual(['plain', 'stop', 'tip', 'resolve', 'must'])
    expect(kinds(16)).toEqual(['plain', 'tip'])
  })

  it('el verde que deja una parada nueva se parte en «aquí se resuelve» y «detente aquí»', () => {
    expect(step(43).segments.slice(-2)).toEqual([
      {
        kind: 'resolve',
        text: 'Se matan los monstruos necesarios, se termina la misión 3 del inciso 43 y se actualiza la misión 1 del inciso 43',
        closes: [],
      },
      expect.objectContaining({ kind: 'stop', text: 'hasta tener que pasar Kodámade.' }),
    ])
    expect(kinds(72).slice(-2)).toEqual(['resolve', 'stop'])
  })

  it('un verde sin pasos que cerrar se resuelve en su propio paso', () => {
    expect(step(41).segments.find((segment) => segment.kind === 'resolve')).toMatchObject({
      closes: [],
    })
    expect(step(28).segments.find((segment) => segment.kind === 'resolve')).toMatchObject({
      closes: [25, 26, 27],
    })
  })
})

describe('las paradas', () => {
  it('caen en los mismos objetivos que calcula el checklist antiguo, en su orden', () => {
    const ours = draft.steps.flatMap((ours) =>
      ours.segments.flatMap((segment) =>
        segment.kind === 'stop'
          ? [segment, ...(segment.more ?? [])].flatMap((point) =>
              point.quest === null
                ? []
                : [
                    {
                      step: ours.legacyNumber,
                      quest: point.quest,
                      index: point.stopObjective,
                      later: point.later ?? false,
                    },
                  ],
            )
          : [],
      ),
    )
    expect(ours).toEqual(
      oldStops.map((point) => ({
        step: point.step,
        quest: point.quest,
        index: point.index,
        later: 'later' in point ? point.later : false,
      })),
    )
  })

  it('un rojo con varias paradas lleva la primera y las demás en «más paradas»', () => {
    const [red] = stops(80)
    expect(red.quest).not.toBeNull()
    expect(red.more).toHaveLength(1)
    expect(stops(27)).toHaveLength(2)
    expect(stops(27).map((stop) => stop.more ?? [])).toEqual([[], []])
  })

  it('la parada que termina un paso posterior, con su propia línea', () => {
    const [red] = stops(38)
    expect(red.later).toBeUndefined()
    expect(red.more).toEqual([
      expect.objectContaining({
        later: true,
        line: 'Hasta obtener la bendición de Viti: la da «La bendición de Viti», en el paso 39',
      }),
    ])
    expect(stops(92)[0]).toMatchObject({ later: true })
  })

  it('cada parada de un verde repartido lleva su parte (el 28: peleas y mazmorra)', () => {
    const [red] = stops(28)
    expect(red.resumeLine).toBe('Se hacen las peleas correspondientes.')
    expect(red.more?.[0].resumeLine).toMatch(/^Se pasa Morsagüino real terminando/)
  })
})

describe('lo demás de cada paso', () => {
  it('los pasos que cierra un paso sin verde y los que solo avanza', () => {
    expect(step(93).closes).toEqual([92])
    expect(step(93).updates).toEqual([84])
    expect(step(94).closes).toEqual([84])
    expect(step(59).updates).toEqual([58])
    // Con verde, los pasos que cierra van en su «aquí se resuelve».
    expect(step(45).closes).toEqual([])
  })

  it('las misiones opcionales y de solo tomarla, con el paso que termina «Arma letal»', () => {
    expect(step(7).quests).toContainEqual({
      quest: 1939,
      kind: 'optional',
      note: null,
      optionalDoneBy: 93,
    })
    expect(step(13).quests).toContainEqual(
      expect.objectContaining({
        quest: 1869,
        note: expect.stringMatching(/^La guía no la retoma/),
      }),
    )
  })

  it('las filas genéricas (la misión de clase, una por alineamiento) se quedan fuera y se dicen', () => {
    expect(draft.generic).toEqual([
      { step: 1, name: 'Misión de clase' },
      { step: 63, name: 'Prólogo invernal' },
    ])
    for (const ours of draft.steps) {
      for (const row of ours.quests) expect(Number.isInteger(row.quest)).toBe(true)
      for (const need of ours.needs)
        for (const id of need.quests) expect(Number.isInteger(id)).toBe(true)
    }
    expect(step(1).quests).toHaveLength(15)
  })

  it('los logros «hasta la misión N» guardan su modo', () => {
    expect(step(9).achievements).toEqual([{ achievement: 1613, mode: 'upto', on: [1, 2] }])
    // Los pasos de alineamiento no llevan logro: sus misiones van en el paso.
    expect(step(20).achievements).toEqual([])
  })

  it('una fila con alternativas guarda cada opción con su cantidad', () => {
    expect(step(40).needs).toEqual([
      expect.objectContaining({
        item: '7045',
        name: 'Pandaburg',
        quantity: 1,
        alternatives: [{ item: '7047', name: 'Pandapils', quantity: 1 }],
      }),
    ])
    expect(step(68).needs.find((need) => need.item === '7013')).toMatchObject({
      quantity: 10,
      alternatives: [{ item: '7016', quantity: 10 }],
    })
  })

  it('una fila en un grupo (misión opcional) y una que se conserva tras usarla', () => {
    expect(step(7).needs[0]).toMatchObject({ item: '17994', group: 'Misión opcional' })
    expect(step(12).needs.find((need) => need.item === '9687')).toMatchObject({ reusable: true })
    expect(step(3).needs.every((need) => need.reusable === undefined)).toBe(true)
  })

  it('ninguna fila se pierde: cada una con todas sus opciones, en su orden', () => {
    for (const ours of draft.steps) {
      const rows = legacy.resources.steps[ours.legacyNumber] ?? []
      expect(
        ours.needs.map((need) => [
          [need.item, need.quantity],
          ...(need.alternatives ?? []).map((alt) => [alt.item, alt.quantity]),
        ]),
      ).toEqual(rows.map((row) => row.a))
    }
  })
})

describe('los prerrequisitos', () => {
  it('sus tres grupos de Torre, con sus claves y en su orden', () => {
    expect(draft.prerequisites.groups.map((group) => group.rows.map((row) => row.key))).toEqual([
      ['l1', 'l2', 'l3', 'l4', 'l5', 'l10', 'l6', 'l11', 'l7', 'l8', 'l12'],
      ['o1', 'o2', 'o3', 'o4', 'o5', 'o6'],
      ['h1', 'h2', 'h3'],
    ])
  })

  it('los objetos que piden, cada uno con el prerrequisito en el que se gasta', () => {
    const needs = draft.prerequisites.needs
    expect(needs).toHaveLength(legacy.resources.steps[0].length)
    expect(needs[0]).toMatchObject({ item: '421', quantity: 50, prerequisite: 'l11' })
    expect(needs.find((need) => need.item === '8918')).toMatchObject({
      group: 'Opcional · Altos vuelos',
      prerequisite: 'l10',
    })
  })

  it('los avisos: empezar el Dofus Ocre cuanto antes y la orden que sigue la guía', () => {
    expect(draft.prerequisites.notes).toEqual([
      {
        title: 'Empieza el Dofus Ocre cuanto antes',
        text: `${legacy.prerequisites.ocre} Lo da la misión «La eterna cosecha», que la guía termina en el paso 79 con el logro «El fin de la eternidad».`,
      },
      {
        title: 'La guía sigue la orden Espíritu de la salvación',
        text: 'Por eso solo se listan los recursos de esa orden. Si eliges Corazón valiente u Ojo atento, el paso 78 enlaza las misiones de la tuya.',
      },
    ])
  })
})

describe('la checklist', () => {
  it('su ficha y lo que necesita la migración del progreso guardado', () => {
    expect(draft).toMatchObject({ slug: 'checklist-silvestre', dofusGuide: 'dofus-silvestre' })
    expect(draft.legacy).toMatchObject({
      prefix: 'silvestre:',
      classicKeys: { v4: 'dofus_silvestre_clean_v4', v3: 'dofus_silvestre_clean_v3' },
      guideVersion: 4,
    })
    expect(draft.legacy.previousSteps[40]).toEqual([41, 90])
    expect(draft.legacy.ownedMoves['x:esencia de cil|28488']).toEqual(['14693|28488', [60]])
  })
})
