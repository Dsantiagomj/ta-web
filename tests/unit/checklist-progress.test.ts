import { describe, expect, it } from 'vitest'

import {
  checklistModel,
  nextPending,
  progressPct,
  questFinished,
  questState,
  resetChecklist,
  setOwned,
  setPrereq,
  setQuest,
  setStep,
  stepDone,
  stepsDone,
} from '@/lib/checklists/progress/engine'
import {
  emptyProgress,
  parseBackup,
  parseProgress,
  PROGRESS_KEY,
  readProgress,
  writeProgress,
} from '@/lib/checklists/progress/store'
import type { ChecklistIslandData } from '@/lib/checklists/page'

// El motor del progreso: lo marcado en la checklist, guardado en ta-web:progress y compartido
// por todas las checklists. Las misiones van por su ID de DofusDB y los pasos por su stepId.

// a: dos obligatorias y una opcional; b: para en la 20 y repite la 10; c: cierra b y lleva la
// 20; d: sin misiones; e: la 30 es madre de la 31, que empieza en su objetivo 2 y para en el 1.
const data: ChecklistIslandData = {
  checklistId: 7,
  slug: 'checklist-nebuloso',
  version: '2026-11-13T00:00:00.000Z',
  steps: [
    [
      'a',
      1,
      [
        [10, 'mandatory'],
        [11, 'mandatory'],
        [12, 'optional'],
      ],
    ],
    [
      'b',
      2,
      [
        [20, 'mandatory', 1],
        [10, 'mandatory'],
      ],
    ],
    ['c', 3, [[20, 'mandatory']]],
    ['d', 4, []],
    [
      'e',
      5,
      [
        [30, 'mandatory'],
        [31, 'mandatory', 1],
      ],
    ],
  ],
  closes: [['c', ['b']]],
  optionalDoneBy: [],
  prerequisites: [],
  compositeKeys: [],
  legacy: { prefix: 'nebuloso:', guideVersion: 1 },
  weights: [
    [150, [50, 100, 0]],
    [250, [200, 50]],
    [200, [200]],
    [1, []],
    [400, [250, 150]],
  ],
  objectives: { 10: 4, 11: 2, 12: 1, 20: 3, 30: 5, 31: 3 },
  prereqs: { 11: [10] },
  parents: { 30: [[2, [31]]] },
  checklists: { '8': 'Dofus de los Hielos', hielos: 'Dofus de los Hielos' },
  legacyIds: { hielos: 8 },
}
const model = checklistModel(data)
const NOW = 1_700_000_000_000

describe('store', () => {
  const storage = (initial: Record<string, string> = {}) => {
    const map = new Map(Object.entries(initial))
    return {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => void map.set(key, value),
      map,
    }
  }

  it('sin nada guardado, un progreso vacío', () => {
    expect(readProgress(storage())).toEqual(emptyProgress())
  })

  it('guarda y vuelve a leer lo mismo en ta-web:progress', () => {
    const s = storage()
    const progress = setQuest(emptyProgress(), model, 0, 10, true, NOW)
    expect(writeProgress(s, progress)).toBe(true)
    expect(s.map.has(PROGRESS_KEY)).toBe(true)
    expect(readProgress(s)).toEqual(progress)
  })

  it('un JSON roto o de otra forma no rompe nada: progreso vacío', () => {
    expect(parseProgress('{roto')).toEqual(emptyProgress())
    expect(parseProgress('[1,2]')).toEqual(emptyProgress())
    expect(parseProgress(JSON.stringify({ v: 1, quests: 'no', steps: { a: 3 } }))).toEqual(
      emptyProgress(),
    )
  })

  it('se queda con las entradas válidas y descarta las demás', () => {
    const text = JSON.stringify({
      v: 1,
      quests: { 10: { o: 'done', at: 1 }, 11: { o: 2, at: 1, by: { c: 7, s: 'a' } }, x: 3 },
      steps: { a: { done: true, at: 1 }, b: { done: 'sí' } },
      prereqs: { '7:l1': 1, mal: 'x' },
      owned: { '15533#a': 1 },
      migrated: { nebuloso: 1 },
    })
    expect(parseProgress(text)).toEqual({
      v: 1,
      quests: { 10: { o: 'done', at: 1 }, 11: { o: 2, at: 1, by: { c: 7, s: 'a' } } },
      steps: { a: { done: true, at: 1 } },
      prereqs: { '7:l1': 1 },
      owned: { '15533#a': 1 },
      migrated: { nebuloso: 1 },
    })
  })

  it('si el navegador no deja leer ni escribir, sigue sin errores', () => {
    const broken = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    expect(readProgress(broken)).toEqual(emptyProgress())
    expect(writeProgress(broken, emptyProgress())).toBe(false)
  })
})

describe('marcar misiones', () => {
  it('una misión hecha en un paso se deshace ahí y en el otro paso que la lleva dice dónde', () => {
    const p = setQuest(emptyProgress(), model, 0, 10, true, NOW)
    expect(p.quests[10]).toEqual({ o: 'done', by: { c: 7, s: 'a' }, at: NOW })
    expect(questState(p, model, 0, 10)).toEqual({ done: true })
    expect(questState(p, model, 1, 10)).toEqual({ done: true, lock: { step: 1 } })
    const undone = setQuest(p, model, 0, 10, false, NOW)
    expect(undone.quests[10]).toBeUndefined()
  })

  it('una misión hecha en otra checklist sale hecha y dice en cuál', () => {
    const p = { ...emptyProgress(), quests: { 10: { o: 'done' as const, by: { c: 8 }, at: 1 } } }
    expect(questState(p, model, 0, 10)).toEqual({
      done: true,
      lock: { checklist: 'Dofus de los Hielos' },
    })
    const unknown = {
      ...emptyProgress(),
      quests: { 10: { o: 'done' as const, by: { c: 99 }, at: 1 } },
    }
    expect(questState(unknown, model, 0, 10)).toEqual({ done: true, lock: { checklist: null } })
  })

  it('con su paso marcado aquí, una misión hecha también en otra checklist no se bloquea', () => {
    const p = {
      ...setStep(emptyProgress(), model, 0, true, NOW),
      quests: { 10: { o: 'done' as const, by: { c: 8 }, at: 1 } },
    }
    expect(questState(p, model, 0, 10)).toEqual({ done: true })
  })

  it('la que pide terminada otra hecha sale hecha y dice quién la pide', () => {
    const p = setQuest(emptyProgress(), model, 0, 11, true, NOW)
    expect(questState(p, model, 0, 10)).toEqual({ done: true, lock: { need: 11 } })
  })

  it('con todas sus obligatorias hechas, el paso queda hecho solo; la opcional no cuenta', () => {
    let p = setQuest(emptyProgress(), model, 0, 10, true, NOW)
    expect(stepDone(p, model, 0)).toBe(false)
    p = setQuest(p, model, 0, 11, true, NOW)
    expect(stepDone(p, model, 0)).toBe(true)
  })

  it('deshacer una misión de un paso hecho lo desmarca y deja hechas las demás', () => {
    let p = setStep(emptyProgress(), model, 0, true, NOW)
    p = setQuest(p, model, 0, 11, false, NOW)
    expect(stepDone(p, model, 0)).toBe(false)
    expect(questState(p, model, 0, 10)).toEqual({ done: true })
    expect(questState(p, model, 0, 11)).toEqual({ done: false })
  })

  it('una misión bloqueada no cambia', () => {
    const p = setQuest(emptyProgress(), model, 0, 10, true, NOW)
    expect(setQuest(p, model, 1, 10, false, NOW)).toBe(p)
  })
})

describe('marcar pasos', () => {
  it('marcar un paso termina sus obligatorias, no la opcional', () => {
    const p = setStep(emptyProgress(), model, 0, true, NOW)
    expect(stepDone(p, model, 0)).toBe(true)
    expect(p.steps.a).toEqual({ done: true, at: NOW })
    expect(p.quests[10]).toEqual({ o: 'done', by: { c: 7, s: 'a' }, at: NOW })
    expect(p.quests[12]).toBeUndefined()
    expect(questState(p, model, 0, 12)).toEqual({ done: false })
  })

  it('una misión ya hecha en otro paso no cambia de paso al marcar este', () => {
    let p = setQuest(emptyProgress(), model, 1, 10, true, NOW)
    p = setStep(p, model, 0, true, NOW + 1)
    expect(p.quests[10].by).toEqual({ c: 7, s: 'b' })
    expect(questState(p, model, 0, 10)).toEqual({ done: true, lock: { step: 2 } })
  })

  it('desmarcar un paso deja sin hacer lo que terminó él', () => {
    let p = setStep(emptyProgress(), model, 0, true, NOW)
    p = setStep(p, model, 0, false, NOW + 1)
    expect(stepDone(p, model, 0)).toBe(false)
    expect(p.steps.a).toEqual({ done: false, at: NOW + 1 })
    expect(p.quests[10]).toBeUndefined()
    expect(p.quests[11]).toBeUndefined()
  })

  it('marcar el paso de un «detente aquí» deja su misión en el objetivo de la parada', () => {
    const p = setStep(emptyProgress(), model, 1, true, NOW)
    expect(p.quests[20]).toEqual({ o: 1, by: { c: 7, s: 'b' }, at: NOW })
    // En el paso que para, hecha; en el que la cierra, a medias
    expect(questState(p, model, 1, 20)).toEqual({ done: true })
    expect(questState(p, model, 2, 20)).toEqual({ done: false, at: 1 })
  })

  it('la misión que para se termina en el paso que la cierra', () => {
    let p = setStep(emptyProgress(), model, 1, true, NOW)
    p = setStep(p, model, 2, true, NOW + 1)
    expect(p.quests[20]).toEqual({ o: 'done', by: { c: 7, s: 'c' }, at: NOW + 1 })
    expect(questState(p, model, 1, 20)).toEqual({ done: true, lock: { step: 3 } })
  })

  it('marcar el que cierra sin el cerrado termina la misión y marca el cerrado si no le falta nada', () => {
    let p = setQuest(emptyProgress(), model, 1, 10, true, NOW)
    p = setStep(p, model, 2, true, NOW + 1)
    expect(stepDone(p, model, 1)).toBe(true)
  })

  it('desmarcar el que cierra vuelve a dejar la misión en la parada del cerrado', () => {
    let p = setStep(emptyProgress(), model, 1, true, NOW)
    p = setStep(p, model, 2, true, NOW + 1)
    p = setStep(p, model, 2, false, NOW + 2)
    expect(p.quests[20]).toEqual({ o: 1, by: { c: 7, s: 'b' }, at: NOW + 2 })
  })

  it('una madre espera a su hija: marcar el paso la deja en el objetivo donde empieza la hija', () => {
    const p = setStep(emptyProgress(), model, 4, true, NOW)
    expect(p.quests[31]).toEqual({ o: 1, by: { c: 7, s: 'e' }, at: NOW })
    expect(p.quests[30]).toEqual({ o: 2, by: { c: 7, s: 'e' }, at: NOW })
  })

  it('una madre con su hija sin terminar dice que la espera', () => {
    const p = { ...emptyProgress(), quests: { 30: { o: 2, at: 1 } } }
    expect(questState(p, model, 4, 30)).toEqual({ done: false, at: 2, wait: [31] })
    const kidDone = { ...p, quests: { ...p.quests, 31: { o: 'done' as const, at: 1 } } }
    expect(questState(kidDone, model, 4, 30)).toEqual({ done: false, at: 2 })
  })

  it('un paso sin misiones solo se marca a mano', () => {
    const p = setStep(emptyProgress(), model, 3, true, NOW)
    expect(stepDone(p, model, 3)).toBe(true)
    expect(stepsDone(p, model)).toBe(1)
    expect(nextPending(p, model)).toBe(0)
  })
})

describe('el porcentaje', () => {
  const total = 150 + 250 + 200 + 1 + 400

  it('sin nada, 0; con todo marcado, 100', () => {
    expect(progressPct(emptyProgress(), model)).toBe(0)
    let p = emptyProgress()
    for (let i = 0; i < 5; i++) p = setStep(p, model, i, true, NOW)
    expect(progressPct(p, model)).toBe(100)
  })

  it('un paso marcado cuenta su peso entero, y sus misiones en los otros pasos que las llevan', () => {
    // a entero (150) y la 10 en b (50)
    const p = setStep(emptyProgress(), model, 0, true, NOW)
    expect(progressPct(p, model)).toBe(Math.round((200 / total) * 1000) / 10)
  })

  it('las misiones terminadas cuentan antes de marcar su paso, también en los demás pasos', () => {
    // La 10 en a: 50 en a y 50 en b
    const p = setQuest(emptyProgress(), model, 0, 10, true, NOW)
    expect(progressPct(p, model)).toBe(Math.round((100 / total) * 1000) / 10)
  })

  it('lo terminado en otra checklist también cuenta', () => {
    const p = { ...emptyProgress(), quests: { 30: { o: 'done' as const, by: { c: 8 }, at: 1 } } }
    expect(progressPct(p, model)).toBe(Math.round((250 / total) * 1000) / 10)
  })

  it('una misión a medias no cuenta', () => {
    const p = { ...emptyProgress(), quests: { 30: { o: 2, at: 1 } } }
    expect(progressPct(p, model)).toBe(0)
  })

  it('poco progreso no se pierde en el redondeo: 0,1 como mínimo y 99,9 como máximo sin terminar', () => {
    const p = setStep(emptyProgress(), model, 3, true, NOW)
    expect(progressPct(p, model)).toBe(0.1)
    let most = emptyProgress()
    for (let i = 0; i < 5; i++) if (i !== 3) most = setStep(most, model, i, true, NOW)
    expect(progressPct(most, model)).toBe(99.9)
  })
})

describe('prerrequisitos, objetos y reinicio', () => {
  it('los prerrequisitos van con el ID de la checklist delante', () => {
    const p = setPrereq(emptyProgress(), model, 'l1', true, NOW)
    expect(p.prereqs).toEqual({ '7:l1': NOW })
    expect(setPrereq(p, model, 'l1', false, NOW).prereqs).toEqual({})
  })

  it('los objetos se marcan por sus claves', () => {
    const p = setOwned(emptyProgress(), ['15533#a', '15533#b'], true, NOW)
    expect(p.owned).toEqual({ '15533#a': NOW, '15533#b': NOW })
    expect(setOwned(p, ['15533#a'], false, NOW).owned).toEqual({ '15533#b': NOW })
  })

  it('reiniciar borra solo lo de esta checklist y lo elegido', () => {
    let p = setStep(emptyProgress(), model, 0, true, NOW)
    p = setPrereq(p, model, 'l1', true, NOW)
    p = {
      ...p,
      quests: { ...p.quests, 99: { o: 'done', by: { c: 8 }, at: 1 } },
      prereqs: { ...p.prereqs, '8:l1': 1 },
      owned: { '15533#a': 1, '15533#zz': 1, '777': 1 },
    }
    const all = resetChecklist(p, model, { steps: true, prereqs: true, owned: true }, ['777'])
    expect(all.steps).toEqual({})
    expect(all.quests).toEqual({ 99: { o: 'done', by: { c: 8 }, at: 1 } })
    expect(all.prereqs).toEqual({ '8:l1': 1 })
    expect(all.owned).toEqual({ '15533#zz': 1 })
    const onlyPrereqs = resetChecklist(p, model, { steps: false, prereqs: true, owned: false }, [])
    expect(onlyPrereqs.steps).toEqual(p.steps)
    expect(onlyPrereqs.prereqs).toEqual({ '8:l1': 1 })
  })
})

describe('revisión del PR 5: desmarcar', () => {
  it('desmarcar una misión de un paso hecho no termina la misión que para ni la madre que espera', () => {
    let p = setStep(emptyProgress(), model, 1, true, NOW)
    p = setQuest(p, model, 1, 10, false, NOW + 1)
    expect(stepDone(p, model, 1)).toBe(false)
    expect(p.quests[20]?.o).toBe(1)
    let e = setStep(emptyProgress(), model, 4, true, NOW)
    e = setQuest(e, model, 4, 31, false, NOW + 1)
    expect(e.quests[30]?.o).toBe(2)
    expect(e.quests[31]).toBeUndefined()
  })

  it('desmarcar una misión deja sin hacer las del mismo paso que la pedían y marcó el paso', () => {
    let p = setStep(emptyProgress(), model, 0, true, NOW)
    p = setQuest(p, model, 0, 10, false, NOW + 1)
    // Como en silvestre-checklist: la que la pide vuelve a lo suyo
    expect(p.quests[11]).toBeUndefined()
    expect(questState(p, model, 0, 10)).toEqual({ done: false })
    expect(questState(p, model, 0, 11)).toEqual({ done: false })
  })

  it('en un paso marcado, la que piden otras del paso se puede desmarcar, aunque vaya detrás', () => {
    // 11 (que pide la 10) va antes que la 10 en el paso
    const reversed = checklistModel({
      ...data,
      steps: [
        [
          'a',
          1,
          [
            [11, 'mandatory'],
            [10, 'mandatory'],
          ],
        ],
      ],
      weights: [[150, [100, 50]]],
      closes: [],
    })
    let p = setStep(emptyProgress(), reversed, 0, true, NOW)
    expect(questState(p, reversed, 0, 10)).toEqual({ done: true })
    p = setQuest(p, reversed, 0, 10, false, NOW + 1)
    expect(questState(p, reversed, 0, 10)).toEqual({ done: false })
  })
})

describe('revisión del PR 5: el id antiguo de la checklist es la misma checklist', () => {
  const legacyDone = { o: 'done' as const, by: { c: 'nebuloso' }, at: 1 }

  it('una misión apuntada con «nebuloso» sale hecha aquí, sin bloquear', () => {
    const p = { ...emptyProgress(), quests: { 10: legacyDone } }
    expect(questState(p, model, 0, 10)).toEqual({ done: true })
  })

  it('reiniciar también la borra', () => {
    const p = { ...emptyProgress(), quests: { 10: legacyDone } }
    expect(
      resetChecklist(p, model, { steps: true, prereqs: false, owned: false }, []).quests,
    ).toEqual({})
  })
})

describe('revisión del PR 5: paradas y madres al final de la misión', () => {
  // f para en la 40 después de su último objetivo; la 50 espera a la 51 tras el último suyo
  const end = checklistModel({
    ...data,
    steps: [
      [
        'f',
        1,
        [
          [40, 'mandatory', 3],
          [50, 'mandatory'],
          [51, 'mandatory', 0],
        ],
      ],
    ],
    weights: [[300, [100, 100, 100]]],
    closes: [],
    objectives: { 40: 3, 50: 5, 51: 2 },
    prereqs: {},
    parents: { 50: [[5, [51]]] },
  })

  it('ni la parada ni la madre que espera cuentan como terminadas', () => {
    const p = setStep(emptyProgress(), end, 0, true, NOW)
    expect(p.quests[40]?.o).toBe(2)
    expect(p.quests[50]?.o).toBe(4)
    expect(questState(p, end, 0, 50)).toEqual({ done: true })
    expect(questFinished(p, end, 40)).toBe(false)
    expect(questFinished(p, end, 50)).toBe(false)
    expect(questState({ ...p, steps: {} }, end, 0, 50)).toEqual({ done: false, at: 4, wait: [51] })
  })
})

describe('revisión del PR 5: un paso que para y se resuelve en sí mismo', () => {
  // Como el 9 del Nebuloso: para en su misión y su verde cierra el 8 y la termina. Nadie lo
  // cierra, así que la termina él (openOf de silvestre-checklist): la página ya no le manda la
  // parada (open-stops.ts).
  const nine = checklistModel({
    ...data,
    steps: [
      ['ocho', 8, [[60, 'mandatory', 1]]],
      ['nueve', 9, [[61, 'mandatory']]],
    ],
    weights: [
      [100, [100]],
      [100, [100]],
    ],
    closes: [['nueve', ['ocho']]],
    objectives: { 60: 3, 61: 4 },
    prereqs: {},
    parents: {},
  })

  it('marcarlo termina su misión; la del paso que cierra, también', () => {
    let p = setStep(emptyProgress(), nine, 0, true, NOW)
    expect(p.quests[60]?.o).toBe(1)
    p = setStep(p, nine, 1, true, NOW)
    expect(p.quests[61]?.o).toBe('done')
    expect(p.quests[60]?.o).toBe('done')
  })
})

describe('revisión del PR 5: el índice inverso', () => {
  it('el modelo sabe qué misiones piden cada una', () => {
    expect(model.requiredBy.get(10)).toEqual([11])
    expect(model.requiredBy.get(11)).toBeUndefined()
  })
})

describe('revisión del PR 5: restaurar una copia', () => {
  const backup = (progress: unknown, extra: Record<string, unknown> = {}) =>
    JSON.stringify({ app: 'ta-web', kind: 'checklist-progress', v: 1, progress, ...extra })
  const good = setStep(emptyProgress(), model, 0, true, NOW)

  it('una copia buena da su progreso', () => {
    expect(parseBackup(backup(good))).toEqual(good)
  })

  it('una copia sin progreso, con otra versión o con entradas rotas no vale', () => {
    expect(parseBackup(backup(undefined))).toBeNull()
    expect(parseBackup(backup({ ...good, v: 2 }))).toBeNull()
    expect(parseBackup(backup(good, { v: 2 }))).toBeNull()
    expect(parseBackup(backup({ ...good, quests: 'nada' }))).toBeNull()
    expect(parseBackup(backup({ ...good, steps: { a: { done: 'sí', at: 1 } } }))).toBeNull()
    expect(parseBackup(backup(good, { app: 'otra' }))).toBeNull()
    expect(parseBackup('{roto')).toBeNull()
  })
})

describe('revisión del PR 5: lo hecho en otra checklist', () => {
  it('desmarcar aquí, con el paso marcado, no borra lo que se hizo en otra checklist', () => {
    let p = setStep(emptyProgress(), model, 0, true, NOW)
    p = { ...p, quests: { ...p.quests, 11: { o: 'done', by: { c: 8 }, at: 1 } } }
    expect(questState(p, model, 0, 11)).toEqual({ done: true })
    p = setQuest(p, model, 0, 11, false, NOW + 1)
    expect(stepDone(p, model, 0)).toBe(false)
    expect(p.quests[11]).toEqual({ o: 'done', by: { c: 8 }, at: 1 })
    expect(questState(p, model, 0, 11)).toEqual({
      done: true,
      lock: { checklist: 'Dofus de los Hielos' },
    })
  })
})

describe('revisión de #119: las partes de una clave de lo conseguido', () => {
  it('el paso va tras el último «#»: un apartado con «#» no parte la clave', async () => {
    const { ownedParts } = await import('@/lib/checklists/progress/store')
    expect(ownedParts('7045|7047#paso-1')).toEqual(['7045|7047', 'paso-1'])
    expect(ownedParts('17994@orden #2#paso-3')).toEqual(['17994@orden #2', 'paso-3'])
    expect(ownedParts('9687')).toEqual(['9687', undefined])
  })
})

// Lo que trae el Silvestre. a: la 40 para en el objetivo 1 y la termina un paso posterior (c),
// la 41 para en el 0 y la 42 es opcional (la termina d); b cierra a; c lleva la 40; d termina
// la opcional 42 sin llevarla.
describe('el progreso del Silvestre', () => {
  const silvestre = checklistModel({
    ...data,
    steps: [
      [
        'a',
        1,
        [
          [40, 'mandatory', 1, 1],
          [41, 'mandatory', 0],
          [42, 'optional'],
        ],
      ],
      ['b', 2, []],
      ['c', 3, [[40, 'mandatory']]],
      ['d', 4, []],
    ],
    closes: [['b', ['a']]],
    optionalDoneBy: [['d', [42]]],
    weights: [
      [300, [100, 200, 0]],
      [1, []],
      [100, [100]],
      [1, []],
    ],
    objectives: { 40: 3, 41: 2, 42: 1 },
    prereqs: {},
    parents: {},
  })
  const index = (id: string) => silvestre.index.get(id)!

  it('el paso que cierra termina lo que el otro dejó a medias, pero no la que termina uno posterior', () => {
    let p = setStep(emptyProgress(), silvestre, index('a'), true, 1)
    expect(p.quests[40]).toMatchObject({ o: 1 })
    expect(p.quests[41]).toMatchObject({ o: 0 })
    p = setStep(p, silvestre, index('b'), true, 2)
    expect(questFinished(p, silvestre, 41)).toBe(true)
    expect(p.quests[40]).toMatchObject({ o: 1 })
    expect(questFinished(p, silvestre, 40)).toBe(false)
    p = setStep(p, silvestre, index('c'), true, 3)
    expect(questFinished(p, silvestre, 40)).toBe(true)
  })

  it('al cerrar, el paso cerrado queda hecho si la de un paso posterior ya llegó a su parada', () => {
    const reached = { ...emptyProgress(), quests: { 40: { o: 1, at: 1 } } }
    const p = setStep(reached, silvestre, index('b'), true, 2)
    expect(stepDone(p, silvestre, index('a'))).toBe(true)
    // Sin llegar a ella, cerrarlo la lleva a su parada (lo de este paso está hecho) y el cerrado
    // queda hecho: la misión sigue sin terminar, para el paso que la termina.
    const q = setStep(emptyProgress(), silvestre, index('b'), true, 2)
    expect(q.quests[40]).toMatchObject({ o: 1 })
    expect(questFinished(q, silvestre, 40)).toBe(false)
    expect(stepDone(q, silvestre, index('a'))).toBe(true)
    // Desmarcar el que cierra no le quita al cerrado (marcado) su parada.
    const r = setStep(
      setStep(emptyProgress(), silvestre, index('a'), true, 1),
      silvestre,
      index('b'),
      true,
      2,
    )
    expect(setStep(r, silvestre, index('b'), false, 3).quests[40]).toMatchObject({ o: 1 })
  })

  it('la opcional la termina su paso, no el suyo; desmarcarlo la deja como estaba', () => {
    let p = setStep(emptyProgress(), silvestre, index('a'), true, 1)
    expect(questState(p, silvestre, index('a'), 42)).toEqual({ done: false })
    p = setStep(p, silvestre, index('d'), true, 2)
    expect(questState(p, silvestre, index('a'), 42)).toEqual({ done: true, lock: { step: 4 } })
    p = setStep(p, silvestre, index('d'), false, 3)
    expect(questState(p, silvestre, index('a'), 42)).toEqual({ done: false })
  })
})

describe('revisión de #121', () => {
  it('lo de los prerrequisitos se gasta con su prerrequisito; sin prerrequisitos, nunca solo', async () => {
    const { partUsed } = await import('@/lib/checklists/progress/engine')
    const none = checklistModel({ ...data, prerequisites: [] })
    expect(partUsed(emptyProgress(), none, 0)).toBe(false)
    const two = checklistModel({ ...data, prerequisites: ['l1', 'l2'] })
    const one = { ...emptyProgress(), prereqs: { '7:l1': 1 } }
    const both = { ...emptyProgress(), prereqs: { '7:l1': 1, '7:l2': 1 } }
    expect(partUsed(one, two, 0, ['l1'])).toBe(true)
    expect(partUsed(one, two, 0, ['l1', 'l2'])).toBe(false)
    expect(partUsed(both, two, 0, ['l1', 'l2'])).toBe(true)
    // Sin prerrequisito propio, al completarlos todos.
    expect(partUsed(one, two, 0)).toBe(false)
    expect(partUsed(both, two, 0)).toBe(true)
    // Un paso, como siempre.
    expect(partUsed(emptyProgress(), two, 1)).toBe(false)
  })

  it('la madre de una hija que termina un paso posterior tampoco la termina el que cierra', () => {
    const family = checklistModel({
      ...data,
      steps: [
        [
          'a',
          1,
          [
            [30, 'mandatory'],
            [31, 'mandatory', 1, 1],
          ],
        ],
        ['b', 2, []],
      ],
      closes: [['b', ['a']]],
      weights: [
        [100, [50, 50]],
        [1, []],
      ],
      objectives: { 30: 5, 31: 3 },
      prereqs: {},
      parents: { 30: [[2, [31]]] },
    })
    const p = setStep(setStep(emptyProgress(), family, 0, true, 1), family, 1, true, 2)
    expect(questFinished(p, family, 31)).toBe(false)
    expect(questFinished(p, family, 30)).toBe(false)
    expect(p.quests[30]).toMatchObject({ o: 2 })
  })
})
