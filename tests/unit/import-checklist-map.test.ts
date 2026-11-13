// La checklist del Nebuloso tal como la deja la importación, antes de tocar la base: los
// datos de silvestre-checklist (copiados tal cual en tests/fixtures/silvestre-checklist)
// pasan a un borrador con referencias por ID de DofusDB. Lo que importa es la fidelidad: el
// texto de Torre, sus notas y sus prerrequisitos salen enteros y en su orden, y las paradas
// caen en el mismo objetivo que calcula el checklist antiguo.
import path from 'node:path'

import { beforeAll, describe, expect, it } from 'vitest'

import { CHECKLIST_CATALOG } from '../../scripts/import/checklists/catalog'
import { readLegacyChecklist, type LegacyChecklist } from '../../scripts/import/checklists/legacy'
import {
  stepText,
  toChecklistDraft,
  type ChecklistDraft,
} from '../../scripts/import/checklists/to-checklist'

import legacyObjectives from '../fixtures/legacy-checklist/objectives.json'

const ROOT = path.resolve(__dirname, '../fixtures/silvestre-checklist')
const nebuloso = CHECKLIST_CATALOG.find((entry) => entry.id === 'nebuloso')!

let legacy: LegacyChecklist
let draft: ChecklistDraft

beforeAll(async () => {
  legacy = await readLegacyChecklist(ROOT, 'nebuloso')
  draft = toChecklistDraft(nebuloso, legacy)
})

const step = (n: number) => {
  const found = draft.steps.find((candidate) => candidate.legacyNumber === n)
  if (!found) throw new Error(`Falta el paso ${n}`)
  return found
}

describe('el texto de cada paso', () => {
  it('sale entero: sus tramos, unidos, son el texto del paso antiguo', () => {
    expect(draft.steps).toHaveLength(legacy.steps.length)
    for (const [index, old] of legacy.steps.entries()) {
      const ours = draft.steps[index]
      expect(ours.legacyNumber).toBe(old.n)
      expect(stepText(ours)).toBe(old.text)
      for (const segment of ours.segments) {
        expect(segment.text.trim()).toBe(segment.text)
        expect(segment.text).not.toBe('')
      }
    }
  })

  it('separa el «detente aquí» y el «aquí se resuelve» en su sitio', () => {
    expect(step(9).segments.map(({ kind, text }) => [kind, text])).toEqual([
      ['plain', 'Logro "El rey y yo", misión 6: El barbero de Anutropía.'],
      ['stop', 'Avanza hasta tener que pasar la mazmorra del Rey Nidas.'],
      ['resolve', 'Pasa la mazmorra y completa las etapas 8 y 9.'],
    ])
    expect(step(7).segments.map(({ kind }) => kind)).toEqual(['plain', 'stop', 'plain'])
    expect(step(1).segments).toEqual([
      { kind: 'plain', text: 'Logro "De un mundo a otro". Completo.' },
    ])
  })

  it('cada «detente aquí» para en el objetivo que calcula el checklist antiguo', () => {
    const stops = draft.steps.flatMap((ours) =>
      ours.segments.flatMap((segment) =>
        segment.kind === 'stop'
          ? [{ step: ours.legacyNumber, questId: segment.quest, index: segment.stopObjective }]
          : [],
      ),
    )
    expect(stops).toEqual(
      legacyObjectives.stops.map(({ step, questId, index }) => ({ step, questId, index })),
    )
  })

  it('cada «aquí se resuelve» cierra los pasos que cierra la guía', () => {
    const resolves = draft.steps.flatMap((ours) =>
      ours.segments.flatMap((segment) =>
        segment.kind === 'resolve' ? [[ours.legacyNumber, segment.closes]] : [],
      ),
    )
    expect(resolves).toEqual(
      legacy.steps.filter((old) => old.closes).map((old) => [old.n, old.closes]),
    )
  })
})

describe('lo demás de cada paso', () => {
  it('las misiones del paso, en su orden y obligatorias (el Nebuloso no tiene otras)', () => {
    expect(step(10).quests).toEqual(
      [1492, 1493, 1494, 1495, 1496, 1514].map((quest) => ({
        quest,
        kind: 'mandatory',
        note: null,
        optionalDoneBy: null,
      })),
    )
    expect(step(12).quests).toEqual([])
  })

  it('el tipo, la nota y el paso que termina cada misión, de los datos de su checklist', () => {
    const withKinds: LegacyChecklist = {
      ...legacy,
      quests: { ...legacy.quests, STEP_QUEST_KINDS: { 11: { 1489: 'optional', 1491: 'take' } } },
      config: {
        ...legacy.config,
        journal: {
          ...legacy.config.journal,
          questNotes: { 11: { 1503: 'Se puede hacer en cualquier momento.' } },
          optionalDoneBy: { 1489: 15 },
        },
      },
    }
    const quests = toChecklistDraft(nebuloso, withKinds).steps[10].quests
    expect(quests.slice(0, 3)).toEqual([
      { quest: 1489, kind: 'optional', note: null, optionalDoneBy: 15 },
      { quest: 1491, kind: 'take', note: null, optionalDoneBy: null },
      {
        quest: 1503,
        kind: 'mandatory',
        note: 'Se puede hacer en cualquier momento.',
        optionalDoneBy: null,
      },
    ])
  })

  it('las notas escritas a mano, tal cual', () => {
    expect(step(8).note).toBe(legacy.config.journal.extraNotes[8])
    expect(step(22).note).toBe(legacy.config.journal.extraNotes[22])
    expect(step(9).note).toBeNull()
  })

  it('los logros del paso, enteros o solo algunas misiones', () => {
    expect(step(1).achievements).toEqual([{ achievement: 1072, mode: 'all', on: [] }])
    expect(step(7).achievements).toEqual([{ achievement: 1076, mode: 'some', on: [2] }])
  })

  it('lo que necesita, en su orden, con cantidad, nota y las misiones que lo piden', () => {
    const recupera = Number(
      Object.entries(legacy.quests.QUESTS).find(
        ([, quest]) => quest.n === 'Recupera el paquete',
      )![0],
    )
    expect(step(4).needs.slice(0, 2)).toEqual([
      {
        item: '15416',
        name: 'Insignia de maligilante',
        quantity: 1,
        note: 'o 30 000 kamas',
        quests: [recupera],
      },
      {
        item: '6961',
        name: 'Anillo de bandido',
        quantity: 1,
        note: 'o 100 000 kamas',
        quests: [recupera],
      },
    ])
    expect(step(5).needs.map((need) => [need.item, need.name, need.note])).toEqual([
      ['9687', 'Piedra de alma mediana', null],
      ['x:kama', 'Kama', null],
      ['15278', 'Llave de la Fábrica de Malefíscof', null],
      ['x:captura de almas', 'Captura de almas', 'Hechizo: requisito, no consumible'],
    ])
    expect(step(16).needs.map((need) => need.quantity)).toEqual([35, 1])
  })

  it('la figura: un PNJ de DofusDB o su imagen, con su papel', () => {
    expect(step(1).figure).toEqual({ npc: 2357, art: null, role: 'Inicia el paso' })
    expect(step(12).figure).toEqual({
      npc: null,
      art: { path: 'npcs/dios-anutrof.png', alt: 'Dios Anutrof' },
      role: 'Se habla con',
    })
  })

  it('el banner: el mapa donde empieza o, sin él, el de su zona', () => {
    expect(step(1).banner?.path).toBe('maps/start/164496396.jpg')
    expect(step(12).banner).toEqual({ path: 'zones/anutropia.jpg', alt: 'Anutropía' })
    for (const ours of draft.steps) expect(ours.banner).not.toBeNull()
  })

  it('los jefes del paso', () => {
    expect(step(22).bosses).toEqual([3835])
    expect(step(1).bosses).toEqual([])
  })
})

describe('la checklist', () => {
  it('su ficha, sin cifras en la descripción', () => {
    expect(draft).toMatchObject({
      slug: 'checklist-nebuloso',
      name: 'Dofus Nebuloso',
      order: 3,
      legacyHref: 'https://www.torrentearcano.com/checklist-nebuloso',
      dofusGuide: 'misiones-nebuloso',
    })
    expect(draft.description).not.toMatch(/\d/)
  })

  it('los prerrequisitos de Torre, con sus claves y en su orden', () => {
    expect(draft.prerequisites).toEqual({
      intro: legacy.prerequisites.intro,
      groups: [
        {
          title: 'Logros previos',
          rows: [
            { key: 'l1', text: 'Más de 3 000 puntos de logro en el personaje (obligatorio)' },
            {
              key: 'l2',
              text: 'Búsquedas de los portales de Anutropía, Sramvil y Xelorium (no obligatorio, para desplazarse con mayor fluidez)',
            },
          ],
        },
        {
          title: 'Oficios',
          rows: [{ key: 'o1', text: 'Cualquier oficio nivel 200 (obligatorio)' }],
        },
        { title: 'Hechizos', rows: [{ key: 'h1', text: 'Captura de almas (obligatorio)' }] },
      ],
    })
  })

  it('lo que necesita la migración del progreso guardado', () => {
    expect(draft.legacy).toEqual({
      prefix: 'nebuloso:',
      classicKeys: { v4: 'dofus_nebuloso_clean_v1', v3: null },
      guideVersion: 1,
      previousSteps: legacy.previousSteps,
    })
  })
})

describe('el catálogo', () => {
  it('las cuatro checklists de Torre con su slug de Squarespace; solo el Nebuloso se porta', () => {
    expect(
      CHECKLIST_CATALOG.map(({ id, slug, legacyHref, ported }) => [id, slug, legacyHref, ported]),
    ).toEqual([
      [
        'silvestre',
        'checklist-silvestre',
        'https://www.torrentearcano.com/checklist-silvestre',
        false,
      ],
      [
        'hielos',
        'checklist-dofus-de-los-hielos',
        'https://www.torrentearcano.com/checklist-dofus-de-los-hielos',
        false,
      ],
      ['nebuloso', 'checklist-nebuloso', 'https://www.torrentearcano.com/checklist-nebuloso', true],
      ['ocre', 'lista-ocre', 'https://www.torrentearcano.com/lista-ocre', false],
    ])
    for (const entry of CHECKLIST_CATALOG) expect(entry.description).not.toMatch(/\d/)
  })
})
