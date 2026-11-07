import type { Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { gameImageKey, gameImageTargets, refreshGameImages } from '@/lib/dofusdb/game-images'
import type { Item, Media, Monster } from '@/payload-types'

import { startPayload } from './payload'

// Los iconos de objetos y las imágenes de monstruos: se importan a Media una sola vez, con
// su clave, y se enlazan desde el objeto o el monstruo. DofusDB se sustituye por una
// función que pinta un PNG de 128px.

const ITEM_IDS = [990_001, 990_002, 990_003]
const MONSTER_IDS = [990_101]

function imageFetcher() {
  const calls: string[] = []
  let failing = false
  const fetchImage = async (url: string) => {
    calls.push(url)
    if (failing) throw new Error('HTTP 503')
    return sharp({
      create: {
        width: 128,
        height: 128,
        channels: 4,
        background: { r: 90, g: 160, b: 40, alpha: 1 },
      },
    })
      .png()
      .toBuffer()
  }
  return {
    calls,
    fetchImage,
    fail: (value: boolean) => {
      failing = value
    },
  }
}

let payload: Payload
let items: Item[]
let monster: Monster

async function cleanUp() {
  await payload.delete({ collection: 'items', where: { dofusId: { in: ITEM_IDS } } })
  await payload.delete({ collection: 'monsters', where: { dofusId: { in: MONSTER_IDS } } })
  await payload.delete({ collection: 'media', where: { gameAsset: { like: 'dofusdb-' } } })
}

async function reload<T extends 'items' | 'monsters'>(collection: T, id: number) {
  return payload.findByID({ collection, id, depth: 1 })
}

async function imageMedia(): Promise<Media[]> {
  const { docs } = await payload.find({
    collection: 'media',
    where: { gameAsset: { like: 'dofusdb-' } },
    pagination: false,
    depth: 0,
  })
  return docs
}

beforeAll(async () => {
  payload = await startPayload()
})

afterAll(async () => {
  await cleanUp()
  await payload.destroy()
})

beforeEach(async () => {
  await cleanUp()
  // Los dos primeros comparten icono, como muchos objetos del juego; el tercero no tiene.
  items = await Promise.all(
    [
      { dofusId: ITEM_IDS[0]!, name: 'Pico de tofu', iconId: 47037 },
      { dofusId: ITEM_IDS[1]!, name: 'Pico de tofu dorado', iconId: 47037 },
      { dofusId: ITEM_IDS[2]!, name: 'Sin icono', iconId: null },
    ].map((data) => payload.create({ collection: 'items', data, depth: 0 })),
  )
  monster = await payload.create({
    collection: 'monsters',
    data: { dofusId: MONSTER_IDS[0]!, name: 'Ramán famélico', iconId: 241 },
    depth: 0,
  })
})

describe('refreshGameImages', () => {
  it('importa cada icono una vez, con su clave y un nombre como alt, y lo enlaza', async () => {
    const images = imageFetcher()
    const counts = await refreshGameImages(payload, {
      items: items.map((item) => item.id),
      monsters: [monster.id],
      fetchImage: images.fetchImage,
    })

    expect(counts).toEqual({ imported: 2, reused: 0, linked: 3, unchanged: 0, failed: 0 })
    expect(images.calls.sort()).toEqual([
      'https://api.dofusdb.fr/img/items/47037.png',
      'https://api.dofusdb.fr/img/monsters/241.png',
    ])
    const first = (await reload('items', items[0]!.id)).image as Media
    const second = (await reload('items', items[1]!.id)).image as Media
    expect(first.gameAsset).toBe(gameImageKey('item', 47037))
    // El alt es el nombre del primer objeto que lo usa; los dos comparten archivo.
    expect(['Pico de tofu', 'Pico de tofu dorado']).toContain(first.alt)
    expect([first.width, first.height]).toEqual([128, 128])
    expect(second.id).toBe(first.id)
    expect((await reload('items', items[2]!.id)).image).toBeFalsy()
    const image = (await reload('monsters', monster.id)).image as Media
    expect(image.gameAsset).toBe(gameImageKey('monster', 241))
  })

  it('repetirlo no descarga ni sube nada', async () => {
    const options = { items: items.map((item) => item.id), monsters: [monster.id] }
    await refreshGameImages(payload, { ...options, fetchImage: imageFetcher().fetchImage })
    const before = await imageMedia()

    const again = imageFetcher()
    const counts = await refreshGameImages(payload, { ...options, fetchImage: again.fetchImage })

    expect(counts).toEqual({ imported: 0, reused: 0, linked: 0, unchanged: 3, failed: 0 })
    expect(again.calls).toEqual([])
    expect((await imageMedia()).map((media) => media.id)).toEqual(before.map((media) => media.id))
  })

  it('reutiliza un archivo ya subido con su clave aunque el objeto no lo enlace', async () => {
    await refreshGameImages(payload, {
      items: [items[0]!.id],
      fetchImage: imageFetcher().fetchImage,
    })
    await payload.update({ collection: 'items', id: items[0]!.id, data: { image: null } })

    const again = imageFetcher()
    const counts = await refreshGameImages(payload, {
      items: [items[0]!.id],
      fetchImage: again.fetchImage,
    })

    expect(counts).toMatchObject({ imported: 0, reused: 1, linked: 1 })
    expect(again.calls).toEqual([])
  })

  it('si DofusDB falla, no enlaza nada y el siguiente refresco lo reintenta', async () => {
    const images = imageFetcher()
    images.fail(true)
    const counts = await refreshGameImages(payload, {
      monsters: [monster.id],
      fetchImage: images.fetchImage,
    })

    expect(counts).toMatchObject({ imported: 0, linked: 0, failed: 1 })
    expect((await reload('monsters', monster.id)).image).toBeFalsy()
    images.fail(false)
    expect(
      await refreshGameImages(payload, { monsters: [monster.id], fetchImage: images.fetchImage }),
    ).toMatchObject({ imported: 1, linked: 1 })
  })
})

describe('gameImageTargets', () => {
  it('los objetos de recompensas y requisitos de las misiones y los monstruos de sus requisitos', async () => {
    const quest = await payload.create({
      collection: 'quests',
      data: {
        dofusId: 990_201,
        name: 'Misión de prueba de imágenes',
        rewards: { items: [{ item: items[0]!.id, quantity: 1 }] },
        needs: {
          items: [{ item: items[1]!.id, quantity: 2 }],
          monsters: [{ monster: monster.id, quantity: 3 }],
        },
      },
      depth: 0,
    })
    try {
      const targets = await gameImageTargets(payload)
      expect(targets.items).toEqual(expect.arrayContaining([items[0]!.id, items[1]!.id]))
      expect(targets.monsters).toContain(monster.id)
      expect(targets.items).not.toContain(items[2]!.id)
    } finally {
      await payload.delete({ collection: 'quests', id: quest.id })
    }
  })

  it('los objetos de las recompensas de los logros', async () => {
    const achievement = await payload.create({
      collection: 'achievements',
      data: {
        dofusId: 990_301,
        name: 'Logro de prueba de imágenes',
        rewards: { items: [{ item: items[2]!.id, quantity: 1 }] },
      },
      depth: 0,
    })
    try {
      expect((await gameImageTargets(payload)).items).toContain(items[2]!.id)
    } finally {
      await payload.delete({ collection: 'achievements', id: achievement.id })
    }
  })

  it('los objetos que Torre pone en las recompensas de una página de logro, borradores incluidos', async () => {
    const achievement = await payload.create({
      collection: 'achievements',
      data: { dofusId: 990_302, name: 'Logro con página de prueba' },
      depth: 0,
    })
    const page = await payload.create({
      collection: 'achievement-pages',
      data: {
        achievement: achievement.id,
        name: 'Página de prueba de imágenes',
        slug: 'pagina-prueba-imagenes',
        state: 'preparing',
        rewards: { items: [{ item: items[1]!.id, quantity: 1 }] },
      },
      draft: true,
      depth: 0,
    })
    try {
      expect((await gameImageTargets(payload)).items).toContain(items[1]!.id)
    } finally {
      await payload.delete({ collection: 'achievement-pages', id: page.id })
      await payload.delete({ collection: 'achievements', id: achievement.id })
    }
  })

  it('el monstruo que representa a un metalogro', async () => {
    const group = await payload.create({
      collection: 'achievement-groups',
      data: {
        name: 'Metalogro de prueba de imágenes',
        slug: 'metalogro-prueba-imagenes',
        state: 'preparing',
        representative: { relationTo: 'monsters', value: monster.id },
      },
      depth: 0,
    })
    try {
      expect((await gameImageTargets(payload)).monsters).toContain(monster.id)
    } finally {
      await payload.delete({ collection: 'achievement-groups', id: group.id })
    }
  })
})
