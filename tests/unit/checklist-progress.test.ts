import { describe, expect, it } from 'vitest'

import {
  checklistModel,
  nextPending,
  progressPct,
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
