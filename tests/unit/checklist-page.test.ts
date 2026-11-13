import { describe, expect, it } from 'vitest'

import {
  checklistRoute,
  checklistView,
  objectiveText,
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

const item = (id: number, name: string) => ({ id, name, image: media(id, `item-${id}`) })

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
    updatedAt: '',
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
      line: { at: 1, kind: 'stop', text: 'Avanza hasta que te pida entregar muestras.' },
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

    expect(row.route?.line).toEqual({ at: 0, kind: 'resolve', text: 'Pasa la mazmorra.' })
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

  it('una fila con texto y sin objeto sale como texto, sin copiar ni icono', () => {
    const [view] = checklistView(data([needsStep])).steps
    const rows = view.needs[0].rows

    expect(rows[0]).toEqual({ kind: 'label', name: 'Kama', quantity: 1 })
    expect(rows[2]).toEqual({
      kind: 'label',
      name: 'Captura de almas',
      quantity: 1,
      note: 'Hechizo: requisito, no consumible',
    })
    expect(rows[1]).toEqual(
      expect.objectContaining({
        kind: 'item',
        name: 'Cuerno',
        quantity: 2,
        note: 'o 30 000 kamas',
      }),
    )
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
  it('solo la estructura: los stepId, el número antiguo, las misiones con su tipo y su parada, lo que cierra cada paso y lo antiguo', () => {
    const steps = [
      step('a', {
        legacyNumber: 1,
        segments: [{ kind: 'stop', text: 'Para.', quest: 5, stopObjective: 2 }],
        quests: [
          { quest: quest(5, 'Sangre fría'), kind: 'mandatory' },
          { quest: quest(6, 'Otra'), kind: 'take' },
        ],
      }),
      step('b', { legacyNumber: 2, segments: [{ kind: 'resolve', text: 'Fin.', closes: ['a'] }] }),
    ]
    const { island } = checklistView(data(steps))

    expect(island).toEqual({
      checklistId: 7,
      slug: 'checklist-nebuloso',
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
      ],
      closes: [['b', ['a']]],
      legacy: {
        prefix: 'nebuloso:',
        classicKeys: { v4: 'dofus_nebuloso_clean_v1' },
        guideVersion: 1,
      },
    })
    expect(JSON.stringify(island)).not.toContain('Sangre fría')
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
