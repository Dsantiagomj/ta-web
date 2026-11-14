import { describe, expect, it } from 'vitest'

import {
  dofusGuideView,
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
          name: null,
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
          name: 'Mazmorras',
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
    const [first, second] = view.needs!.groups
    expect(first!.rows[0]).toMatchObject({ kind: 'item', quantity: 200, item: { name: 'Pepita' } })
    expect(first!.rows[1]).toMatchObject({ kind: 'note' })
    expect(second!.name).toBe('Mazmorras')
  })

  it('un título propio de Necesitarás gana al de siempre', () => {
    const view = dofusGuideView(data({ needs: { title: 'Necesitarás en total', groups: [] } }))
    expect(view.needs).toBeNull()
    const withRows = dofusGuideView(
      data({
        needs: {
          title: 'Necesitarás en total',
          groups: [{ name: null, rows: [{ blockType: 'needNote', text: text('Nada.') }] }],
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
