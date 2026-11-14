import { describe, expect, it } from 'vitest'

import {
  checklistRoute,
  checklistView,
  objectiveText,
  stopQuestIds,
  type ChecklistData,
} from '@/lib/checklists/page'
import type { Checklist, Media } from '@/payload-types'

// Lo que pinta la página de una checklist sale de la checklist guardada y de lo que enlaza:
// sus misiones con su guía publicada, sus logros con su página y la guía de su Dofus.

const media = (id: number, name: string, alt = ''): Media =>
  ({
    id,
    alt,
    url: `/media/${name}.png`,
    filename: `${name}.png`,
    width: 128,
    height: 128,
    sizes: {},
  }) as unknown as Media

const quest = (id: number, name: string, levelMin: number | null = 100) => ({
  id,
  dofusId: id + 1000,
  name,
  levelMin,
})

const item = (id: number, name: string) => ({
  id,
  dofusId: id + 5000,
  name,
  image: media(id, `item-${id}`),
})

type Step = NonNullable<Checklist['steps']>[number]
// Las relaciones van pobladas con lo que lee la página, no con el documento entero.
const step = (stepId: string, overrides: Record<string, unknown> = {}): Step =>
  ({
    stepId,
    legacyNumber: null,
    segments: [{ kind: 'plain', text: `Texto del paso ${stepId}.` }],
    achievements: [],
    quests: [],
    needs: [],
    bosses: [],
    figure: {},
    ...overrides,
  }) as unknown as Step

const data = (
  steps: Step[],
  overrides: Partial<Checklist> = {},
  linked: Partial<Omit<ChecklistData, 'checklist'>> = {},
): ChecklistData => ({
  torreLevels: {},
  questGraph: {},
  checklists: [],
  checklist: {
    id: 7,
    name: 'Dofus Nebuloso',
    slug: 'checklist-nebuloso',
    state: 'published',
    order: 3,
    description: 'Anutropía, Sramvil y Xelorium.',
    dofusGuide: {
      id: 21,
      name: 'Dofus Nebuloso',
      slug: 'dofus-nebuloso',
      state: 'published',
      color: '#8f7ae0',
      dofus: { id: 1, name: 'Dofus Nebuloso', image: media(1, 'egg') },
    },
    prerequisites: {
      intro: 'Nivel recomendado: 180.',
      groups: [
        { title: 'Logros previos', rows: [{ key: 'l1', text: 'Más de 3 000 puntos de logro' }] },
        { title: 'Oficios', rows: [{ key: 'o1', text: 'Cualquier oficio nivel 200' }] },
      ],
    },
    steps,
    legacy: {
      prefix: 'nebuloso:',
      classicKeys: { v4: 'dofus_nebuloso_clean_v1' },
      guideVersion: 1,
    },
    updatedAt: '2026-11-13T10:00:00.000Z',
    createdAt: '',
    ...overrides,
  } as unknown as Checklist,
  questGuides: {},
  achievementPages: {},
  stopQuests: {},
  names: { npc: {}, item: {}, monster: {} },
  siteUrl: 'https://torrentearcano.com',
  ...linked,
})

describe('checklistView: la cabecera', () => {
  it('titula con el nombre, pinta el huevo y el color de la guía del Dofus y enlaza la guía en las migas', () => {
    const view = checklistView(data([step('a')]))

    expect(view.title).toBe('Checklist del Dofus Nebuloso')
    expect(view.description).toBe('Anutropía, Sramvil y Xelorium.')
    expect(view.egg?.src).toBe('/media/egg.png')
    expect(view.color).toBe('#8f7ae0')
    expect(view.breadcrumb.parents).toEqual([
      { name: 'Guías de Dofus', href: '/guias-dofus' },
      { name: 'Dofus Nebuloso', href: '/dofus-nebuloso' },
    ])
  })

  it('sin guía del Dofus publicada, las migas solo llevan el índice y no hay huevo ni color', () => {
    const view = checklistView(data([step('a')], { dofusGuide: null }))

    expect(view.egg).toBeUndefined()
    expect(view.color).toBeUndefined()
    expect(view.breadcrumb.parents).toEqual([{ name: 'Guías de Dofus', href: '/guias-dofus' }])
  })
})

describe('checklistView: el texto de cada paso', () => {
  it('copia los tramos tal cual, en su orden, con su clase', () => {
    const steps = [
      step('a'),
      step('b', {
        segments: [
          { kind: 'plain', text: 'Logro "El rey y yo", misión 6.' },
          {
            kind: 'stop',
            text: 'Avanza hasta la mazmorra del Rey Nidas.',
            quest: 5,
            stopObjective: 1,
          },
          { kind: 'resolve', text: 'Pasa la mazmorra y completa las etapas 8 y 9.', closes: ['a'] },
        ],
      }),
    ]
    const [, second] = checklistView(data(steps)).steps

    expect(second.segments.map((segment) => [segment.kind, segment.parts.join('')])).toEqual([
      ['plain', 'Logro "El rey y yo", misión 6.'],
      ['stop', 'Avanza hasta la mazmorra del Rey Nidas.'],
      ['resolve', 'Pasa la mazmorra y completa las etapas 8 y 9.'],
    ])
    expect(second.hasStop).toBe(true)
    expect(second.hasResolve).toBe(true)
  })

  it('enlaza el nombre del logro citado en el texto con su página publicada, sin cambiar una letra', () => {
    const steps = [
      step('a', {
        segments: [{ kind: 'plain', text: 'Logro "De un mundo a otro". Completo.' }],
        achievements: [
          {
            achievement: { id: 211, name: 'De un mundo a otro', icon: media(9, 'logro') },
            mode: 'all',
          },
        ],
      }),
    ]
    const view = checklistView(data(steps, {}, { achievementPages: { 211: 'de-un-mundo-a-otro' } }))
    const [segment] = view.steps[0].segments

    expect(segment.parts).toEqual([
      'Logro "',
      { text: 'De un mundo a otro', href: '/de-un-mundo-a-otro' },
      '". Completo.',
    ])
    expect(view.steps[0].achievements).toEqual([
      expect.objectContaining({
        name: 'De un mundo a otro',
        href: '/de-un-mundo-a-otro',
        some: false,
      }),
    ])
  })

  it('enlaza cada logro citado en el orden del texto, aunque el que va antes sea el segundo de la lista', () => {
    const steps = [
      step('a', {
        segments: [{ kind: 'plain', text: 'Logro "B" y luego Logro "A".' }],
        achievements: [
          { achievement: { id: 1, name: 'A' }, mode: 'all' },
          { achievement: { id: 2, name: 'B' }, mode: 'all' },
        ],
      }),
    ]
    const view = checklistView(
      data(steps, {}, { achievementPages: { 1: 'logro-a', 2: 'logro-b' } }),
    )

    expect(view.steps[0].segments[0].parts).toEqual([
      'Logro "',
      { text: 'B', href: '/logro-b' },
      '" y luego Logro "',
      { text: 'A', href: '/logro-a' },
      '".',
    ])
  })

  it('los avisos de la guía (nota, consejo, «hay que hacerlo», «incluye») van en su tramo', () => {
    const [view] = checklistView(
      data([
        step('a', {
          segments: ['plain', 'note', 'tip', 'must', 'includes'].map((kind) => ({
            kind,
            text: `Tramo ${kind}.`,
          })),
        }),
      ]),
    ).steps
    expect(view.segments.map((segment) => [segment.kind, segment.parts])).toEqual([
      ['plain', ['Tramo plain.']],
      ['note', ['Tramo note.']],
      ['tip', ['Tramo tip.']],
      ['must', ['Tramo must.']],
      ['includes', ['Tramo includes.']],
    ])
  })

  it('un paso sin verde también cierra pasos, y dice qué pasos avanza y dónde se retoma', () => {
    const view = checklistView(
      data([step('a'), step('b'), step('c', { closes: ['b'], updates: ['a'] })]),
    )
    expect(view.steps.map((s) => [s.n, s.closes, s.closedBy, s.updates, s.resumedIn])).toEqual([
      [1, [], null, [], [3]],
      [2, [], 3, [], []],
      [3, [2], null, [1], []],
    ])
  })

  it('numera los pasos en el orden de Torre y dice qué pasos cierra cada uno y dónde se cierra', () => {
    const steps = [
      step('a'),
      step('b', { segments: [{ kind: 'stop', text: 'Para aquí.', quest: 5, stopObjective: 0 }] }),
      step('c', { segments: [{ kind: 'resolve', text: 'Se termina la etapa 2.', closes: ['b'] }] }),
    ]
    const view = checklistView(data(steps))

    expect(view.steps.map((s) => [s.n, s.closes, s.closedBy])).toEqual([
      [1, [], null],
      [2, [], 3],
      [3, [2], null],
    ])
  })

  it('lleva la zona del paso si Torre la puso', () => {
    const view = checklistView(data([step('a', { zone: 'Anutropía' }), step('b')]))

    expect(view.steps[0].zone).toBe('Anutropía')
    expect(view.steps[1]).not.toHaveProperty('zone')
  })

  it('nombra cada paso por el logro que cita o, si no cita ninguno, por su primera frase', () => {
    const steps = [
      step('a', {
        segments: [
          { kind: 'plain', text: 'Empezamos Anutropía. Logro "Favores encadenados". Completo.' },
        ],
      }),
      step('b', {
        segments: [
          { kind: 'plain', text: 'Misión: Hablar con el dios Anutrof. Está en su templo.' },
        ],
      }),
    ]
    const view = checklistView(data(steps))

    expect(view.steps.map((s) => s.label)).toEqual([
      'Favores encadenados',
      'Misión: Hablar con el dios Anutrof',
    ])
  })
})

describe('checklistView: las misiones', () => {
  it('enlaza la guía publicada de cada misión y lleva su nivel, su tipo y su nota', () => {
    const steps = [
      step('a', {
        quests: [
          { quest: quest(1, 'El barbero de Anutropía', 200), kind: 'mandatory' },
          { quest: quest(2, 'Una opcional', null), kind: 'optional', note: 'Si te apetece' },
        ],
      }),
    ]
    const view = checklistView(data(steps, {}, { questGuides: { 1: 'el-barbero-de-anutropia' } }))

    expect(view.steps[0].quests).toEqual([
      expect.objectContaining({
        dofusId: 1001,
        name: 'El barbero de Anutropía',
        href: '/el-barbero-de-anutropia',
        level: 200,
        kind: 'mandatory',
      }),
      expect.objectContaining({ dofusId: 1002, kind: 'optional', note: 'Si te apetece' }),
    ])
    expect(view.steps[0].quests[1]).not.toHaveProperty('href')
    expect(view.steps[0].quests[1]).not.toHaveProperty('level')
  })

  it('en la misión donde para, enseña sus objetivos con la línea roja de Torre en el objetivo de parada', () => {
    const steps = [
      step('a', {
        segments: [
          { kind: 'plain', text: 'Logro "El alegre retirado".' },
          {
            kind: 'stop',
            text: 'Avanza hasta que te pida entregar muestras.',
            quest: 5,
            stopObjective: 1,
          },
        ],
        quests: [{ quest: quest(5, 'Sangre fría'), kind: 'mandatory' }],
      }),
    ]
    const stopQuests = {
      5: {
        stages: [
          {
            dofusId: 1,
            objectives: [{ dofusId: 11, kind: 'npc' as const, text: 'Ve a ver a {npc,264}' }],
          },
          {
            dofusId: 2,
            objectives: [
              { dofusId: 12, kind: 'bring' as const, text: 'Entrégale a Wello: 3 x Muestra' },
              { dofusId: 13, kind: 'fight' as const, text: 'Vence a 1 x Rey Nidas' },
            ],
          },
        ],
      },
    }
    const names = { npc: { 264: 'Wello' }, item: {}, monster: {} }
    const [row] = checklistView(data(steps, {}, { stopQuests, names })).steps[0].quests

    expect(row.route).toEqual({
      objectives: [
        { kind: 'npc', text: 'Ve a ver a Wello' },
        { kind: 'bring', text: 'Entrégale a Wello: 3 x Muestra' },
        { kind: 'fight', text: 'Vence a 1 x Rey Nidas' },
      ],
      lines: [{ at: 1, kind: 'stop', text: 'Avanza hasta que te pida entregar muestras.' }],
    })
  })

  it('si el paso también resuelve, la línea es la verde con su texto', () => {
    const steps = [
      step('a', {
        segments: [
          { kind: 'stop', text: 'Avanza hasta la mazmorra.', quest: 5, stopObjective: 0 },
          { kind: 'resolve', text: 'Pasa la mazmorra.', closes: [] },
        ],
        quests: [{ quest: quest(5, 'Sangre fría'), kind: 'mandatory' }],
      }),
    ]
    const stopQuests = {
      5: {
        stages: [
          { dofusId: 1, objectives: [{ dofusId: 11, kind: 'free' as const, text: 'Algo' }] },
        ],
      },
    }
    const [row] = checklistView(data(steps, {}, { stopQuests })).steps[0].quests

    expect(row.route?.lines).toEqual([{ at: 0, kind: 'resolve', text: 'Pasa la mazmorra.' }])
  })

  /** Dos misiones con tres objetivos cada una, para las paradas del Silvestre. */
  const twoQuests = {
    5: { stages: [{ dofusId: 1, objectives: ['a', 'b', 'c'].map(objective) }] },
    6: { stages: [{ dofusId: 2, objectives: ['d', 'e', 'f'].map(objective) }] },
  }
  function objective(text: string, index: number) {
    return { dofusId: 100 + index, kind: 'free' as const, text }
  }
  const questsOf = (steps: Step[], index = 0) =>
    checklistView(data(steps, {}, { stopQuests: twoQuests })).steps[index].quests
  const rows = [
    { quest: quest(5, 'Pesca'), kind: 'mandatory' },
    { quest: quest(6, 'Bendición'), kind: 'mandatory' },
  ]

  it('un rojo con «más paradas» pinta una línea en cada misión, en su objetivo', () => {
    const steps = [
      step('a', {
        segments: [
          {
            kind: 'stop',
            text: '(Hasta tener que luchar)',
            quest: 5,
            stopObjective: 1,
            more: [
              { quest: 6, stopObjective: 2 },
              { quest: 5, stopObjective: 2 },
            ],
          },
        ],
        quests: rows,
      }),
    ]
    const [pesca, bendicion] = questsOf(steps)
    expect(pesca.route?.lines).toEqual([
      { at: 1, kind: 'stop', text: '(Hasta tener que luchar)' },
      { at: 2, kind: 'stop', text: '(Hasta tener que luchar)' },
    ])
    expect(bendicion.route?.lines).toEqual([
      { at: 2, kind: 'stop', text: '(Hasta tener que luchar)' },
    ])
  })

  it('con verde, cada parada lleva su parte; la que termina un paso posterior sigue en rojo', () => {
    const steps = [
      step('a', {
        segments: [
          {
            kind: 'stop',
            text: 'Hasta luchar.',
            quest: 5,
            stopObjective: 0,
            resumeLine: 'Se hacen las peleas.',
            more: [{ quest: 6, stopObjective: 1, later: true, line: 'Hasta la bendición.' }],
          },
          { kind: 'resolve', text: 'Se pasa la mazmorra.', closes: [] },
        ],
        quests: rows,
      }),
    ]
    const [pesca, bendicion] = questsOf(steps)
    expect(pesca.route?.lines).toEqual([{ at: 0, kind: 'resolve', text: 'Se hacen las peleas.' }])
    expect(bendicion.route?.lines).toEqual([{ at: 1, kind: 'stop', text: 'Hasta la bendición.' }])
  })

  it('el verde que deja una parada: el rojo de antes se retoma y el de después para', () => {
    const steps = [
      step('a', {
        segments: [
          { kind: 'stop', text: 'Hasta los monstruos.', quest: 5, stopObjective: 0 },
          { kind: 'resolve', text: 'Se matan los monstruos', closes: [] },
          { kind: 'stop', text: 'hasta tener que pasar Kodámade.', quest: 6, stopObjective: 2 },
        ],
        quests: rows,
      }),
      step('b', {
        segments: [{ kind: 'resolve', text: 'Se pasa Kodámade.', closes: ['a'] }],
      }),
    ]
    const [pesca, bendicion] = questsOf(steps)
    expect(pesca.route?.lines).toEqual([{ at: 0, kind: 'resolve', text: 'Se matan los monstruos' }])
    expect(bendicion.route?.lines).toEqual([
      { at: 2, kind: 'stop', text: 'hasta tener que pasar Kodámade.' },
    ])
  })

  it('con verde pero cerrado por otro paso, el rojo vuelve a ser dónde parar', () => {
    const steps = [
      step('a', {
        segments: [
          { kind: 'stop', text: 'Hasta la run de sueños.', quest: 5, stopObjective: 1 },
          { kind: 'resolve', text: 'Se hace Fraktal.', closes: [] },
        ],
        quests: rows,
      }),
      step('b', { closes: ['a'] }),
    ]
    expect(questsOf(steps)[0].route?.lines).toEqual([
      { at: 1, kind: 'stop', text: 'Hasta la run de sueños.' },
    ])
  })
})

describe('stopQuestIds', () => {
  it('las misiones donde para algún paso, también las de «más paradas», pobladas o no', () => {
    const steps = [
      step('a', {
        segments: [
          { kind: 'stop', text: 'Para.', quest: { id: 5 }, more: [{ quest: 6 }, { quest: null }] },
          { kind: 'stop', text: 'Solo avisa.', quest: null },
          { kind: 'plain', text: 'Nada.' },
        ],
      }),
    ]
    expect(stopQuestIds(steps)).toEqual([5, 6])
  })
})

describe('objectiveText', () => {
  const names = {
    npc: { 2351: 'Wello' },
    item: { 15375: 'Cristal azul' },
    monster: { 3648: 'Rey Nidas' },
  }

  it('quita las marcas de DofusDB y deja el nombre', () => {
    expect(objectiveText('Ve a {map,123::Astrub} y habla con {npc,4::Otomai}')).toBe(
      'Ve a Astrub y habla con Otomai',
    )
    expect(objectiveText(null)).toBe('')
  })

  it('pone el nombre del PNJ, el objeto o el monstruo que DofusDB deja como ID', () => {
    expect(objectiveText('Entrégale a {npc,2351}: 1 x {item,15375}', names)).toBe(
      'Entrégale a Wello: 1 x Cristal azul',
    )
    expect(objectiveText('Vence a 1 x {monster,3648} en un solo combate', names)).toBe(
      'Vence a 1 x Rey Nidas en un solo combate',
    )
  })

  it('si no tiene el nombre, dice qué es en vez de enseñar el ID', () => {
    expect(objectiveText('Ve a ver a {npc,2434}', names)).toBe('Ve a ver a un PNJ')
  })
})

describe('checklistView: Necesitarás', () => {
  const needsStep = step('a', {
    needs: [
      { item: item(10, 'Alma de Kwak'), quantity: 1, category: 'souls', countsInTotal: true },
      { item: null, label: 'Kama', quantity: 1, category: 'resources', countsInTotal: true },
      {
        item: item(11, 'Cuerno'),
        quantity: 2,
        category: 'resources',
        countsInTotal: true,
        note: 'o 30 000 kamas',
      },
      {
        item: null,
        label: 'Captura de almas',
        quantity: 1,
        category: 'resources',
        countsInTotal: false,
        note: 'Hechizo: requisito, no consumible',
      },
    ],
  })

  it('agrupa las filas de cada paso por grupo, en el orden de los grupos y luego en el de Torre', () => {
    const [view] = checklistView(data([needsStep])).steps

    expect(view.needs.map((group) => [group.title, group.rows.map((row) => row.name)])).toEqual([
      ['Recursos', ['Kama', 'Cuerno', 'Captura de almas']],
      ['Almas', ['Alma de Kwak']],
    ])
  })

  const silvestreStep = (stepId: string, quantity: number) =>
    step(stepId, {
      needs: [
        {
          item: item(12, 'Pandaburg'),
          quantity,
          alternatives: [{ item: item(13, 'Pandapils'), quantity }],
          category: 'consumables',
          countsInTotal: true,
        },
        {
          item: item(14, 'Sacrificio'),
          quantity: 5,
          group: 'Misión opcional',
          category: 'resources',
          countsInTotal: true,
        },
        {
          item: item(15, 'Piedra de alma'),
          quantity,
          reusable: true,
          category: 'souls',
          countsInTotal: true,
        },
      ],
    })

  it('las alternativas, el apartado y lo que se conserva llevan la clave de la checklist antigua', () => {
    const [view] = checklistView(data([silvestreStep('a', 1)])).steps
    expect(view.needs.map((group) => [group.title, group.rows.map((row) => row.key)])).toEqual([
      ['Recursos · Misión opcional', ['5014@mision opcional']],
      ['Consumibles', ['5012|5013']],
      ['Almas', ['5015']],
    ])
    expect(view.needs[1].rows[0]).toMatchObject({
      name: 'Pandaburg',
      quantity: 1,
      alternatives: [{ name: 'Pandapils', quantity: 1 }],
    })
  })

  it('en los totales, lo que se conserva cuenta la mayor cantidad y las alternativas se suman', () => {
    const view = checklistView(data([silvestreStep('a', 1), silvestreStep('b', 2)]))
    const rows = view.totals.flatMap((group) => group.rows)
    expect(rows.find((row) => row.key === '5015')).toMatchObject({ quantity: 2, steps: [1, 2] })
    expect(rows.find((row) => row.key === '5012|5013')).toMatchObject({
      quantity: 3,
      alternatives: [{ quantity: 3 }],
    })
    expect(rows.find((row) => row.key === '5014@mision opcional')).toMatchObject({ quantity: 10 })
  })

  it('una fila con texto y sin objeto sale como texto, sin copiar ni icono', () => {
    const [view] = checklistView(data([needsStep])).steps
    const rows = view.needs[0].rows

    expect(rows[0]).toEqual({ kind: 'label', key: 'x:kama', name: 'Kama', quantity: 1 })
    expect(rows[2]).toEqual({
      kind: 'label',
      key: 'x:captura de almas',
      name: 'Captura de almas',
      quantity: 1,
      note: 'Hechizo: requisito, no consumible',
    })
    expect(rows[1]).toEqual(
      expect.objectContaining({
        kind: 'item',
        // Lo conseguido se guarda por el ID de DofusDB del objeto
        key: '5011',
        name: 'Cuerno',
        quantity: 2,
        note: 'o 30 000 kamas',
      }),
    )
  })

  it('un mismo objeto o texto es una sola fila en los totales, con la clave de lo conseguido', () => {
    const steps = [
      step('a', {
        needs: [
          { item: item(11, 'Cuerno'), quantity: 1, category: 'resources', countsInTotal: true },
          { item: null, label: 'Kama', quantity: 1, category: 'resources', countsInTotal: true },
        ],
      }),
      step('b', {
        needs: [
          { item: item(11, 'Cuerno'), quantity: 2, category: 'equipment', countsInTotal: true },
          { item: null, label: 'kama', quantity: 3, category: 'resources', countsInTotal: true },
        ],
      }),
    ]
    const rows = checklistView(data(steps)).totals.flatMap((group) => group.rows)
    expect(rows.map((row) => [row.key, row.quantity, row.steps])).toEqual([
      ['5011', 3, [1, 2]],
      ['x:kama', 4, [1, 2]],
    ])
  })

  it('los totales suman cada objeto en todos los pasos y dejan fuera lo que no cuenta', () => {
    const steps = [
      needsStep,
      step('b', {
        needs: [
          { item: item(11, 'Cuerno'), quantity: 3, category: 'resources', countsInTotal: true },
          { item: null, label: 'Kama', quantity: 5, category: 'resources', countsInTotal: true },
        ],
      }),
    ]
    const view = checklistView(data(steps))

    expect(
      view.totals.map((group) => [
        group.title,
        group.rows.map((row) => [row.name, row.quantity, row.steps]),
      ]),
    ).toEqual([
      [
        'Recursos',
        [
          ['Kama', 6, [1, 2]],
          ['Cuerno', 5, [1, 2]],
        ],
      ],
      ['Almas', [['Alma de Kwak', 1, [1]]]],
    ])
    expect(view.totalsCount).toBe(3)
  })

  it('«Tus próximos pasos» de Objetos, sin progreso: los cinco primeros pasos que piden algo', () => {
    const asks = (id: string) =>
      step(id, {
        needs: [
          { item: item(11, 'Cuerno'), quantity: 1, category: 'resources', countsInTotal: true },
        ],
      })
    const steps = [step('a'), ...['b', 'c', 'd', 'e', 'f', 'g'].map(asks)]
    expect(checklistView(data(steps)).soonSteps).toEqual([2, 3, 4, 5, 6])
  })
})

describe('checklistView: madres e hijas', () => {
  it('en la ruta de la madre donde para el paso, una línea dice qué hijas se hacen y dónde', () => {
    const stages = [
      {
        dofusId: 1,
        objectives: ['Uno', 'Dos', 'Tres'].map((text, index) => ({
          dofusId: index + 1,
          kind: 'npc' as const,
          text,
        })),
      },
    ]
    const steps = [
      step('a', {
        segments: [{ kind: 'stop', text: 'Para.', quest: 5, stopObjective: 2 }],
        quests: [
          { quest: quest(5, 'Madre'), kind: 'mandatory' },
          { quest: quest(6, 'Hija'), kind: 'mandatory' },
          { quest: quest(7, 'Otra hija'), kind: 'mandatory' },
        ],
      }),
    ]
    const node = (dofusId: number, startCriterion: string | null, objectives: number[]) => ({
      dofusId,
      levelMin: 100,
      startCriterion,
      objectives,
      prerequisites: [],
    })
    const questGraph = {
      5: node(1005, null, [51, 52, 53]),
      6: node(1006, 'Qa=1005&Qo>51', [1]),
      7: node(1007, 'Qa=1005&Qo>51', [1]),
    }
    const [mother] = checklistView(data(steps, {}, { questGraph, stopQuests: { 5: { stages } } }))
      .steps[0].quests
    expect(mother.route?.kids).toEqual([{ at: 1, names: ['Hija', 'Otra hija'] }])
  })
})

describe('checklistView: el resto del paso', () => {
  it('lleva el icono, el banner, la figura (PNJ o imagen), los jefes y la nota', () => {
    const note = {
      root: { type: 'root', children: [], direction: null, format: '', indent: 0, version: 1 },
    }
    const steps = [
      step('a', {
        icon: media(30, 'icono'),
        banner: media(31, 'mapa'),
        figure: {
          npc: { id: 4, name: 'Wello', renderRight: media(32, 'wello') },
          role: 'Inicia el paso',
        },
        bosses: [{ id: 6, name: 'Rey Nidas', image: media(33, 'nidas') }],
        note,
      }),
      step('b', { figure: { image: media(34, 'anutrof', 'Dios Anutrof'), role: 'Se habla con' } }),
    ]
    const [first, second] = checklistView(data(steps)).steps

    expect(first.icon?.src).toBe('/media/icono.png')
    expect(first.banner?.src).toBe('/media/mapa.png')
    expect(first.figure).toEqual(
      expect.objectContaining({
        name: 'Wello',
        role: 'Inicia el paso',
        image: expect.objectContaining({ src: '/media/wello.png' }),
      }),
    )
    expect(first.bosses).toEqual([expect.objectContaining({ name: 'Rey Nidas' })])
    expect(first.note).toBe(note)
    expect(second.figure).toEqual(
      expect.objectContaining({ name: 'Dios Anutrof', role: 'Se habla con' }),
    )
  })

  it('lleva los avisos de los prerrequisitos y lo que piden, con el prerrequisito que lo gasta', () => {
    const view = checklistView(
      data([step('a')], {
        prerequisites: {
          intro: null,
          groups: [{ title: 'Oficios', rows: [{ key: 'l11', text: 'Ganadería' }] }],
          notes: [{ title: 'Empieza el Dofus Ocre cuanto antes', text: 'Es larga.' }],
          needs: [
            { item: item(10, 'Trigo'), quantity: 50, category: 'resources', prerequisite: 'l11' },
            {
              item: item(11, 'Dragopavo'),
              quantity: 1,
              category: 'equipment',
              group: 'Opcional · Altos vuelos',
            },
          ],
        },
      } as Partial<Checklist>),
    )
    expect(view.prerequisites.notes).toEqual([
      { title: 'Empieza el Dofus Ocre cuanto antes', text: 'Es larga.' },
    ])
    expect(
      view.prerequisites.needs.map((group) => [
        group.title,
        group.rows.map((row) => [row.key, row.quantity, row.prerequisite ?? null]),
      ]),
    ).toEqual([
      ['Recursos', [['5010', 50, 'l11']]],
      ['Equipables · Opcional · Altos vuelos', [['5011@opcional altos vuelos', 1, null]]],
    ])
  })

  it('un logro «hasta la misión N» dice hasta cuál', () => {
    const [view] = checklistView(
      data([
        step('a', {
          achievements: [
            { achievement: { id: 3, name: 'Las leguas muertas' }, mode: 'upto', on: [1, 2] },
          ],
        }),
      ]),
    ).steps
    expect(view.achievements).toEqual([{ name: 'Las leguas muertas', some: false, upto: 2 }])
  })

  it('lleva los prerrequisitos en sus grupos y cuántos son', () => {
    const view = checklistView(data([step('a')]))

    expect(view.prerequisites.intro).toBe('Nivel recomendado: 180.')
    expect(view.prerequisites.groups.map((group) => group.title)).toEqual([
      'Logros previos',
      'Oficios',
    ])
    expect(view.prerequisites.count).toBe(2)
  })
})

describe('checklistView: lo que recibe la isla', () => {
  const graph = {
    5: {
      dofusId: 1005,
      levelMin: 100,
      startCriterion: null,
      objectives: [1, 2, 3, 4],
      prerequisites: [],
    },
    6: {
      dofusId: 1006,
      levelMin: 100,
      startCriterion: 'Qa=1005',
      objectives: [9],
      prerequisites: [1005],
    },
  }
  const steps = () => [
    step('a', {
      legacyNumber: 1,
      segments: [{ kind: 'stop', text: 'Para.', quest: 5, stopObjective: 2 }],
      quests: [
        { quest: quest(5, 'Sangre fría'), kind: 'mandatory' },
        { quest: quest(6, 'Otra'), kind: 'take' },
      ],
    }),
    step('b', { legacyNumber: 2, segments: [{ kind: 'resolve', text: 'Fin.', closes: ['a'] }] }),
    step('c', { legacyNumber: 3, segments: [{ kind: 'resolve', text: 'Se resuelve aquí.' }] }),
  ]

  it('solo la estructura y lo que necesita el progreso, nunca los textos', () => {
    const { island } = checklistView(
      data(
        steps(),
        {},
        {
          questGraph: graph,
          torreLevels: { 5: 80 },
          checklists: [
            { id: 7, name: 'Dofus Nebuloso', legacyId: 'nebuloso' },
            { id: 8, name: 'Dofus de los Hielos', legacyId: null },
          ],
        },
      ),
    )

    expect(island).toEqual({
      checklistId: 7,
      slug: 'checklist-nebuloso',
      version: '2026-11-13T10:00:00.000Z',
      steps: [
        [
          'a',
          1,
          [
            [1005, 'mandatory', 2],
            [1006, 'take'],
          ],
        ],
        ['b', 2, []],
        ['c', 3, []],
      ],
      // También el que se resuelve sin cerrar otro: no deja nada a medias
      closes: [
        ['b', ['a']],
        ['c', []],
      ],
      legacy: {
        prefix: 'nebuloso:',
        classicKeys: { v4: 'dofus_nebuloso_clean_v1' },
        guideVersion: 1,
      },
      // La 1005 vale su nivel de Torre (80) por la raíz de sus 4 objetivos; la de solo
      // tomarla, 0; los pasos sin misiones, 1
      weights: [
        [160, [160, 0]],
        [1, []],
        [1, []],
      ],
      objectives: { 1005: 4, 1006: 1 },
      prereqs: { 1006: [1005] },
      parents: { 1005: [[0, [1006]]] },
      checklists: { '7': 'Dofus Nebuloso', nebuloso: 'Dofus Nebuloso', '8': 'Dofus de los Hielos' },
      legacyIds: { nebuloso: 7 },
    })
    expect(JSON.stringify(island)).not.toContain('Sangre fría')
  })

  it('sin nivel de Torre, el de DofusDB', () => {
    const { island } = checklistView(data(steps(), {}, { questGraph: graph }))
    expect(island.weights[0]).toEqual([200, [200, 0]])
  })
})

describe('checklistRoute', () => {
  const doc = (state: 'published' | 'preparing', legacyHref?: string | null) =>
    ({ state, legacyHref }) as Pick<Checklist, 'state' | 'legacyHref'>

  it('una checklist Publicada tiene página', () => {
    expect(checklistRoute(doc('published'), false, 'https://torrentearcano.com')).toEqual({
      kind: 'page',
    })
  })

  it('una En preparación lleva al visitante a la checklist de Squarespace, como el menú', () => {
    expect(
      checklistRoute(
        doc('preparing', 'https://www.torrentearcano.com/checklist-silvestre'),
        false,
        'https://ta-web-dev.up.railway.app',
      ),
    ).toEqual({ kind: 'legacy', href: 'https://www.torrentearcano.com/checklist-silvestre' })
  })

  it('sin enlace a Squarespace, o si el enlace es esta misma web, no tiene página', () => {
    expect(checklistRoute(doc('preparing'), false, 'https://torrentearcano.com')).toEqual({
      kind: 'none',
    })
    expect(
      checklistRoute(
        doc('preparing', 'https://www.torrentearcano.com/checklist-silvestre'),
        false,
        'https://www.torrentearcano.com',
      ),
    ).toEqual({ kind: 'none' })
  })

  it('en la vista previa del panel se ve la página aunque esté En preparación', () => {
    expect(
      checklistRoute(doc('preparing', 'https://www.torrentearcano.com/x'), true, 'https://a.b'),
    ).toEqual({ kind: 'page' })
  })
})

describe('revisión de #115: lo nuevo del esquema en la página', () => {
  const objectives = {
    5: {
      stages: [
        { dofusId: 1, objectives: [{ dofusId: 11, kind: 'free' as const, text: 'Uno' }] },
        { dofusId: 2, objectives: [{ dofusId: 12, kind: 'free' as const, text: 'Dos' }] },
      ],
    },
  }

  it('un primer «detente aquí» sin misión no tapa el que sí la lleva', () => {
    const steps = [
      step('a', {
        legacyNumber: 1,
        segments: [
          { kind: 'stop', text: 'Solo avisa.', quest: null, stopObjective: null },
          { kind: 'stop', text: 'Para aquí.', quest: 5, stopObjective: 1 },
        ],
        quests: [{ quest: quest(5, 'Sangre fría'), kind: 'mandatory' }],
      }),
    ]
    const view = checklistView(data(steps, {}, { stopQuests: objectives }))
    expect(view.steps[0].quests[0].route).toBeDefined()
    expect(view.island.steps[0][2]).toEqual([[1005, 'mandatory', 1]])
  })

  it('un logro «hasta la misión N» no sale como completo', () => {
    const [view] = checklistView(
      data([
        step('a', {
          achievements: [{ achievement: { id: 3, name: 'Las leguas' }, mode: 'upto', on: [1, 2] }],
        }),
      ]),
    ).steps
    expect(view.achievements[0].some).toBe(true)
  })
})
