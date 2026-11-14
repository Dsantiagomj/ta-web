import { APIError, type CollectionSlug, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { User } from '@/payload-types'

import { createPanelUser, startPayload, tinyPng } from './payload'

// Borrar algo que sale en una guía deja un hueco (docs/research/backlog.md, A-17): el panel
// se niega, dice en cuántas guías sale y las nombra. Lo que no sale en ninguna se borra.

let payload: Payload
let admin: User

const PREFIX = 'prueba-referencias'
const ACHIEVEMENT_IDS = [990_701, 990_702, 990_703, 990_704]

async function cleanUp() {
  // Primero lo que apunta a otros, para que nada quede referenciado.
  for (const collection of [
    'checklists',
    'dofus-guides',
    'achievement-pages',
    'achievement-groups',
    'quest-guides',
  ] as const) {
    await payload.delete({ collection, where: { slug: { like: PREFIX } } })
  }
  await payload.delete({ collection: 'achievements', where: { dofusId: { in: ACHIEVEMENT_IDS } } })
  await payload.delete({ collection: 'media', where: { alt: { like: PREFIX } } })
}

beforeAll(async () => {
  payload = await startPayload()
  await cleanUp()
  admin = await createPanelUser(payload, 'admin')
})

afterAll(async () => {
  await cleanUp()
  await payload.destroy()
})

let counter = 0
const slug = () => `${PREFIX}-${++counter}`

const image = async (alt = 'imagen') =>
  payload.create({ collection: 'media', data: { alt: `${PREFIX} ${alt}` }, file: tinyPng() })

/** Una fila de una lista de Lexical. */
const listItem = (children: unknown[]) => ({
  type: 'listitem',
  value: 1,
  format: '',
  indent: 0,
  version: 1,
  direction: null,
  children,
})

/** Un texto de Lexical con los nodos que se le pasen. */
const lexical = (children: unknown[]) => ({
  root: { type: 'root', format: '', indent: 0, version: 1, direction: null, children },
})

async function refusal(collection: CollectionSlug, id: number, user: User = admin) {
  const error = await payload.delete({ collection, id, user, overrideAccess: false }).then(
    () => null,
    (caught: unknown) => caught,
  )
  expect(error, 'el borrado tenía que fallar').toBeInstanceOf(APIError)
  // Sigue ahí.
  expect((await payload.count({ collection, where: { id: { equals: id } } })).totalDocs).toBe(1)
  return (error as APIError).message
}

async function deletes(collection: CollectionSlug, id: number) {
  await payload.delete({ collection, id, user: admin, overrideAccess: false })
  expect((await payload.count({ collection, where: { id: { equals: id } } })).totalDocs).toBe(0)
}

describe('una imagen', () => {
  it('que no sale en ninguna guía se borra', async () => {
    const media = await image()
    await deletes('media', media.id)
  })

  it('que sale en varias guías no se borra, y el mensaje cuenta y nombra las guías', async () => {
    const media = await image()
    await payload.create({
      collection: 'quest-guides',
      data: {
        title: 'Aprendizaje: Escudero',
        slug: slug(),
        _status: 'published',
        body: [{ blockType: 'image', image: media.id }],
      },
    })
    await payload.create({
      collection: 'quest-guides',
      data: {
        title: 'Aprendizaje: Caballero',
        slug: slug(),
        _status: 'published',
        // Dentro de un paso.
        body: [{ blockType: 'step', body: [{ blockType: 'image', image: media.id }] }],
      },
    })
    await payload.create({
      collection: 'dofus-guides',
      data: {
        name: 'Dofus Ocre',
        slug: slug(),
        state: 'preparing',
        order: 901,
        videoPoster: media.id,
      },
    })
    await payload.create({
      collection: 'checklists',
      data: {
        name: 'Checklist del Nebuloso',
        slug: slug(),
        state: 'preparing',
        order: 901,
        steps: [{ segments: [{ kind: 'plain', text: 'Paso' }], icon: media.id }],
      },
    })

    const message = await refusal('media', media.id)
    expect(message).toMatch(/^Esta imagen sale en 4 guías: /)
    for (const name of [
      'Aprendizaje: Escudero',
      'Aprendizaje: Caballero',
      'Dofus Ocre',
      'Checklist del Nebuloso',
    ]) {
      expect(message).toContain(`«${name}»`)
    }
  })

  it('que sale en la entrada de una página de logro, como captura o portada, no se borra', async () => {
    const screenshot = await image('captura')
    const poster = await image('portada')
    const achievement = await payload.create({
      collection: 'achievements',
      data: { dofusId: ACHIEVEMENT_IDS[0]!, name: 'La ocasión hace al ladrón' },
    })
    await payload.create({
      collection: 'achievement-pages',
      data: {
        achievement: achievement.id,
        name: 'La ocasión hace al ladrón',
        slug: slug(),
        state: 'preparing',
        intro: lexical([
          {
            type: 'upload',
            version: 3,
            format: '',
            id: 'a1',
            fields: null,
            relationTo: 'media',
            value: screenshot.id,
          },
        ]),
        outro: lexical([
          {
            type: 'block',
            version: 2,
            format: '',
            fields: {
              id: 'b1',
              blockName: '',
              blockType: 'proseVideo',
              url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              title: 'Vídeo',
              poster: poster.id,
            },
          },
        ]),
      } as never,
    })

    expect(await refusal('media', screenshot.id)).toBe(
      'Esta imagen sale en 1 guía: «La ocasión hace al ladrón». Quítala de ella antes de borrarla.',
    )
    expect(await refusal('media', poster.id)).toMatch(/^Esta imagen sale en 1 guía: /)
  })

  it('que solo sale en un borrador sin publicar tampoco se borra', async () => {
    const media = await image()
    const guide = await payload.create({
      collection: 'quest-guides',
      data: { title: 'Guía publicada', slug: slug(), _status: 'published' },
    })
    await payload.update({
      collection: 'quest-guides',
      id: guide.id,
      data: { body: [{ blockType: 'image', image: media.id }] },
      draft: true,
    })

    expect(await refusal('media', media.id)).toContain('«Guía publicada»')
  })

  it('nombra diez guías como mucho y cuenta el resto', async () => {
    const media = await image()
    for (let index = 1; index <= 12; index++) {
      await payload.create({
        collection: 'quest-guides',
        data: {
          title: `Guía ${String(index).padStart(2, '0')}`,
          slug: slug(),
          body: [{ blockType: 'image', image: media.id }],
        },
      })
    }
    const message = await refusal('media', media.id)
    expect(message).toMatch(/^Esta imagen sale en 12 guías: /)
    expect(message).toContain('y 2 más')
  })
})

describe('una imagen dentro del texto', () => {
  it('una captura dentro de una lista o una portada dentro de una cita también cuentan', async () => {
    const screenshot = await image('captura anidada')
    const poster = await image('portada anidada')
    const achievement = await payload.create({
      collection: 'achievements',
      data: { dofusId: ACHIEVEMENT_IDS[3]!, name: 'Anidado' },
    })
    const upload = {
      type: 'upload',
      version: 3,
      format: '',
      id: 'n1',
      fields: null,
      relationTo: 'media',
      value: screenshot.id,
    }
    const video = {
      type: 'block',
      version: 2,
      format: '',
      fields: {
        id: 'n2',
        blockName: '',
        blockType: 'proseVideo',
        url: 'https://youtu.be/dQw4w9WgXcQ',
        title: 'Vídeo',
        poster: poster.id,
      },
    }
    await payload.create({
      collection: 'achievement-pages',
      data: {
        achievement: achievement.id,
        name: 'Logro anidado',
        slug: slug(),
        state: 'preparing',
        intro: lexical([
          {
            type: 'list',
            listType: 'bullet',
            tag: 'ul',
            start: 1,
            format: '',
            indent: 0,
            version: 1,
            direction: null,
            children: [
              listItem([
                {
                  type: 'list',
                  listType: 'bullet',
                  tag: 'ul',
                  start: 1,
                  format: '',
                  indent: 0,
                  version: 1,
                  direction: null,
                  children: [listItem([upload])],
                },
              ]),
            ],
          },
        ]),
        outro: lexical([
          { type: 'quote', format: '', indent: 0, version: 1, direction: null, children: [video] },
        ]),
      } as never,
    })

    expect(await refusal('media', screenshot.id)).toContain('«Logro anidado»')
    expect(await refusal('media', poster.id)).toContain('«Logro anidado»')
  })
})

describe('el arte del juego', () => {
  it('una imagen que trajo DofusDB no se borra desde el panel', async () => {
    const art = await payload.create({
      collection: 'media',
      data: { alt: `${PREFIX} render`, gameAsset: `${PREFIX}-npc-render` },
      file: tinyPng(),
    })
    expect(await refusal('media', art.id)).toBe(
      'Esta imagen es arte del juego: la trae DofusDB y la usan sus datos (misiones, objetos, ' +
        'monstruos, PNJ y logros). No se borra desde el panel.',
    )
  })
})

describe('lo que enlazan las guías', () => {
  it('una página de logro que sale en una guía de Dofus no se borra', async () => {
    const achievement = await payload.create({
      collection: 'achievements',
      data: { dofusId: ACHIEVEMENT_IDS[1]!, name: 'Un comienzo ejemplar' },
    })
    const page = await payload.create({
      collection: 'achievement-pages',
      data: {
        achievement: achievement.id,
        name: 'Un comienzo ejemplar',
        slug: slug(),
        state: 'preparing',
      },
    })
    await payload.create({
      collection: 'dofus-guides',
      data: {
        name: 'Dofus Plateado',
        slug: slug(),
        state: 'preparing',
        order: 902,
        parts: [
          {
            blockType: 'dofusMetalogro',
            name: 'Metalogro',
            achievements: [{ achievement: page.id }],
          },
        ],
      },
    })

    expect(await refusal('achievement-pages', page.id)).toBe(
      'Esta página de logro sale en 1 guía: «Dofus Plateado». Quítala de ella antes de borrarla.',
    )
  })

  it('una guía de misión que sale en una guía de Dofus o en un metalogro no se borra', async () => {
    const guide = await payload.create({
      collection: 'quest-guides',
      data: { title: 'La misión del cacao', slug: slug() },
    })
    await payload.create({
      collection: 'dofus-guides',
      data: {
        name: 'Dofus Cawotte',
        slug: slug(),
        state: 'preparing',
        order: 903,
        parts: [{ blockType: 'dofusQuest', guide: guide.id }],
      },
    })
    await payload.create({
      collection: 'achievement-groups',
      data: { name: 'Alineamiento', slug: slug(), state: 'preparing', guides: [guide.id] },
    })

    const message = await refusal('quest-guides', guide.id)
    expect(message).toMatch(/^Esta guía de misión sale en 2 guías: /)
    expect(message).toContain('«Dofus Cawotte»')
    expect(message).toContain('«Alineamiento»')
  })

  it('a un editor que borra una guía suya que sale en otra le dice lo mismo', async () => {
    const editor = await createPanelUser(payload, 'editor')
    const guide = await payload.create({
      collection: 'quest-guides',
      data: { title: 'La guía del editor', slug: slug() },
      user: editor,
      overrideAccess: false,
    })
    await payload.create({
      collection: 'dofus-guides',
      data: {
        name: 'Dofus Turquesa',
        slug: slug(),
        state: 'preparing',
        order: 905,
        parts: [{ blockType: 'dofusQuest', guide: guide.id }],
      },
    })
    expect(await refusal('quest-guides', guide.id, editor)).toBe(
      'Esta guía de misión sale en 1 guía: «Dofus Turquesa». Quítala de ella antes de borrarla.',
    )
  })

  it('un metalogro con páginas de logro y una guía de Dofus con checklist no se borran', async () => {
    const group = await payload.create({
      collection: 'achievement-groups',
      data: { name: 'Metalogro de Astrub', slug: slug(), state: 'preparing' },
    })
    const achievement = await payload.create({
      collection: 'achievements',
      data: { dofusId: ACHIEVEMENT_IDS[2]!, name: 'Astrub' },
    })
    await payload.create({
      collection: 'achievement-pages',
      data: {
        achievement: achievement.id,
        name: 'Astrub',
        slug: slug(),
        state: 'preparing',
        group: group.id,
      },
    })
    expect(await refusal('achievement-groups', group.id)).toMatch(
      /^Este metalogro sale en 1 guía: «Astrub»/,
    )
    await payload.delete({
      collection: 'achievement-pages',
      where: { group: { equals: group.id } },
    })
    await payload.delete({ collection: 'achievements', id: achievement.id })
    await deletes('achievement-groups', group.id)

    const dofus = await payload.create({
      collection: 'dofus-guides',
      data: { name: 'Dofus Esmeralda', slug: slug(), state: 'preparing', order: 904 },
    })
    await payload.create({
      collection: 'checklists',
      data: {
        name: 'Checklist Esmeralda',
        slug: slug(),
        state: 'preparing',
        order: 904,
        dofusGuide: dofus.id,
      },
    })
    expect(await refusal('dofus-guides', dofus.id)).toMatch(
      /^Esta guía de Dofus sale en 1 guía: «Checklist Esmeralda»/,
    )
  })
})
