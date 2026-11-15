import { describe, expect, it } from 'vitest'

import {
  countParts,
  dofusGuideView,
  dungeonNoteLabels,
  type DofusGuideData,
  type DofusGuideDoc,
  type DofusListDoc,
} from '@/lib/dofus-guides/page'
import type { RichTextState } from '@/lib/guides/page'
import type { Media } from '@/payload-types'

// Lo que pinta la página de una guía de Dofus sale de la guía guardada y de lo que enlaza:
// sus logros con las misiones de su página de logro, las guías de misión y los PNJ.

const media = (id: number, name: string): Media =>
  ({
    id,
    alt: '',
    url: `/media/${name}.png`,
    filename: `${name}.png`,
    width: 128,
    height: 128,
    sizes: {},
  }) as unknown as Media

const text = (value: string): RichTextState => ({
  root: {
    type: 'root',
    direction: null,
    format: '',
    indent: 0,
    version: 1,
    children: [
      {
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        children: [{ type: 'text', text: value, format: 0, version: 1 }],
      },
    ],
  },
})

const quest = (id: number, name: string, levelMin: number, npcId?: number) => ({
  id,
  name,
  levelMin,
  startPositions: npcId ? [{ npcId }] : [],
})

const listDoc = (overrides: Partial<DofusListDoc>): DofusListDoc => ({
  id: 1,
  name: 'Dofus Abisal',
  slug: 'dofus-abisal',
  state: 'published',
  level: 180,
  achievements: 2,
  quests: 3,
  ...overrides,
})

function data(overrides: Partial<DofusGuideDoc> = {}): DofusGuideData {
  const guide: DofusGuideDoc = {
    id: 1,
    name: 'Dofus Abisal',
    slug: 'dofus-abisal',
    state: 'published',
    level: 180,
    tag: 'primordial',
    color: '#2a5aaa',
    dofus: { id: 9, name: 'Dofus abisal', image: media(90, 'abisal') },
    prerequisites: text('Nivel mínimo 180.'),
    intro: text('Para obtener tu Dofus Abisal…'),
    needs: {
      title: null,
      groups: [
        {
          name: 'recursos',
          rows: [
            {
              blockType: 'needItem',
              item: { id: 7, name: 'Pepita', image: media(70, 'pepita') },
              quantity: 200,
              note: null,
            },
            { blockType: 'needNote', text: text('Algún oficio nivel 200.') },
          ],
        },
        {
          name: 'mazmorras',
          rows: [{ blockType: 'needNote', text: text('1 x Mazmorra Kutulú.') }],
        },
      ],
    },
    parts: [
      { blockType: 'dofusAchievement', achievement: 100, note: null },
      {
        blockType: 'dofusMetalogro',
        name: 'Un comienzo ejemplar',
        achievements: [{ achievement: 101, note: '(el orden no importa)' }],
      },
      {
        blockType: 'dofusQuests',
        title: 'También algunas misiones random',
        quests: [{ guide: 500, note: '(solo empezarla)' }],
      },
      { blockType: 'dofusNote', text: text('Te recomiendo hacer esto antes.') },
    ],
    video: 'https://www.youtube.com/watch?v=ovPAxnBdKYQ',
    videoPoster: media(80, 'portada'),
    checklist: { name: null, url: null },
    ...overrides,
  }
  return {
    guide,
    achievements: new Map([
      [
        100,
        {
          id: 100,
          name: '¡Plof!',
          slug: 'plof',
          state: 'published',
          points: 10,
          achievement: { icon: media(60, 'plof') },
          quests: [
            {
              name: 'A la pesca de información',
              quests: [quest(1, 'A la pesca de información', 180, 77)],
            },
            { name: 'El héroe de Sufokia', quests: [quest(2, 'El héroe de Sufokia', 190)] },
          ],
        },
      ],
      [
        101,
        {
          id: 101,
          name: 'Al partir',
          slug: 'al-partir',
          state: 'preparing',
          points: null,
          achievement: null,
          quests: [{ name: 'Transporte único', quests: [quest(3, 'Transporte único', 3)] }],
        },
      ],
    ]),
    questGuides: new Map([
      [
        500,
        {
          id: 500,
          slug: 'luces-y-sombras',
          title: 'Luces y sombras',
          quest: quest(4, 'Luces y sombras', 160, 77),
        },
      ],
    ]),
    guideByQuest: new Map([[1, { slug: 'a-la-pesca-de-informacion' }]]),
    givers: new Map([[77, { renderRight: media(77, 'pnj') }]]),
    dungeonBosses: new Map(),
    list: [
      listDoc({ id: 2, name: 'Dofawa', slug: 'dofawa', level: 6, achievements: 0, quests: 1 }),
      listDoc({ id: 3, name: 'Jyfus', slug: 'jyfus', state: 'preparing', level: 20 }),
      listDoc({}),
      listDoc({ id: 4, name: 'Dofus Marfil', slug: 'dofus-marfil', achievements: 1, quests: 17 }),
    ],
    siteUrl: 'https://www.torrentearcano.com',
  }
}

describe('dofusGuideView', () => {
  it('la cabecera: el huevo, el nombre, la etiqueta y logros, misiones y nivel', () => {
    const view = dofusGuideView(data())
    expect(view.title).toBe('Dofus Abisal')
    expect(view.egg?.src).toContain('abisal')
    expect(view.color).toBe('#2a5aaa')
    expect(view.tag).toBe('Primordial')
    // Las misiones de los logros más las sueltas: 2 + 1 + 1.
    expect(view.meta).toEqual(['2 logros', '4 misiones', 'Nivel 180'])
  })

  it('Necesitarás: los objetos con su icono y cantidad, las notas tal cual, por grupos', () => {
    const view = dofusGuideView(data())
    expect(view.needs?.title).toBe('Necesitarás')
    expect(view.needs?.groups).toHaveLength(2)
    // En el orden de la lista fija, con el nombre en español: Mazmorras antes que Recursos.
    const [first, second] = view.needs!.groups
    expect(first!.name).toBe('Mazmorras')
    expect(second!.name).toBe('Recursos')
    const [rows] = second!.parts.map((part) => part.rows)
    expect(rows![0]).toMatchObject({ kind: 'item', quantity: 200, item: { name: 'Pepita' } })
    expect(rows![1]).toMatchObject({ kind: 'note' })
  })

  const note = (line: string) => ({ blockType: 'needNote' as const, text: text(line) })
  const groupsOf = (groups: NonNullable<DofusGuideDoc['needs']>['groups']) =>
    dofusGuideView(data({ needs: { title: null, groups } })).needs!.groups.map((group) => [
      group.name ?? null,
      group.parts.map((part) => [part.subtitle ?? null, part.rows.length]),
    ])

  it('dos grupos iguales salen juntos; cada subtítulo de Torre, encima de sus filas', () => {
    expect(
      groupsOf([
        { name: 'otros', rows: [note('Ayuda de otras 2 personas.')] },
        { name: 'mazmorras', rows: [note('1 x Mazmorra Kutulú.')] },
        {
          name: 'mazmorras',
          subtitle: '1 x Mazmorra',
          rows: [note('Mazmorra Malefíscof.'), note('Mazmorra Fraktal.')],
        },
        { name: 'otros', rows: [note('Sueños infinitos.')] },
      ]),
    ).toEqual([
      [
        'Mazmorras',
        [
          [null, 1],
          ['1 × Mazmorra:', 2],
        ],
      ],
      ['Otros', [[null, 2]]],
    ])
  })

  it('un subtítulo que solo repite el nombre del grupo no sale', () => {
    expect(
      groupsOf([{ name: 'combates', subtitle: 'Combates', rows: [note('2 x combates.')] }]),
    ).toEqual([['Combates', [[null, 1]]]])
  })

  it('una guía migrada sin reimportar: los grupos sin nombre quedan en su sitio, sin título', () => {
    // La migración deja sin grupo lo que no tenía nombre; la importación lo ordenará.
    expect(
      groupsOf([
        { name: null, rows: [note('Algún oficio nivel 200.')] },
        { name: 'mazmorras', subtitle: 'Mazmorras', rows: [note('1 x Mazmorra Kutulú.')] },
        { name: null, rows: [note('Un par de combates.')] },
      ] as never),
    ).toEqual([
      [null, [[null, 1]]],
      ['Mazmorras', [[null, 1]]],
      [null, [[null, 1]]],
    ])
  })

  it('«Otros» como único grupo no lleva título: solo dice algo junto a otros grupos', () => {
    expect(groupsOf([{ name: 'otros', rows: [note('Piedras de alma.')] }])).toEqual([
      [null, [[null, 1]]],
    ])
    expect(groupsOf([{ name: 'combates', rows: [note('2 x combates.')] }])).toEqual([
      ['Combates', [[null, 1]]],
    ])
  })

  it('la nota de Torre sobre Necesitarás sale encima de los grupos', () => {
    const view = dofusGuideView(
      data({
        needs: {
          title: null,
          note: '(no te he puesto los recursos de Incarnam)',
          groups: [{ name: 'recursos', rows: [note('Algo.')] }],
        },
      }),
    )
    expect(view.needs?.note).toBe('(no te he puesto los recursos de Incarnam)')
  })

  it('un título propio de Necesitarás gana al de siempre', () => {
    const view = dofusGuideView(data({ needs: { title: 'Necesitarás en total', groups: [] } }))
    expect(view.needs).toBeNull()
    const withRows = dofusGuideView(
      data({
        needs: {
          title: 'Necesitarás en total',
          groups: [{ name: 'otros', rows: [{ blockType: 'needNote', text: text('Nada.') }] }],
        },
      }),
    )
    expect(withRows.needs?.title).toBe('Necesitarás en total')
  })

  it('el paso a paso de la Piñata de pino: su prosa y sus capturas, listas para pintar', () => {
    // Lo que guarda la importación: bloques de Payload, con la imagen ya poblada.
    const view = dofusGuideView(
      data({
        body: [
          { id: 'b1', blockType: 'richText', content: text('Allí encontrarás a Gobalden.') },
          { id: 'b2', blockType: 'image', image: media(80, '579152') },
          {
            id: 'b3',
            blockType: 'step',
            x: 38,
            y: -80,
            body: [{ id: 'b4', blockType: 'richText', content: text('Habla con Goblepino.') }],
          },
          { id: 'b5', blockType: 'richText', content: text('Por fin obtendrás tu piñata.') },
        ],
      }),
    )
    const { intro, steps, outro } = view.body
    expect(intro.map((block) => block.kind)).toEqual(['richText', 'image'])
    // El cuerpo va debajo de la ficha: su primera captura no es la LCP de la página.
    expect(intro[1]).toMatchObject({ kind: 'image', priority: false })
    expect(steps).toHaveLength(1)
    expect(steps[0]).toMatchObject({ coordinates: { x: 38, y: -80 } })
    expect(steps[0]!.blocks.map((block) => block.kind)).toEqual(['richText'])
    expect(outro.map((block) => block.kind)).toEqual(['richText'])
  })

  it('un paso sin nada que pintar no cuenta: sin bloques ni coordenadas, no hay paso a paso', () => {
    const view = dofusGuideView(
      data({
        // La imagen sin poblar (un ID) no se puede pintar: el paso se queda vacío.
        body: [
          { id: 's1', blockType: 'step', body: [{ id: 'i1', blockType: 'image', image: 81 }] },
        ],
      }),
    )
    expect(view.body).toEqual({ intro: [], steps: [], outro: [] })
  })

  it('un combate y una captura dentro de un paso salen con lo que la consulta trae poblado', () => {
    const view = dofusGuideView(
      data({
        body: [
          {
            id: 'f1',
            blockType: 'fight',
            monsters: [
              { monster: { id: 5, name: 'Gobalden', image: media(50, 'gobalden') }, quantity: 1 },
            ],
          },
          {
            id: 's1',
            blockType: 'step',
            x: 38,
            y: -80,
            body: [{ id: 'i1', blockType: 'image', image: media(81, '579153') }],
          },
        ],
      }),
    )
    expect(view.body.intro).toMatchObject([
      { kind: 'fight', monsters: [{ item: { name: 'Gobalden' }, quantity: 1 }] },
    ])
    expect(view.body.steps[0]!.blocks).toMatchObject([{ kind: 'image', priority: false }])
  })

  it('un logro trae las misiones de su página de logro, con PNJ, nivel y enlace', () => {
    const [part] = dofusGuideView(data()).parts
    expect(part).toMatchObject({
      kind: 'achievement',
      achievement: {
        name: '¡Plof!',
        href: '/plof',
        disabled: false,
        meta: ['2 misiones', 'Niveles 180 a 190', '10 puntos'],
      },
    })
    if (part?.kind !== 'achievement') throw new Error('Se esperaba un logro')
    expect(part.achievement.quests).toMatchObject([
      {
        position: 1,
        level: 180,
        title: 'A la pesca de información',
        href: '/a-la-pesca-de-informacion',
      },
      { position: 2, level: 190, title: 'El héroe de Sufokia' },
    ])
    expect(part.achievement.quests[0]!.giver).toBeDefined()
    expect(part.achievement.quests[1]!.href).toBeUndefined()
  })

  it('un metalogro agrupa sus logros con su número; uno En preparación no enlaza', () => {
    const parts = dofusGuideView(data()).parts
    expect(parts[1]).toMatchObject({ kind: 'metalogro', number: 1, name: 'Un comienzo ejemplar' })
    if (parts[1]?.kind !== 'metalogro') throw new Error('Se esperaba un metalogro')
    expect(parts[1].achievements[0]).toMatchObject({
      name: 'Al partir',
      disabled: true,
      note: '(el orden no importa)',
    })
    expect(parts[1].achievements[0]!.href).toBeUndefined()
  })

  it('las misiones sueltas enlazan su guía y llevan la nota de Torre', () => {
    const parts = dofusGuideView(data()).parts
    expect(parts[2]).toMatchObject({
      kind: 'quests',
      title: 'También algunas misiones random',
      quests: [
        {
          position: 1,
          level: 160,
          title: 'Luces y sombras',
          href: '/luces-y-sombras',
          note: '(solo empezarla)',
        },
      ],
    })
    expect(parts[3]).toMatchObject({ kind: 'note' })
  })

  it('una parte que apunta a lo que el visitante no puede ver no se pinta', () => {
    const view = dofusGuideView(
      data({
        parts: [
          { blockType: 'dofusAchievement', achievement: 999, note: null },
          { blockType: 'dofusQuest', guide: 999, note: null },
        ],
      }),
    )
    expect(view.parts).toEqual([])
  })

  it('el vídeo con su portada y la checklist cuando hay', () => {
    const view = dofusGuideView(
      data({
        checklist: { name: 'Checklist Dofus Abisal', url: 'https://www.torrentearcano.com/x' },
      }),
    )
    expect(view.video).toMatchObject({ id: 'ovPAxnBdKYQ', title: 'Dofus Abisal' })
    expect(view.video?.poster?.src).toContain('portada')
    expect(view.checklist).toEqual({
      name: 'Checklist Dofus Abisal',
      href: 'https://www.torrentearcano.com/x',
    })
    expect(dofusGuideView(data()).checklist).toBeNull()
  })

  it('el anterior y el siguiente son los Dofus publicados de alrededor, con sus cifras', () => {
    const view = dofusGuideView(data())
    // El Jyfus, En preparación, se salta: no tiene página.
    expect(view.previous).toMatchObject({
      name: 'Dofawa',
      href: '/dofawa',
      meta: '1 misión - Nivel 6',
    })
    expect(view.next).toMatchObject({
      name: 'Dofus Marfil',
      href: '/dofus-marfil',
      meta: '1 logro - 17 misiones - Nivel 180',
    })
  })

  it('las migas: Guías de Dofus y, en el JSON-LD, la guía', () => {
    const { breadcrumb } = dofusGuideView(data())
    expect(breadcrumb.parents).toEqual([{ name: 'Guías de Dofus', href: '/guias-dofus' }])
    expect(breadcrumb.jsonLd.itemListElement.at(-1)).toMatchObject({
      name: 'Dofus Abisal',
      item: 'https://www.torrentearcano.com/dofus-abisal',
    })
  })
})

// Como en «Necesitarás en total» de las páginas de logro (DESIGN.md, Achievement page
// components): cada mazmorra lleva el jefe de la mazmorra que nombra, o el icono de mazmorra
// si no nombra una sola. La nota sigue tal cual la escribió Torre.
describe('Necesitarás: cada mazmorra con su jefe', () => {
  const note = (line: string) => ({ blockType: 'needNote' as const, text: text(line) })
  type Groups = NonNullable<DofusGuideDoc['needs']>['groups']
  const viewOf = (groups: Groups, bosses: [string, Media][] = []) =>
    dofusGuideView({ ...data({ needs: { title: null, groups } }), dungeonBosses: new Map(bosses) })
      .needs!.groups

  it('una nota de «Mazmorras» lleva la imagen del jefe de su mazmorra, por la clave de la nota', () => {
    const [group] = viewOf(
      [
        {
          name: 'mazmorras',
          rows: [
            note('1 x Mazmorra Wey Wabbit.'),
            note('Mazmorras nivel 200'),
            note('1 x Antro del Dragocerdo.'),
          ],
        },
      ],
      [
        ['mazmorra wey wabbit', media(31, 'wey-wabbit')],
        ['antro del dragocerdo', media(32, 'dragocerdo')],
      ],
    )
    const rows = group!.parts[0]!.rows
    expect(rows).toHaveLength(3)
    expect(rows[0]).toMatchObject({
      kind: 'note',
      dungeon: true,
      boss: { src: '/media/wey-wabbit.png' },
    })
    // Sin una sola mazmorra casada: el icono de mazmorra, sin jefe.
    expect(rows[1]).toMatchObject({ kind: 'note', dungeon: true })
    expect(rows[1]).not.toHaveProperty('boss')
    // En el grupo «Mazmorras», la nota es una mazmorra aunque no diga «Mazmorra».
    expect(rows[2]).toMatchObject({
      kind: 'note',
      dungeon: true,
      boss: { src: '/media/dragocerdo.png' },
    })
    // El texto de Torre, el mismo que guardó.
    expect(rows[0]).toMatchObject({ text: text('1 x Mazmorra Wey Wabbit.') })
  })

  it('en «Combates» solo va como mazmorra una nota que dice «mazmorra»', () => {
    const [group] = viewOf(
      [{ name: 'combates', rows: [note('2 x combates (solo).'), note('1 x Mazmorra Kumijo.')] }],
      [['mazmorra kumijo', media(33, 'kumijo')]],
    )
    const [combat, dungeon] = group!.parts[0]!.rows
    expect(combat).not.toHaveProperty('dungeon')
    expect(dungeon).toMatchObject({ dungeon: true, boss: { src: '/media/kumijo.png' } })
  })

  it('en los demás grupos una nota sale tal cual, aunque nombre una mazmorra', () => {
    const groups = viewOf(
      [
        { name: 'otros', rows: [note('Piedras de alma de jefes de mazmorra.')] },
        { name: 'recursos', rows: [note('1 x Mazmorra Kumijo.')] },
      ],
      [['mazmorra kumijo', media(33, 'kumijo')]],
    )
    for (const group of groups) {
      expect(group.parts[0]!.rows[0]).not.toHaveProperty('dungeon')
      expect(group.parts[0]!.rows[0]).not.toHaveProperty('boss')
    }
  })

  it('dungeonNoteLabels: las notas que van como mazmorra, sin cantidad, una vez cada una', () => {
    const guide = data({
      needs: {
        title: null,
        groups: [
          {
            name: 'mazmorras',
            rows: [note('1 x Mazmorra Wey Wabbit.'), note('Mazmorras nivel 200')],
          },
          { name: 'combates', rows: [note('2 x combates.'), note('1 x Mazmorra Wey Wabbit.')] },
          { name: 'otros', rows: [note('Piedras de alma de jefes de mazmorra.')] },
        ],
      },
    }).guide
    expect(dungeonNoteLabels(guide)).toEqual(['Mazmorra Wey Wabbit', 'Mazmorras nivel 200'])
  })
})

describe('dofusGuideView: las misiones de cada logro como las escribe Torre', () => {
  // Las guías de misión que enlazan las filas de Torre, con su misión poblada.
  const questGuides = new Map([
    [
      600,
      {
        id: 600,
        slug: 'donde-esta-bizcana',
        title: 'Hey, ¿dónde está Bizcana?',
        quest: quest(10, 'Hey, ¿dónde está Bizcana?', 150, 77),
      },
    ],
    [
      601,
      {
        id: 601,
        slug: 'la-fatalidad',
        title: 'La fatalidad',
        quest: quest(11, 'La fatalidad', 50),
      },
    ],
    [602, { id: 602, slug: 'el-destino', title: 'El destino', quest: quest(12, 'El destino', 40) }],
    [
      603,
      {
        id: 603,
        slug: 'la-rivalidad',
        title: 'La rivalidad',
        quest: quest(13, 'La rivalidad', 60),
      },
    ],
  ])
  const withRows = (
    parts: DofusGuideDoc['parts'],
    extra: Partial<DofusGuideData> = {},
  ): DofusGuideData => {
    const base = data({ parts })
    return { ...base, questGuides: new Map([...base.questGuides, ...questGuides]), ...extra }
  }
  const achievementOf = (view: ReturnType<typeof dofusGuideView>, index = 0) => {
    const part = view.parts[index]
    if (part?.kind !== 'achievement') throw new Error('Se esperaba un logro')
    return part.achievement
  }

  it('salen las filas de Torre, con su texto, en su orden, y cuentan ellas', () => {
    const view = dofusGuideView(
      withRows([
        {
          blockType: 'dofusAchievement',
          achievement: 100,
          note: null,
          pageQuests: false,
          ownQuests: [
            { title: 'Heh, ¿dónde está Bizcana?', guides: [600], note: '(solo empezarla)' },
            { title: 'Misión de clase', guides: [] },
          ],
        },
      ]),
    )
    const achievement = achievementOf(view)
    // El título es el de Torre, no el de la guía; el PNJ y el nivel, los de su misión.
    expect(achievement.quests).toMatchObject([
      {
        position: 1,
        level: 150,
        title: 'Heh, ¿dónde está Bizcana?',
        href: '/donde-esta-bizcana',
        note: '(solo empezarla)',
      },
      { position: 2, title: 'Misión de clase' },
    ])
    expect(achievement.quests[0]!.giver).toBeDefined()
    expect(achievement.quests[1]!.href).toBeUndefined()
    // La página de ¡Plof! tiene otras dos misiones: cuentan las de Torre.
    expect(achievement.meta).toEqual(['2 misiones', 'Nivel 150', '10 puntos'])
    expect(view.meta).toEqual(['1 logro', '2 misiones', 'Nivel 180'])
  })

  it('una fila con varios enlaces los guarda todos, cada uno en su trozo del texto', () => {
    const view = dofusGuideView(
      withRows([
        {
          blockType: 'dofusAchievement',
          achievement: 100,
          note: null,
          pageQuests: false,
          ownQuests: [
            { title: 'La fatalidad - El destino - La rivalidad', guides: [601, 602, 603] },
          ],
        },
      ]),
    )
    const [row] = achievementOf(view).quests
    expect(row).toMatchObject({ title: 'La fatalidad - El destino - La rivalidad', level: 40 })
    expect(row!.href).toBeUndefined()
    expect(row!.links).toEqual([
      { text: 'La fatalidad', href: '/la-fatalidad' },
      { text: ' - ' },
      { text: 'El destino', href: '/el-destino' },
      { text: ' - ' },
      { text: 'La rivalidad', href: '/la-rivalidad' },
    ])
  })

  it('un logro que Torre pone sin misiones no las saca de su página ni dice «0 misiones»', () => {
    const view = dofusGuideView(
      withRows([
        { blockType: 'dofusAchievement', achievement: 100, note: null, pageQuests: false },
      ]),
    )
    const achievement = achievementOf(view)
    expect(achievement.quests).toEqual([])
    expect(achievement.meta).toEqual(['10 puntos'])
    expect(view.meta).toEqual(['1 logro', 'Nivel 180'])
  })

  it('una página de logro sin misiones tampoco dice «0 misiones»', () => {
    const base = data({ parts: [{ blockType: 'dofusAchievement', achievement: 100, note: null }] })
    const page = { ...base.achievements.get(100)!, quests: [] }
    const view = dofusGuideView({ ...base, achievements: new Map([[100, page]]) })
    expect(achievementOf(view).meta).toEqual(['10 puntos'])
  })

  it('un logro En preparación que Torre enlaza lleva a su página de siempre', () => {
    const view = dofusGuideView(
      withRows([
        {
          blockType: 'dofusMetalogro',
          name: 'Un comienzo ejemplar',
          achievements: [{ achievement: 101, note: null, link: '/al-partir' }],
        },
      ]),
    )
    const part = view.parts[0]
    if (part?.kind !== 'metalogro') throw new Error('Se esperaba un metalogro')
    expect(part.achievements[0]).toMatchObject({
      disabled: true,
      href: 'https://www.torrentearcano.com/al-partir',
    })
  })

  it('las misiones sueltas y las de un paso salen con el texto de Torre', () => {
    const view = dofusGuideView(
      withRows([
        { blockType: 'dofusQuest', guide: 600, title: 'Hablar con el Dios Anutrof', note: null },
        {
          blockType: 'dofusQuests',
          title: 'Prerrequisitos de misiones secundarias',
          quests: [
            { guide: 600, title: 'Heh, ¿dónde está Bizcana?' },
            // Lo que no es una misión pero Torre enlaza: queda en la lista, con su enlace.
            {
              title: '100 misiones de alineamiento Bonta o Brakmar + 5 misiones de rango',
              link: '/metalogro-alineamiento',
            },
            { title: 'Logro: Cazadores cazados', link: '/cazadores-cazados', note: 'completo' },
          ],
        },
      ]),
    )
    expect(view.parts[0]).toMatchObject({
      kind: 'quest',
      quest: { title: 'Hablar con el Dios Anutrof', href: '/donde-esta-bizcana' },
    })
    expect(view.parts[1]).toMatchObject({
      kind: 'quests',
      quests: [
        { position: 1, title: 'Heh, ¿dónde está Bizcana?', href: '/donde-esta-bizcana' },
        {
          kind: 'link',
          title: '100 misiones de alineamiento Bonta o Brakmar + 5 misiones de rango',
          href: '/metalogro-alineamiento',
        },
        {
          kind: 'link',
          title: 'Logro: Cazadores cazados',
          href: '/cazadores-cazados',
          note: 'completo',
        },
      ],
    })
    // Lo que no es una misión no cuenta como misión.
    expect(view.meta).toEqual(['2 misiones', 'Nivel 180'])
  })

  it('una misión de Torre cuya guía no se publicó sale sin enlace, con su texto', () => {
    const view = dofusGuideView(
      withRows([
        {
          blockType: 'dofusQuests',
          title: null,
          quests: [{ guide: 999, title: 'Misión sin guía publicada' }],
        },
      ]),
    )
    expect(view.parts[0]).toMatchObject({
      kind: 'quests',
      quests: [{ position: 1, title: 'Misión sin guía publicada' }],
    })
  })
})

describe('countParts', () => {
  it('un logro con la lista de Torre cuenta sus filas, no las de su página', () => {
    const parts: DofusGuideDoc['parts'] = [
      {
        blockType: 'dofusAchievement',
        achievement: 100,
        pageQuests: false,
        ownQuests: [{ title: 'La manía de reciclar', guides: [1] }],
      },
      { blockType: 'dofusAchievement', achievement: 101, pageQuests: false },
      { blockType: 'dofusAchievement', achievement: 102 },
      {
        blockType: 'dofusQuests',
        quests: [{ guide: 5 }, { title: 'Logro: Cazadores cazados', link: '/cazadores-cazados' }],
      },
    ]
    expect(countParts(parts ?? [], () => 9)).toEqual({ achievements: 3, quests: 11 })
  })
})

describe('dofusGuideView: los enlaces que se escriben en el panel', () => {
  it('un enlace que no es una dirección del sitio ni web no se pinta como enlace', () => {
    const view = dofusGuideView(
      data({
        parts: [
          {
            blockType: 'dofusQuests',
            quests: [
              { title: 'Malo', link: 'javascript:alert(1)' },
              { title: 'Otro sitio sin protocolo', link: '//ejemplo.com' },
              { title: 'Bueno', link: 'https://www.torrentearcano.com/emote-x' },
            ],
          },
          {
            blockType: 'dofusAchievement',
            achievement: 101,
            link: 'javascript:alert(1)',
          },
        ],
      }),
    )
    const [quests, achievement] = view.parts
    if (quests?.kind !== 'quests') throw new Error('Se esperaban misiones sueltas')
    expect(quests.quests.map((quest) => quest.href)).toEqual([
      undefined,
      undefined,
      'https://www.torrentearcano.com/emote-x',
    ])
    if (achievement?.kind !== 'achievement') throw new Error('Se esperaba un logro')
    expect(achievement.achievement.href).toBeUndefined()
  })
})
