import { describe, expect, it } from 'vitest'

import type { Media } from '@/payload-types'
import {
  botinProps,
  guideBlocks,
  guideLevel,
  guideSeo,
  prerequisiteQuestIds,
  ribbonProps,
  type GuideDoc,
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

describe('ribbonProps', () => {
  it('Empieza con el PNJ y la posición de inicio', () => {
    expect(ribbonProps(guide, []).start).toEqual({ npc: 'Hupe Esse', x: 7, y: -19 })
  })

  it('sin PNJ o sin las dos coordenadas no hay Empieza', () => {
    const noY = { ...guide, summary: { ...guide.summary, startY: null } }
    expect(ribbonProps(noY, []).start).toBeUndefined()
    const noNpc = { ...guide, summary: { ...guide.summary, startNpc: ' ' } }
    expect(ribbonProps(noNpc, []).start).toBeUndefined()
  })

  it('Requiere: una línea por prerrequisito, como las escribe el resumen', () => {
    expect(ribbonProps(guide, []).requires).toEqual([
      { label: 'Nivel mínimo 20.' },
      { label: 'Esto hace aguas.' },
    ])
  })

  it('un prerrequisito con guía publicada es un enlace a ella', () => {
    const linked = [{ questId: 1975, slug: 'esto-hace-aguas' }]
    expect(ribbonProps(guide, linked).requires).toEqual([
      { label: 'Nivel mínimo 20.' },
      { label: 'Esto hace aguas.', href: '/esto-hace-aguas' },
    ])
  })

  it('Necesitarás: los objetos sin los de misión, y las notas línea a línea', () => {
    expect(ribbonProps(guide, []).needs).toEqual({
      items: [{ item: { name: 'Dofus Esmeralda' }, quantity: 1 }],
      notes: ['1 x Combate (solo).'],
    })
  })

  it('sin texto de recompensas, resume XP, kamas y cuántos objetos hay en el Botín', () => {
    expect(ribbonProps(guide, []).reward).toEqual({ xp: 16380, kamas: 390, items: 2 })
  })

  it('el texto de recompensas de la guía manda sobre DofusDB, en una línea', () => {
    const edited = {
      ...guide,
      summary: { ...guide.summary, rewards: '16 380 XP.\n390 kamas.\n1 x Ala de tofu.' },
    }
    expect(ribbonProps(edited, []).reward).toBe('16 380 XP · 390 kamas · 1 x Ala de tofu')
    const noQuest = { ...edited, quest: null }
    expect(ribbonProps(noQuest, []).reward).toBe('16 380 XP · 390 kamas · 1 x Ala de tofu')
  })

  it('sin resumen ni misión, nada', () => {
    expect(ribbonProps({ ...guide, quest: null, summary: {} }, [])).toEqual({
      start: undefined,
      requires: [],
      needs: { items: [], notes: [] },
      reward: undefined,
    })
  })
})

describe('prerequisiteQuestIds', () => {
  it('las misiones previas pobladas, para buscar sus guías', () => {
    expect(prerequisiteQuestIds(guide)).toEqual([1975])
    expect(prerequisiteQuestIds({ ...guide, quest: null })).toEqual([])
  })
})

describe('botinProps', () => {
  it('XP, kamas y los objetos en el orden de Torre, al revés que DofusDB', () => {
    expect(botinProps(guide)).toEqual({
      xp: 16380,
      kamas: 390,
      items: [
        { item: { name: 'Pico de tofu' }, quantity: 2 },
        { item: { name: 'Intestino de araknáusea' }, quantity: 1 },
      ],
    })
  })

  it('sin misión ni recompensas escritas no hay Botín', () => {
    expect(botinProps({ ...guide, quest: null })).toBeNull()
  })

  it('sin misión, las recompensas que escribió Torre, línea a línea y sin fichas', () => {
    const noQuest = {
      ...guide,
      quest: null,
      summary: { rewards: '2 000 XP.\n\n1 x Pico de tofu.\n' },
    }
    expect(botinProps(noQuest)).toEqual({ items: [], notes: ['2 000 XP.', '1 x Pico de tofu.'] })
  })

  it('con misión, las fichas de DofusDB aunque Torre haya escrito el texto', () => {
    const edited = { ...guide, summary: { ...guide.summary, rewards: '16 380 XP.' } }
    expect(botinProps(edited)).toMatchObject({ xp: 16380, kamas: 390 })
    expect(botinProps(edited)).not.toHaveProperty('notes')
  })
})

describe('guideBlocks', () => {
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
