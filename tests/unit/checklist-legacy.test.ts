import { readFileSync } from 'node:fs'
import path from 'node:path'

import { beforeAll, describe, expect, it } from 'vitest'

import type { ChecklistIslandData } from '@/lib/checklists/page'
import { checklistModel, questState, stepDone } from '@/lib/checklists/progress/engine'
import {
  migrateLegacy,
  migrateOwned,
  migrateProgress,
  migrateQuestPos,
  readClassic,
} from '@/lib/checklists/progress/legacy'
import { pendingLegacy } from '@/lib/checklists/progress/legacy-keys'
import { emptyProgress, type Progress } from '@/lib/checklists/progress/store'

import { islandData, nebulosoDraft, stepId } from './helpers/nebuloso'

// La migración del progreso de silvestre-checklist: una vez por checklist antigua, sin borrar
// sus claves y sumando a lo que ya hay. Las partidas de tests/fixtures/legacy-checklist/
// local-storage/ son lo que la app antigua guarda en localStorage, en sus formatos.

const storageFixture = (name: string): Record<string, string> => {
  const { _: _comment, ...keys } = JSON.parse(
    readFileSync(
      path.resolve(__dirname, `../fixtures/legacy-checklist/local-storage/${name}.json`),
      'utf8',
    ),
  ) as Record<string, string>
  return keys
}

const NOW = 1_700_000_000_000
const NEBULOSO = 1
const HIELOS = 8
let data: ChecklistIslandData

beforeAll(async () => {
  data = {
    ...islandData(await nebulosoDraft()),
    checklistId: NEBULOSO,
    checklists: { '1': 'Dofus Nebuloso', nebuloso: 'Dofus Nebuloso', '8': 'Dofus de los Hielos' },
    legacyIds: { nebuloso: NEBULOSO, hielos: HIELOS },
  }
})

const migrate = (keys: Record<string, string>, progress: Progress = emptyProgress()) =>
  migrateLegacy(progress, {
    keys: Object.keys(keys),
    read: (key) => keys[key] ?? null,
    data,
    now: NOW,
  })

const index = (n: number) => n - 1

describe('pendingLegacy: si hay que cargar la migración', () => {
  it('con claves antiguas de algo aún sin migrar, sí', () => {
    expect(pendingLegacy(['nebuloso:done'], 'nebuloso', {})).toBe(true)
    expect(pendingLegacy(['dofus_nebuloso_clean_v1'], 'nebuloso', {})).toBe(true)
    expect(pendingLegacy(['dofus-checklists:shared'], 'nebuloso', {})).toBe(true)
    expect(pendingLegacy(['global:questObjective'], 'nebuloso', {})).toBe(true)
  })

  it('ya migrado, sin claves antiguas o con claves que no llevan progreso, no', () => {
    expect(pendingLegacy(['nebuloso:done'], 'nebuloso', { nebuloso: 1 })).toBe(false)
    expect(pendingLegacy(['global:owned'], 'nebuloso', { 'global:quests': 1 })).toBe(false)
    expect(pendingLegacy([], 'nebuloso', {})).toBe(false)
    expect(
      pendingLegacy(['nebuloso:theme', 'cosecha:done', 'ta-web:progress'], 'nebuloso', {}),
    ).toBe(false)
    // El clásico de otra checklist no se puede pasar a estos pasos
    expect(pendingLegacy(['dofus_silvestre_clean_v4'], 'nebuloso', {})).toBe(false)
  })
})

describe('migrateLegacy con una partida al día', () => {
  let p: Progress
  let model: ReturnType<typeof checklistModel>
  beforeAll(() => {
    p = migrate(storageFixture('nebuloso-current'))
    model = checklistModel(data)
  })

  it('los pasos hechos pasan a su stepId por su número antiguo', () => {
    for (const n of [1, 2, 3, 7]) expect(stepDone(p, model, index(n)), `paso ${n}`).toBe(true)
    expect(p.steps[stepId(1)]).toEqual({ done: true, at: NOW })
  })

  it('el clásico ya traído no vuelve a marcar lo que se desmarcó', () => {
    expect(stepDone(p, model, index(9))).toBe(false)
  })

  it('el 7 para y nadie lo ha cerrado: su misión se queda en la parada', () => {
    const stop = data.steps[index(7)][2].find((quest) => quest.length === 3)!
    expect(p.quests[stop[0]]).toEqual({ o: stop[2], by: { c: NEBULOSO, s: stepId(7) }, at: NOW })
  })

  it('questObjective: terminada pasado su último objetivo, a medias si no', () => {
    expect(p.quests[1608]).toEqual({ o: 'done', by: { c: NEBULOSO }, at: NOW })
    expect(p.quests[1609]).toEqual({ o: 2, by: { c: NEBULOSO }, at: NOW })
  })

  it('los prerrequisitos con el ID de la checklist delante', () => {
    expect(p.prereqs).toEqual({ '1:l1': NOW, '1:o1': NOW })
  })

  it('lo conseguido: entero tal cual y «#n» con el stepId; un paso que no existe se deja', () => {
    expect(p.owned).toEqual({
      '15533': NOW,
      [`15416#${stepId(4)}`]: NOW,
      [`x:kama#${stepId(5)}`]: NOW,
      // De dofus-checklists:shared (Hielos) y de global:owned, solo lo entero
      '7906': NOW,
      '14509': NOW,
    })
  })

  it('dofus-checklists:shared: lo de las otras checklists sale hecho allí; lo de esta, no se repite', () => {
    expect(p.quests[4242]).toEqual({ o: 'done', by: { c: HIELOS }, at: NOW })
    expect(p.quests[7777]).toBeUndefined()
    // Una de las de Hielos que aquí lleva un paso hecho sale hecha por lo de aquí, no por Hielos
    const state = questState(p, model, index(2), 1532)
    expect(state.done).toBe(true)
    expect(state.lock).not.toEqual({ checklist: 'Dofus de los Hielos' })
  })

  it('global:*: una misión que esta checklist no lleva no se trae: sin sus objetivos no se sabe si está terminada', () => {
    expect(p.quests[5151]).toBeUndefined()
  })

  it('apunta qué migró, una vez por cada una', () => {
    expect(p.migrated).toEqual({ nebuloso: NOW, shared: NOW, 'global:quests': NOW })
    // Otra pasada no cambia nada
    expect(migrate(storageFixture('nebuloso-current'), p)).toBe(p)
  })

  it('suma a lo que ya hay: nunca quita ni deshace nada', () => {
    const before: Progress = {
      ...emptyProgress(),
      steps: { [stepId(9)]: { done: true, at: 5 } },
      quests: { 1609: { o: 'done', by: { c: NEBULOSO, s: stepId(4) }, at: 5 } },
      prereqs: { '1:l2': 5 },
    }
    const after = migrate(storageFixture('nebuloso-current'), before)
    expect(after.steps[stepId(9)]).toEqual({ done: true, at: 5 })
    expect(after.quests[1609]).toEqual(before.quests[1609])
    expect(after.prereqs).toEqual({ '1:l2': 5, '1:l1': NOW, '1:o1': NOW })
  })
})

describe('migrateLegacy con una partida antigua', () => {
  it('questModel < 2: las misiones de antes de la que iba en curso quedan terminadas', () => {
    const p = migrate(storageFixture('nebuloso-old'))
    // En el 4 iba por la cuarta: 1608, 1609 y 1610, terminadas
    for (const id of [1608, 1609, 1610]) expect(p.quests[id]?.o, String(id)).toBe('done')
    expect(p.quests[1611]).toBeUndefined()
  })

  it('el clásico sin traer se suma a los pasos', () => {
    const model = checklistModel(data)
    const p = migrate(storageFixture('nebuloso-old'))
    for (const n of [1, 5, 6]) expect(stepDone(p, model, index(n)), `paso ${n}`).toBe(true)
    expect(p.prereqs).toEqual({ '1:h1': NOW })
  })
})

describe('las piezas de la migración, como en silvestre-checklist', () => {
  // El 1 nuevo es el 1 antiguo; el 2 junta el 2 y el 3; el 3 es el 4
  const previous = [[1], [2, 3], [4]]

  it('migrateProgress: un paso nuevo queda hecho si lo estaban todos los antiguos que lo forman', () => {
    expect(migrateProgress({ 1: true, 2: true, 4: true }, { 1: 2, 2: 1 }, previous)).toEqual({
      done: { 1: true, 3: true },
      questPos: { 1: 2 },
    })
    expect(migrateProgress({ 2: true, 3: true }, {}, previous).done).toEqual({ 2: true })
  })

  it('migrateQuestPos: no baja una misión que ya iba más lejos y se salta las que pesan 0', () => {
    const weights = { 1: { q: [10, 0, 5], ids: ['7', '8', '9'], os: [4, 3, 2] } }
    expect(migrateQuestPos({ 1: 2 }, { 7: 1 }, weights)).toEqual({ 7: 4 })
    expect(migrateQuestPos({ 1: 3 }, { 9: 6 }, weights)).toEqual({ 7: 4, 9: 6 })
  })

  it('migrateOwned: las claves que cambiaron pasan a las partes de la nueva', () => {
    const moves = { '519@orden': ['519', [78, 80]] as [string, number[]] }
    expect(migrateOwned({ '519@orden#78': true, '15': true }, moves)).toEqual({
      '519#78': true,
      '519#80': true,
      '15': true,
    })
  })

  it('readClassic: manda la v4; sin ella, la v3 pasada a la numeración de ahora', () => {
    const classic = (steps: number[]) =>
      JSON.stringify({ checked: [1, 2, 3, 4].map((n) => steps.includes(n)), darkMode: true })
    const keys = { v4: 'dofus_x_clean_v4', v3: 'dofus_x_clean_v3' }
    const read = (store: Record<string, string>) => (key: string) => store[key] ?? null
    expect(readClassic(read({ dofus_x_clean_v4: classic([1]) }), keys, previous)).toEqual([1])
    expect(readClassic(read({ dofus_x_clean_v3: classic([1, 2, 3]) }), keys, previous)).toEqual([
      1, 2,
    ])
    expect(readClassic(read({ dofus_x_clean_v4: '{roto' }), keys, previous)).toEqual([])
  })
})

describe('revisión del PR 5: migración', () => {
  const withLegacy = (legacy: ChecklistIslandData['legacy'], numbers?: (number | null)[]) => ({
    ...data,
    legacy: { ...data.legacy, ...legacy },
    steps: numbers
      ? data.steps
          .slice(0, numbers.length)
          .map(([id, , quests], i) => [id, numbers[i], quests] as (typeof data.steps)[number])
      : data.steps,
    weights: numbers ? data.weights.slice(0, numbers.length) : data.weights,
  })
  const run = (input: ChecklistIslandData, keys: Record<string, string>, p = emptyProgress()) =>
    migrateLegacy(p, {
      keys: Object.keys(keys),
      read: (key) => keys[key] ?? null,
      data: input,
      now: NOW,
    })

  it('ownedMoves de la colección pasa las claves que cambiaron', () => {
    const input = withLegacy({ ownedMoves: { '519@orden': ['519', [2, 3]] } } as never)
    const p = run(input, { 'nebuloso:owned': JSON.stringify({ '519@orden#2': true }) })
    expect(p.owned).toEqual({ [`519#${stepId(2)}`]: NOW, [`519#${stepId(3)}`]: NOW })
  })

  it('sin previousSteps, los números antiguos son los legacyNumber, no las posiciones', () => {
    // El paso 2 antiguo ya no está: el segundo de ahora es el 3 antiguo
    const input = withLegacy({ guideVersion: 2, previousSteps: undefined }, [1, 3])
    const model = checklistModel(input)
    const p = run(input, {
      'nebuloso:done': JSON.stringify({ 3: true }),
      'nebuloso:guide': '1',
      dofus_nebuloso_clean_v1: JSON.stringify({ checked: [true, false, false] }),
    })
    expect(stepDone(p, model, 1)).toBe(true)
    expect(stepDone(p, model, 0)).toBe(true)
  })

  it('el clásico v4 sin previousSteps se queda con los pasos que existen por su número antiguo', () => {
    const input = withLegacy({ previousSteps: undefined }, [1, 3])
    const model = checklistModel(input)
    const p = run(input, {
      dofus_nebuloso_clean_v1: JSON.stringify({ checked: [false, false, true] }),
    })
    expect(stepDone(p, model, 1)).toBe(true)
    expect(stepDone(p, model, 0)).toBe(false)
  })

  it('un paso nuevo (sin pasos antiguos) nunca sale hecho', () => {
    expect(migrateProgress({ 1: true }, {}, [[1], []]).done).toEqual({ 1: true })
  })

  it('el prefijo de la checklist de la página cuenta aunque no esté en la lista', () => {
    expect(pendingLegacy(['ocre:done'], 'ocre', {})).toBe(true)
  })

  it('lo de otra checklist antigua nunca pisa lo de esta, y sin saber sus objetivos no se trae', () => {
    const own = { ...emptyProgress(), quests: { 1609: { o: 1, by: { c: NEBULOSO }, at: 5 } } }
    const p = run(
      data,
      { 'global:questObjective': JSON.stringify({ 1609: 3, 9999: 2, 1531: 10 }) },
      own,
    )
    expect(p.quests[1609]).toEqual({ o: 1, by: { c: NEBULOSO }, at: 5 })
    expect(p.quests[9999]).toBeUndefined()
    expect(p.quests[1531]).toEqual({ o: 'done', by: { c: 'global' }, at: NOW })
  })

  it('la entrada de esta checklist en dofus-checklists:shared se usa si no quedan sus claves', () => {
    const p = run(data, {
      'dofus-checklists:shared': JSON.stringify({
        nebuloso: { name: 'Dofus Nebuloso', quests: [1484], owned: ['15533'] },
      }),
    })
    expect(p.quests[1484]).toEqual({ o: 'done', by: { c: NEBULOSO }, at: NOW })
    expect(p.owned).toEqual({ '15533': NOW })
  })

  it('lo conseguido con claves compuestas (@ o |) no se trae', () => {
    const p = run(data, {
      'nebuloso:owned': JSON.stringify({ '8918@orden': true, [`13423|6812#3`]: true, '15': true }),
    })
    expect(p.owned).toEqual({ '15': NOW })
  })
})
