import { describe, expect, it } from 'vitest'

import type { Media } from '@/payload-types'
import {
  guideStart,
  nextQuestCard,
  guideContent,
  guideLevel,
  guideSeo,
  prerequisiteQuestIds,
  questGiverId,
  questHeaderProps,
  type GuideDoc,
  type NextGuideDoc,
} from '@/lib/guides/page'

const richText = (text: string) => ({
  root: {
    type: 'root',
    format: '' as const,
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', text, version: 1 }] }],
  },
})

const item = (id: number, name: string, superTypeId = 9) => ({ id, name, superTypeId })

/** Un render de PNJ subido a Media, sin variantes: solo el original. */
const render = (id: number, name: string): Media => ({
  id,
  alt: 'Hupe Esse',
  url: `/api/media/file/${name}.png`,
  filename: `${name}.png`,
  mimeType: 'image/png',
  width: 334,
  height: 720,
  sizes: {
    'webp-480': {
      url: `/api/media/file/${name}.webp`,
      width: 334,
      height: 720,
      filename: `${name}.webp`,
    },
  },
  updatedAt: '',
  createdAt: '',
})

// «Seis pies bajo tierra» (DofusDB 1976), leída con depth 2 como la carga la página.
const guide: GuideDoc = {
  title: 'Seis pies bajo tierra',
  slug: 'seis-pies-bajo-tierra',
  quest: {
    id: 1976,
    name: 'Seis pies bajo tierra',
    levelMin: 20,
    prerequisites: [{ id: 1975, name: 'Esto hace aguas' }],
    rewards: {
      experience: 16380,
      kamas: 390,
      items: [
        { item: item(373, 'Intestino de araknáusea'), quantity: 1 },
        { item: item(366, 'Pico de tofu'), quantity: 2 },
        // Sin poblar: no hay nombre que enseñar.
        { item: 999, quantity: 1 },
      ],
    },
  },
  summary: {
    prerequisites: 'Nivel mínimo 20.\nEsto hace aguas.\n\n',
    needs: {
      items: [
        { item: item(737, 'Dofus Esmeralda'), quantity: 1 },
        // Objeto de misión: lo da el juego.
        { item: item(8000, 'Carta de Hupe', 14), quantity: 1 },
      ],
      notes: '1 x Combate (solo).\n',
    },
    startNpc: 'Hupe Esse',
    startX: 7,
    startY: -19,
  },
  body: [],
  seo: { metaTitle: null, metaDescription: null },
}

describe('guideLevel', () => {
  it('es el nivel mínimo de la misión enlazada', () => {
    expect(guideLevel(guide)).toBe(20)
  })

  it('sin misión, o sin nivel, no hay medallón', () => {
    expect(guideLevel({ ...guide, quest: null })).toBeUndefined()
    expect(guideLevel({ ...guide, quest: 1976 })).toBeUndefined()
    expect(guideLevel({ ...guide, quest: { id: 1, name: 'x', levelMin: 0 } })).toBeUndefined()
  })
})

describe('questHeaderProps', () => {
  const withData: GuideDoc = {
    ...guide,
    quest: {
      ...(guide.quest as object as Exclude<GuideDoc['quest'], number | null | undefined>),
      zone: 'Astrub',
      achievement: {
        dofusId: 1671,
        name: 'La ocasión hace al ladrón',
        slug: 'la-ocasion-hace-al-ladron',
        position: 2,
        total: 3,
      },
      rewards: {
        ...(guide.quest as { rewards: object }).rewards,
        experience: 16380,
        experienceMin: 9800,
      },
    },
  }

  it('el subtítulo: zona, nivel y la posición en el logro, con su enlace', () => {
    expect(questHeaderProps(withData, []).meta).toEqual({
      zone: 'Astrub',
      level: 20,
      achievement: {
        name: 'La ocasión hace al ladrón',
        href: 'https://www.torrentearcano.com/la-ocasion-hace-al-ladron',
        position: 2,
      },
    })
  })

  it('sin zona ni logro, solo el nivel; sin misión, nada', () => {
    expect(questHeaderProps(guide, []).meta).toEqual({ level: 20 })
    expect(questHeaderProps({ ...guide, quest: null }, []).meta).toEqual({})
  })

  it('el PNJ con sus dos renders, su nombre del resumen y la posición de inicio', () => {
    const giver = {
      name: 'Hupe Esse (DofusDB)',
      renderRight: render(10, 'derecha'),
      renderLeft: render(11, 'izquierda'),
    }
    expect(questHeaderProps(guide, [], giver).giver).toMatchObject({
      name: 'Hupe Esse',
      right: { src: '/api/media/file/derecha.webp' },
      left: { src: '/api/media/file/izquierda.webp' },
      coordinates: { x: 7, y: -19 },
    })
  })

  it('sin render mirando a la derecha no hay PNJ; sin el de la izquierda, el móvil usa el otro', () => {
    expect(questHeaderProps(guide, [], { name: 'x', renderRight: null }).giver).toBeUndefined()
    expect(questHeaderProps(guide, []).giver).toBeUndefined()
    const onlyRight = { name: 'x', renderRight: render(10, 'derecha'), renderLeft: null }
    expect(questHeaderProps(guide, [], onlyRight).giver?.left).toBeUndefined()
  })

  it('Prerrequisitos: una fila por línea, sin punto final; la misión previa lleva su icono y su guía', () => {
    const linked = [{ questId: 1975, slug: 'esto-hace-aguas' }]
    expect(questHeaderProps(guide, linked).prerequisites).toEqual([
      { label: 'Nivel mínimo 20', quest: false },
      { label: 'Esto hace aguas', href: '/esto-hace-aguas', quest: true },
    ])
    expect(questHeaderProps(guide, []).prerequisites[1]).toEqual({
      label: 'Esto hace aguas',
      quest: true,
    })
  })

  it('Necesitarás: los objetos sin los de misión y las notas, con su cantidad aparte', () => {
    expect(questHeaderProps(guide, []).needs).toEqual({
      items: [{ item: { name: 'Dofus Esmeralda' }, quantity: 1 }],
      notes: [{ quantity: 1, label: 'Combate (solo)', combat: true }],
    })
    const other = {
      ...guide,
      summary: { ...guide.summary, needs: { notes: 'Literalmente nada.\n2 x Combates.' } },
    }
    expect(questHeaderProps(other, []).needs.notes).toEqual([
      { label: 'Literalmente nada', combat: false },
      { quantity: 2, label: 'Combates', combat: true },
    ])
  })

  it('Recompensas: el rango de XP, los kamas y los objetos en el orden de Torre', () => {
    expect(questHeaderProps(withData, []).rewards).toEqual({
      xp: { min: 9800, max: 16380 },
      kamas: 390,
      items: [
        { item: { name: 'Pico de tofu' }, quantity: 2 },
        { item: { name: 'Intestino de araknáusea' }, quantity: 1 },
      ],
      notes: [],
    })
  })

  it('sin XP mínima, o igual a la máxima, una sola cifra', () => {
    expect(questHeaderProps(guide, []).rewards.xp).toEqual({ max: 16380 })
    const same = structuredClone(withData)
    ;(same.quest as { rewards: { experienceMin: number } }).rewards.experienceMin = 16380
    expect(questHeaderProps(same, []).rewards.xp).toEqual({ max: 16380 })
  })

  it('sin recompensas de DofusDB, las líneas que escribió Torre, sin inventar filas', () => {
    const noQuest = {
      ...guide,
      quest: null,
      summary: { rewards: '2 000 XP.\n\n1 x Pico de tofu.\n' },
    }
    expect(questHeaderProps(noQuest, []).rewards).toEqual({
      items: [],
      notes: ['2 000 XP', '1 x Pico de tofu'],
    })
  })
})

describe('questGiverId', () => {
  it('el PNJ de la primera posición de inicio que lo tiene', () => {
    const quest = { id: 1976, startPositions: [{ npcId: null }, { npcId: 4412 }, { npcId: 1 }] }
    expect(questGiverId({ ...guide, quest })).toBe(4412)
    expect(questGiverId(guide)).toBeNull()
    expect(questGiverId({ ...guide, quest: null })).toBeNull()
  })
})

describe('prerequisiteQuestIds', () => {
  it('las misiones previas pobladas, para buscar sus guías', () => {
    expect(prerequisiteQuestIds(guide)).toEqual([1975])
    expect(prerequisiteQuestIds({ ...guide, quest: null })).toEqual([])
  })
})

/** Los bloques de una guía sin pasos: todo el cuerpo es prosa, en la entrada. */
function guideBlocks(doc: GuideDoc) {
  const content = guideContent(doc)
  expect(content.steps).toEqual([])
  expect(content.outro).toEqual([])
  return content.intro
}

describe('guideContent sin pasos', () => {
  const image = {
    id: 5,
    alt: 'Hupe Esse en la biblioteca',
    url: '/api/media/file/hupe.webp',
    width: 800,
    height: 551,
    updatedAt: '2026-11-05T00:00:00.000Z',
    createdAt: '2026-11-05T00:00:00.000Z',
  } satisfies Media

  it('cada bloque del cuerpo, en orden, con lo que necesita su componente', () => {
    const blocks = guideBlocks({
      ...guide,
      body: [
        { blockType: 'richText', id: 'a', content: richText('Habla con Hupe Esse [7,-19].') },
        { blockType: 'image', id: 'b', image, caption: 'Hupe Esse.' },
        { blockType: 'video', id: 'c', url: 'https://youtu.be/VaY3tyYTq4A', title: 'El vídeo' },
        { blockType: 'callout', id: 'd', variant: 'warning', content: richText('Ojo.') },
      ],
    })
    expect(blocks).toEqual([
      { kind: 'richText', key: 'a', content: richText('Habla con Hupe Esse [7,-19].') },
      {
        kind: 'image',
        key: 'b',
        image: { src: '/api/media/file/hupe.webp', width: 800, height: 551 },
        alt: 'Hupe Esse en la biblioteca',
        caption: 'Hupe Esse.',
        // La primera captura puede quedar en la primera pantalla del móvil: es la LCP.
        priority: true,
      },
      { kind: 'video', key: 'c', url: 'https://youtu.be/VaY3tyYTq4A', title: 'El vídeo' },
      { kind: 'callout', key: 'd', variant: 'warning', content: richText('Ojo.') },
    ])
  })

  const upload = {
    type: 'upload',
    version: 1,
    relationTo: 'media',
    value: image,
    fields: null,
  }
  const textWithImage = {
    root: {
      ...richText('Mira la captura.').root,
      children: [...richText('Mira la captura.').root.children, upload],
    },
  }

  it('la primera imagen del cuerpo va con prioridad aunque esté dentro de un texto', () => {
    const blocks = guideBlocks({
      ...guide,
      body: [
        { blockType: 'richText', id: 'a', content: richText('Sin imagen.') },
        { blockType: 'richText', id: 'b', content: textWithImage },
        { blockType: 'image', id: 'c', image },
      ],
    })
    expect(blocks[0]).not.toHaveProperty('priorityImage')
    expect(blocks[1]).toMatchObject({ kind: 'richText', priorityImage: true })
    expect(blocks[2]).toMatchObject({ kind: 'image', priority: false })
  })

  it('si el bloque Imagen va antes, la imagen del texto ya no va con prioridad', () => {
    const blocks = guideBlocks({
      ...guide,
      body: [
        { blockType: 'image', id: 'a', image },
        { blockType: 'richText', id: 'b', content: textWithImage },
      ],
    })
    expect(blocks[0]).toMatchObject({ kind: 'image', priority: true })
    expect(blocks[1]).not.toHaveProperty('priorityImage')
  })

  it('una imagen sin archivo dentro de un texto no se lleva la prioridad', () => {
    const unpopulated = {
      root: { ...richText('x').root, children: [{ ...upload, value: 5 }] },
    }
    const blocks = guideBlocks({
      ...guide,
      body: [
        { blockType: 'richText', id: 'a', content: unpopulated },
        { blockType: 'image', id: 'b', image },
      ],
    })
    expect(blocks[0]).not.toHaveProperty('priorityImage')
    expect(blocks[1]).toMatchObject({ priority: true })
  })

  it('solo la primera captura va con prioridad', () => {
    const blocks = guideBlocks({
      ...guide,
      body: [
        { blockType: 'image', image },
        { blockType: 'image', image },
      ],
    })
    expect(blocks.map((block) => block.kind === 'image' && block.priority)).toEqual([true, false])
  })

  it('un vídeo sin título usa el de la guía; una imagen sin archivo se salta', () => {
    const blocks = guideBlocks({
      ...guide,
      body: [
        { blockType: 'image', image: 5 },
        { blockType: 'video', url: 'https://youtu.be/VaY3tyYTq4A' },
      ],
    })
    expect(blocks).toEqual([
      {
        kind: 'video',
        key: '1',
        url: 'https://youtu.be/VaY3tyYTq4A',
        title: 'Vídeo de la guía: Seis pies bajo tierra',
      },
    ])
  })

  it('usa las variantes que Payload generó al subir: el WebP más ancho y los srcset', () => {
    const size = (format: string, width: number) => ({
      url: `/api/media/file/hupe-${width}.${format}`,
      width,
      height: Math.round((width * 551) / 800),
    })
    const withSizes = {
      ...image,
      sizes: {
        'avif-480': size('avif', 480),
        'webp-480': size('webp', 480),
        'avif-800': size('avif', 800),
        'webp-800': size('webp', 800),
      },
    }
    const [block] = guideBlocks({ ...guide, body: [{ blockType: 'image', image: withSizes }] })
    expect(block).toMatchObject({
      image: {
        src: '/api/media/file/hupe-800.webp',
        avif: '/api/media/file/hupe-800.avif',
        srcSet: [
          { src: '/api/media/file/hupe-480.webp', width: 480 },
          { src: '/api/media/file/hupe-800.webp', width: 800 },
        ],
      },
    })
  })
})

describe('guideContent con pasos', () => {
  const image = {
    id: 5,
    alt: 'Hupe Esse en la biblioteca',
    url: '/api/media/file/hupe.webp',
    width: 800,
    height: 551,
    updatedAt: '2026-11-05T00:00:00.000Z',
    createdAt: '2026-11-05T00:00:00.000Z',
  } satisfies Media

  it('parte el cuerpo en entrada, pasos y cierre', () => {
    const content = guideContent({
      ...guide,
      body: [
        { blockType: 'richText', id: 'a', content: richText('Una misión corta.') },
        {
          blockType: 'step',
          id: 'p1',
          x: 7,
          y: -19,
          body: [{ blockType: 'richText', id: 'p1a', content: richText('En la biblioteca.') }],
        },
        { blockType: 'step', id: 'p2', x: null, y: null, body: [] },
        { blockType: 'richText', id: 'z', content: richText('Aquí termina la misión.') },
      ],
    })
    expect(content).toEqual({
      intro: [{ kind: 'richText', key: 'a', content: richText('Una misión corta.') }],
      steps: [
        {
          key: 'p1',
          coordinates: { x: 7, y: -19 },
          blocks: [{ kind: 'richText', key: 'p1a', content: richText('En la biblioteca.') }],
        },
        { key: 'p2', blocks: [] },
      ],
      outro: [{ kind: 'richText', key: 'z', content: richText('Aquí termina la misión.') }],
    })
  })

  it('un bloque suelto entre dos pasos se queda al final del paso anterior, en su orden', () => {
    const { steps, outro } = guideContent({
      ...guide,
      body: [
        { blockType: 'step', id: 'p1', body: [] },
        { blockType: 'callout', id: 'c', variant: 'tip', content: richText('Ojo.') },
        { blockType: 'step', id: 'p2', body: [] },
      ],
    })
    expect(steps.map((step) => step.blocks.map((block) => block.key))).toEqual([['c'], []])
    expect(outro).toEqual([])
  })

  it('la primera imagen en el orden del documento va con prioridad, también dentro de un paso', () => {
    const { intro, steps, outro } = guideContent({
      ...guide,
      body: [
        { blockType: 'richText', id: 'a', content: richText('Sin imagen.') },
        {
          blockType: 'step',
          id: 'p1',
          body: [
            { blockType: 'image', id: 'i1', image },
            { blockType: 'image', id: 'i2', image },
          ],
        },
        { blockType: 'image', id: 'i3', image },
      ],
    })
    expect(intro[0]).not.toHaveProperty('priorityImage')
    expect(steps[0]?.blocks.map((block) => block.kind === 'image' && block.priority)).toEqual([
      true,
      false,
    ])
    expect(outro[0]).toMatchObject({ kind: 'image', priority: false })
  })

  it('sin X e Y juntas no hay chip', () => {
    const { steps } = guideContent({
      ...guide,
      body: [
        { blockType: 'step', x: 3, y: null },
        { blockType: 'step', x: 0, y: 0 },
      ],
    })
    expect(steps[0]).toEqual({ key: '0', blocks: [] })
    expect(steps[1]).toEqual({ key: '1', coordinates: { x: 0, y: 0 }, blocks: [] })
  })
})

describe('iconos de los objetos y monstruos', () => {
  const icon = (id: number): Media => ({
    id,
    alt: 'Pico de tofu',
    url: `/api/media/file/item-${id}.png`,
    filename: `item-${id}.png`,
    mimeType: 'image/png',
    width: 128,
    height: 128,
    updatedAt: '',
    createdAt: '',
  })

  it('cada objeto de Recompensas y Necesitarás lleva su icono importado; sin él, nada', () => {
    const withIcons: GuideDoc = {
      ...guide,
      quest: {
        id: 1976,
        rewards: {
          experience: 16380,
          items: [
            { item: { ...item(366, 'Pico de tofu'), image: icon(70) }, quantity: 1 },
            { item: item(373, 'Intestino de araknáusea'), quantity: 1 },
          ],
        },
      },
      summary: {
        needs: {
          items: [{ item: { ...item(737, 'Dofus Esmeralda'), image: icon(71) }, quantity: 1 }],
        },
      },
    }
    const header = questHeaderProps(withIcons, [])
    expect(header.rewards.items).toEqual([
      { item: { name: 'Intestino de araknáusea' }, quantity: 1 },
      {
        item: {
          name: 'Pico de tofu',
          icon: { src: '/api/media/file/item-70.png', width: 128, height: 128 },
        },
        quantity: 1,
      },
    ])
    expect(header.needs.items[0]!.item.icon).toMatchObject({ src: '/api/media/file/item-71.png' })
  })

  it('un bloque Combate da sus monstruos con nombre, cantidad e imagen', () => {
    const content = guideContent({
      ...guide,
      body: [
        {
          blockType: 'fight',
          id: 'f',
          monsters: [
            { monster: { id: 1, name: 'Ramán famélico', image: icon(72) }, quantity: 1 },
            { monster: { id: 2, name: 'Milirrata famélica' }, quantity: 2 },
            // Sin poblar: no hay nombre que enseñar.
            { monster: 3, quantity: 1 },
          ],
        },
        // Sin ningún monstruo poblado, el bloque no se pinta.
        { blockType: 'fight', id: 'g', monsters: [{ monster: 4, quantity: 1 }] },
      ],
    })
    expect(content.intro).toEqual([
      {
        kind: 'fight',
        key: 'f',
        monsters: [
          {
            item: {
              name: 'Ramán famélico',
              icon: { src: '/api/media/file/item-72.png', width: 128, height: 128 },
            },
            quantity: 1,
          },
          { item: { name: 'Milirrata famélica' }, quantity: 2 },
        ],
      },
    ])
  })
})

describe('nextQuestCard', () => {
  const art = {
    id: 9,
    alt: 'Kerubim en su casa',
    url: '/api/media/file/kerubim.webp',
    width: 1069,
    height: 769,
    updatedAt: '',
    createdAt: '',
  } satisfies Media
  const quest = {
    name: 'El cazador cazado',
    levelMin: 25,
    startPositions: [{ npcName: 'Kerubim Crepin', x: 3, y: -17 }],
  }
  const nextGuide = {
    title: 'El cazador cazado',
    slug: 'el-cazador-cazado',
    body: [
      { blockType: 'richText' as const, id: 'a', content: richText('Habla con Kerubim.') },
      {
        blockType: 'step' as const,
        id: 's',
        x: 3,
        y: -17,
        body: [{ blockType: 'image' as const, id: 'i', image: art }],
      },
    ],
  }

  it('la siguiente misión del logro: título, enlace, nivel, quién la da y dónde, y su primera captura', () => {
    expect(nextQuestCard(quest, nextGuide)).toEqual({
      title: 'El cazador cazado',
      href: '/el-cazador-cazado',
      level: 25,
      npc: 'Kerubim Crepin',
      coordinates: { x: 3, y: -17 },
      art: { src: '/api/media/file/kerubim.webp', width: 1069, height: 769 },
    })
  })

  describe('el arte es la primera imagen en orden de lectura', () => {
    const other = { ...art, id: 10, url: '/api/media/file/otra.webp' }
    const withUpload = (image: Media) => ({
      root: {
        type: 'root',
        format: '' as const,
        indent: 0,
        version: 1,
        direction: 'ltr' as const,
        children: [{ type: 'upload', version: 1, relationTo: 'media', value: image }],
      },
    })
    const card = (body: unknown[]) =>
      nextQuestCard(quest, { ...nextGuide, body: body as NextGuideDoc['body'] })?.art?.src

    it('una imagen subida dentro de un texto, antes de los bloques Imagen', () => {
      expect(
        card([
          { blockType: 'richText', id: 'a', content: withUpload(other) },
          { blockType: 'image', id: 'i', image: art },
        ]),
      ).toBe('/api/media/file/otra.webp')
    })

    it('una imagen dentro de un aviso', () => {
      expect(
        card([
          { blockType: 'callout', id: 'c', variant: 'tip', content: withUpload(other) },
          { blockType: 'image', id: 'i', image: art },
        ]),
      ).toBe('/api/media/file/otra.webp')
    })

    it('una imagen subida en el texto de un paso', () => {
      expect(
        card([
          {
            blockType: 'step',
            id: 's',
            body: [
              { blockType: 'richText', id: 't', content: withUpload(other) },
              { blockType: 'image', id: 'i', image: art },
            ],
          },
        ]),
      ).toBe('/api/media/file/otra.webp')
    })

    it('una imagen sin archivo no cuenta: pasa a la siguiente', () => {
      expect(
        card([
          { blockType: 'richText', id: 'a', content: withUpload({ ...other, url: null }) },
          { blockType: 'image', id: 'i', image: art },
        ]),
      ).toBe('/api/media/file/kerubim.webp')
    })
  })

  it('sin guía publicada no hay tarjeta; sin nivel, PNJ o captura, la tarjeta no los lleva', () => {
    expect(nextQuestCard(quest, null)).toBeUndefined()
    expect(nextQuestCard({ name: 'x' }, { title: 'X', slug: 'x', body: [] })).toEqual({
      title: 'X',
      href: '/x',
    })
  })
})

describe('guideStart', () => {
  it('el PNJ y las coordenadas del inicio que guarda el resumen', () => {
    const guide = {
      title: 'x',
      slug: 'x',
      summary: { startNpc: ' Hupe Esse ', startX: 7, startY: -19 },
    }
    expect(guideStart(guide)).toEqual({ npc: 'Hupe Esse', x: 7, y: -19 })
  })

  it('sin PNJ o sin las dos coordenadas, nada', () => {
    expect(
      guideStart({ title: 'x', slug: 'x', summary: { startX: 7, startY: -19 } }),
    ).toBeUndefined()
    expect(
      guideStart({ title: 'x', slug: 'x', summary: { startNpc: 'Hupe Esse', startX: 7 } }),
    ).toBeUndefined()
    expect(guideStart({ title: 'x', slug: 'x' })).toBeUndefined()
  })
})

describe('guideSeo', () => {
  it('usa el SEO de la guía cuando lo tiene', () => {
    expect(
      guideSeo({ ...guide, seo: { metaTitle: 'Seis pies', metaDescription: 'Cómo hacerla.' } }),
    ).toEqual({ title: 'Seis pies', description: 'Cómo hacerla.' })
  })

  it('sin SEO, lo arma con el título, el nivel y la experiencia, como el autorrelleno', () => {
    expect(guideSeo(guide)).toEqual({
      title: 'Seis pies bajo tierra: guía de la misión de Dofus',
      description:
        'Guía paso a paso de la misión Seis pies bajo tierra de Dofus, de nivel 20: ' +
        'requisitos, recompensas (16 380 XP) y cómo completarla.',
    })
  })
})
