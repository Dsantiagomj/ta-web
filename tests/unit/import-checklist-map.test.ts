// La checklist del Nebuloso tal como la deja la importación, antes de tocar la base: los
// datos de silvestre-checklist (copiados tal cual en tests/fixtures/silvestre-checklist)
// pasan a un borrador con referencias por ID de DofusDB. Lo que importa es la fidelidad: el
// texto de Torre, sus notas y sus prerrequisitos salen enteros y en su orden, y las paradas
// caen en el mismo objetivo que calcula el checklist antiguo.
import path from 'node:path'

import { beforeAll, describe, expect, it } from 'vitest'

import { CHECKLIST_CATALOG, hasLegacySteps } from '../../scripts/import/checklists/catalog'
import { readLegacyChecklist, type LegacyChecklist } from '../../scripts/import/checklists/legacy'
import {
  stepText,
  toChecklistDraft,
  type ChecklistDraft,
} from '../../scripts/import/checklists/to-checklist'

import { stepStops, type StepQuest } from '../../scripts/import/checklists/stops'

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
        category: 'resources',
        countsInTotal: true,
        quests: [recupera],
      },
      {
        item: '6961',
        name: 'Anillo de bandido',
        quantity: 1,
        note: 'o 100 000 kamas',
        category: 'resources',
        countsInTotal: true,
        quests: [recupera],
      },
    ])
    expect(
      step(5).needs.map((need) => [
        need.item,
        need.name,
        need.quantity,
        need.note,
        need.category,
        need.countsInTotal,
      ]),
    ).toEqual([
      ['9687', 'Piedra de alma mediana', 1, null, 'souls', true],
      ['x:kama', 'Kama', 1, null, 'resources', true],
      ['15278', 'Llave de la Fábrica de Malefíscof', 1, null, 'resources', true],
      [
        'x:captura de almas',
        'Captura de almas',
        1,
        'Hechizo: requisito, no consumible',
        'resources',
        false,
      ],
    ])
    expect(step(4).needs[2]).toMatchObject({ item: '15990', category: 'equipment' })
    expect(step(26).needs).toMatchObject([{ note: 'Objeto de misión', countsInTotal: false }])
    expect(step(16).needs.map((need) => need.quantity)).toEqual([35, 1])
  })

  it('ninguna fila se pierde: las de cada paso son las de la checklist antigua, en su orden', () => {
    const old = legacy.resources.steps
    expect(Object.keys(old).length).toBeGreaterThan(0)
    for (const ours of draft.steps) {
      const rows = old[ours.legacyNumber] ?? []
      expect(ours.needs.map((need) => [need.item, need.quantity, need.note])).toEqual(
        rows.map((row) => [row.a[0][0], row.a[0][1], row.n ?? null]),
      )
    }
  })

  it('una fila con grupo o con alternativas se guarda entera (las tiene el Silvestre)', () => {
    const withRows = (row: Partial<LegacyChecklist['resources']['steps'][string][number]>) => ({
      ...legacy,
      resources: {
        ...legacy.resources,
        steps: { ...legacy.resources.steps, 2: [{ ...legacy.resources.steps[2][0], ...row }] },
      },
    })
    expect(toChecklistDraft(nebuloso, withRows({ g: 'Opcional' })).steps[1].needs[0]).toMatchObject(
      { group: 'Opcional' },
    )
    expect(
      toChecklistDraft(
        nebuloso,
        withRows({
          a: [
            ['15533', 1],
            ['15534', 2],
          ],
        }),
      ).steps[1].needs[0],
    ).toMatchObject({ item: '15533', quantity: 1, alternatives: [{ item: '15534', quantity: 2 }] })
  })

  it('el icono del paso, con la clave del arte del juego que ya usa Media', () => {
    expect(step(4).icon).toEqual({
      path: 'items/23020.png',
      alt: 'Dofus de los vigilantes',
      key: 'dofusdb-item-image:23020',
    })
    expect(step(1).icon).toEqual({
      path: 'achievements/459.png',
      alt: 'De un mundo al otro',
      key: 'dofusdb-achievement-image:459',
    })
    expect(step(12).icon).toBeNull()
  })

  it('la figura: un PNJ de DofusDB o su imagen, con su papel', () => {
    expect(step(1).figure).toEqual({ npc: 2357, art: null, role: 'Inicia el paso' })
    expect(step(12).figure).toEqual({
      npc: null,
      art: { path: 'npcs/dios-anutrof.png', alt: 'Dios Anutrof' },
      role: 'Se habla con',
    })
  })

  it('la zona: la de Torre, que agrupa los pasos aunque sus misiones empiecen en otra', () => {
    for (const [index, old] of legacy.steps.entries())
      expect(draft.steps[index].zone).toBe(old.zone)
    expect(step(1).zone).toBe('Llanuras de Cania')
    // Sus misiones empiezan en las Llanuras de Cania, pero el paso es de Anutropía.
    expect(step(5).zone).toBe('Anutropía')
    expect(step(26).zone).toBe('Xelorium')
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
      notes: [],
      needs: [],
    })
  })

  it('los nombres de lo que enlaza por ID, para avisar de lo que no casa', () => {
    expect(draft.names?.quests?.[1491]).toBe('Muestreo')
    expect(draft.names?.achievements?.[1076]).toBe('El alegre retirado')
    expect(draft.names?.monsters?.[3835]).toBe('Vórtex')
    expect(draft.names?.npcs?.[2357]).toBe('Sargento Zaltzom')
  })

  it('lo que necesita la migración del progreso guardado', () => {
    expect(draft.legacy).toEqual({
      prefix: 'nebuloso:',
      classicKeys: { v4: 'dofus_nebuloso_clean_v1', v3: null },
      guideVersion: 1,
      previousSteps: legacy.previousSteps,
      ownedMoves: {},
    })
  })

  it('las claves de objetos que cambiaron (ownedMoves), como las da la checklist antigua', () => {
    const moves = { '519@orden espiritu de la salvacion': ['519', [78, 80]] as [string, number[]] }
    const withMoves = toChecklistDraft(nebuloso, {
      ...legacy,
      config: { ...legacy.config, ownedMoves: moves },
    })
    expect(withMoves.legacy.ownedMoves).toEqual(moves)
  })
})

describe('el catálogo', () => {
  it('las cuatro checklists de Torre con su slug de Squarespace; todas se portan; el Ocre, como checklist de almas', () => {
    expect(
      CHECKLIST_CATALOG.map(({ id, slug, legacyHref, ported }) => [id, slug, legacyHref, ported]),
    ).toEqual([
      [
        'silvestre',
        'checklist-silvestre',
        'https://www.torrentearcano.com/checklist-silvestre',
        true,
      ],
      [
        'hielos',
        'checklist-dofus-de-los-hielos',
        'https://www.torrentearcano.com/checklist-dofus-de-los-hielos',
        true,
      ],
      ['nebuloso', 'checklist-nebuloso', 'https://www.torrentearcano.com/checklist-nebuloso', true],
      ['ocre', 'lista-ocre', 'https://www.torrentearcano.com/lista-ocre', true],
    ])
    for (const entry of CHECKLIST_CATALOG) expect(entry.description).not.toMatch(/\d/)
    // El Ocre es de almas: las de «La eterna cosecha» (misión 439 de DofusDB).
    expect(CHECKLIST_CATALOG.find((entry) => entry.id === 'ocre')).toMatchObject({
      kind: 'souls',
      soulsQuest: 439,
    })
  })

  it('solo las checklists de pasos leen sus pasos antiguos: el Ocre no tiene steps.js', () => {
    expect(CHECKLIST_CATALOG.filter(hasLegacySteps).map((entry) => entry.id)).toEqual([
      'silvestre',
      'hielos',
      'nebuloso',
    ])
  })
})

describe('revisión de #115', () => {
  it('un resaltado con espacios alrededor no se come la palabra siguiente', () => {
    const withSpaces: LegacyChecklist = {
      ...legacy,
      steps: [
        {
          ...legacy.steps[0],
          text: 'Logro "De prueba". Hasta pasar a Nidas Se pasa la mazmorra.',
          marks: [['stop', ' Hasta pasar a Nidas ']],
          closes: undefined,
        },
        ...legacy.steps.slice(1),
      ],
    }
    expect(toChecklistDraft(nebuloso, withSpaces).steps[0].segments.map((s) => s.text)).toEqual([
      'Logro "De prueba".',
      'Hasta pasar a Nidas',
      'Se pasa la mazmorra.',
    ])
  })

  it('sin paradas escritas a mano, cada rojo se sitúa por su texto, cada uno en su misión', () => {
    const quest = (id: number, boss: string): StepQuest => ({
      id,
      kind: 'mandatory',
      n: `Misión ${id}`,
      s: [
        {
          n: '',
          o: [
            { k: 'npc', t: 'Habla' },
            { k: 'fight', t: `Vence a 1 x ${boss}` },
          ],
        },
      ],
    })
    const step = {
      n: 1,
      zone: 'Zona',
      text: 'Hasta tener que pasar Nidas. Hasta tener que pasar Vórtex.',
      base: '',
      marks: [
        ['stop', 'Hasta tener que pasar Nidas.'],
        ['stop', 'Hasta tener que pasar Vórtex.'],
      ] as LegacyChecklist['steps'][number]['marks'],
    }
    expect(stepStops(step, [quest(1, 'Nidas'), quest(2, 'Vórtex')], {})).toEqual([
      [{ quest: 1, index: 1 }],
      [{ quest: 2, index: 1 }],
    ])
  })

  it('el aviso del Dofus Ocre sin paso o sin texto para con un error, no dice «paso null»', () => {
    const withNote = (ocre: string, ocreStep: number | null): LegacyChecklist => ({
      ...legacy,
      config: {
        ...legacy.config,
        prereqNote: { title: 'Empieza el Ocre', quest: 'La eterna cosecha', achievement: 'Fin' },
      },
      prerequisites: { ...legacy.prerequisites, ocre, ocreStep },
    })
    expect(() => toChecklistDraft(nebuloso, withNote('Empieza pronto.', null))).toThrow(/Ocre/)
    expect(() => toChecklistDraft(nebuloso, withNote('', 79))).toThrow(/Ocre/)
    expect(toChecklistDraft(nebuloso, withNote('Empieza pronto.', 79)).prerequisites.notes).toEqual(
      [expect.objectContaining({ text: expect.stringContaining('en el paso 79') })],
    )
  })
})
