import { describe, expect, it } from 'vitest'

import { questParents, routePrerequisites } from '@/lib/derive/checklist'

// Lo que la checklist saca de las misiones guardadas, sin escribirlo a mano: las madres y sus
// hijas (PARENT de silvestre-checklist, .build/build_quests_js.py) y lo que cada misión pide
// terminado antes de empezar (PREREQS).

describe('questParents', () => {
  // 1609 tiene los objetivos 9467, 9468, 9469 y 9470; 1610, 1611 y 1612 piden Qa=1609&Qo>9469
  const quests = {
    1608: { startCriterion: 'Qf=1607', objectives: [9401, 9402] },
    1609: { startCriterion: '', objectives: [9467, 9468, 9469, 9470] },
    1610: { startCriterion: 'Qa=1609&Qo>9469', objectives: [1] },
    1611: { startCriterion: 'PL>99&Qa=1609&Qo>9469', objectives: [1] },
    1612: { startCriterion: '(Qa=1609&Qo>9469)', objectives: [1] },
    1613: { startCriterion: 'Qa=1609&Qo=9468', objectives: [1] },
    1614: { startCriterion: 'Qa=1609', objectives: [1] },
    1615: { startCriterion: '(Qa=1609&Qo>9469)|Qf=1609', objectives: [1] },
    1616: { startCriterion: 'Qo=9402', objectives: [1] },
    1617: { startCriterion: 'Qa=1608', objectives: [1] },
  }
  const mandatory = (ids: number[]) => ids.map((id) => [id, 'mandatory'] as const)

  it('Qo>X: la hija empieza en el objetivo siguiente a X; Qo=X, en X; solo Qa, en el 0', () => {
    const steps = [{ quests: mandatory([1609, 1610, 1611, 1612, 1613, 1614]) }]
    expect(questParents(steps, quests)).toEqual({
      1609: [
        [0, [1614]],
        [1, [1613]],
        [3, [1610, 1611, 1612]],
      ],
    })
  })

  it('una condición con «|» no hace hija; sin Qa, la madre es la del objetivo', () => {
    const steps = [{ quests: mandatory([1608, 1609, 1615, 1616]) }]
    expect(questParents(steps, quests)).toEqual({ 1608: [[1, [1616]]] })
  })

  it('solo dos misiones del mismo paso, y una de solo tomarla no es madre', () => {
    expect(
      questParents([{ quests: mandatory([1609]) }, { quests: mandatory([1610]) }], quests),
    ).toEqual({})
    expect(
      questParents(
        [
          {
            quests: [
              [1608, 'take'],
              [1617, 'mandatory'],
            ],
          },
        ],
        quests,
      ),
    ).toEqual({})
  })
})

describe('routePrerequisites', () => {
  it('lo que pide cada misión de la ruta, también a través de otras de fuera, solo de la ruta', () => {
    // 3 pide 2 (fuera de la ruta), que pide 1; 4 pide 3; 5 no pide nada
    const direct = { 2: [1], 3: [2], 4: [3, 3], 5: [] }
    expect(routePrerequisites([1, 3, 4, 5], direct)).toEqual({ 3: [1], 4: [1, 3] })
  })

  it('un bucle en los datos no se cuelga', () => {
    expect(routePrerequisites([1, 2], { 1: [2], 2: [1] })).toEqual({ 1: [2], 2: [1] })
  })
})
