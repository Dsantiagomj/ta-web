import sharp from 'sharp'
import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { zoneBackgroundResponse } from '@/endpoints/zone-background'
import { refreshSubAreas } from '@/lib/dofusdb/refresh-subareas'
import { fillZoneBackground, type ZoneSource } from '@/lib/zones/fill'
import { readZoneBackground } from '@/lib/zones/read'
import { zoneRenderKey } from '@/lib/zones/background'
import type { User } from '@/payload-types'

import { createPanelUser, startPayload } from './payload'

// El fondo de zona: el botón del panel (solo administradores) trae el render de un mapa de
// la subzona, sin la marca de DofusDB, a Media; el refresco de datos del juego nunca lo
// toca; y una guía o un logro lo toman de la subzona de su misión. DofusDB va simulado.

const BASE = 995_000
const SUBAREA = BASE + 95
const START_MAP = BASE + 7001
const OUTDOOR_MAP = BASE + 7002

let payload: Payload
let admin: User
let editor: User
let subAreaId: number

/** Un JPEG de 1910 × 970, como los renders de DofusDB. */
async function render(): Promise<Buffer> {
  return sharp({
    create: { width: 1910, height: 970, channels: 3, background: { r: 90, g: 160, b: 70 } },
  })
    .jpeg()
    .toBuffer()
}

function source(calls: { renders: number[] } = { renders: [] }): ZoneSource {
  return {
    maps: async () => [
      { id: BASE + 7000, outdoor: false, worldMap: -1, posX: 0, posY: 0 },
      { id: START_MAP, outdoor: true, worldMap: 1, posX: 7, posY: -19 },
      { id: OUTDOOR_MAP, outdoor: true, worldMap: 1, posX: 4, posY: -18 },
    ],
    render: async (mapId) => {
      calls.renders.push(mapId)
      return render()
    },
  }
}

async function cleanup() {
  await payload.delete({ collection: 'quest-guides', where: { slug: { like: 'zona-prueba' } } })
  await payload.delete({ collection: 'quests', where: { dofusId: { greater_than: BASE } } })
  await payload.update({
    collection: 'subareas',
    where: { dofusId: { greater_than: BASE } },
    data: { background: null, backgroundMapId: null },
  })
  await payload.delete({
    collection: 'media',
    where: { gameAsset: { in: [START_MAP, OUTDOOR_MAP].map(zoneRenderKey) } },
  })
}

beforeAll(async () => {
  payload = await startPayload()
  await refreshSubAreas(payload, {
    subAreas: [{ id: SUBAREA, name: { es: 'Ciudad de prueba' }, areaId: BASE + 18 }],
    areas: [{ id: BASE + 18, name: { es: 'Astrub de prueba' } }],
  })
  await cleanup()
  subAreaId = (
    await payload.find({ collection: 'subareas', where: { dofusId: { equals: SUBAREA } } })
  ).docs[0]!.id
  admin = await createPanelUser(payload, 'admin')
  editor = await createPanelUser(payload, 'editor')
})

afterAll(async () => {
  await cleanup()
  await payload.destroy()
})

describe('POST /api/subareas/:id/zone-background', () => {
  const call = (user: unknown, body: unknown, calls?: { renders: number[] }) =>
    zoneBackgroundResponse({
      user,
      id: String(subAreaId),
      body,
      fill: (id, mapId) => fillZoneBackground(payload, id, { mapId, source: source(calls) }),
    })

  it('sin sesión no trae nada', async () => {
    const calls = { renders: [] as number[] }
    const response = await call(null, {}, calls)
    expect(response.status).toBe(401)
    expect(calls.renders).toEqual([])
  })

  it('una cuenta de editor no trae nada', async () => {
    const calls = { renders: [] as number[] }
    const response = await call(editor, {}, calls)
    expect(response.status).toBe(403)
    expect(calls.renders).toEqual([])
  })

  it('rechaza un mapa que no es un número', async () => {
    expect((await call(admin, { mapId: 'abc' })).status).toBe(400)
  })

  it('un administrador trae el render recortado y lo guarda como fondo de la subzona', async () => {
    const response = await call(admin, {})
    expect(response.status).toBe(200)
    const body = (await response.json()) as { mapId: number; mediaId: number }
    // Sin guía publicada en la subzona: el exterior más cercano al centro.
    expect(body.mapId).toBe(START_MAP)

    const subArea = await payload.findByID({ collection: 'subareas', id: subAreaId, depth: 1 })
    expect(subArea.backgroundMapId).toBe(START_MAP)
    const media = subArea.background as {
      id: number
      alt: string
      width: number
      height: number
      gameAsset: string
    }
    expect(media.id).toBe(body.mediaId)
    expect(media.alt).toBe('Paisaje de Ciudad de prueba, en Astrub de prueba')
    expect(media.gameAsset).toBe(zoneRenderKey(START_MAP))
    // Sin la marca de DofusDB: más estrecho y más bajo que el render.
    expect(media.width).toBeLessThan(1910)
    expect(media.height).toBeLessThan(970)
  })

  it('con otro mapa, trae ese; repetirlo no vuelve a descargar ni duplica', async () => {
    const calls = { renders: [] as number[] }
    const first = (await (await call(admin, { mapId: OUTDOOR_MAP }, calls)).json()) as {
      mediaId: number
    }
    const again = (await (await call(admin, { mapId: OUTDOOR_MAP }, calls)).json()) as {
      mediaId: number
    }
    expect(calls.renders).toEqual([OUTDOOR_MAP])
    expect(again.mediaId).toBe(first.mediaId)
    const subArea = await payload.findByID({ collection: 'subareas', id: subAreaId, depth: 0 })
    expect(subArea.backgroundMapId).toBe(OUTDOOR_MAP)
  })
})

describe('el refresco de datos del juego', () => {
  it('cambia el nombre de la subzona sin tocar su fondo', async () => {
    const before = await payload.findByID({ collection: 'subareas', id: subAreaId, depth: 0 })
    expect(before.background).not.toBeNull()

    const counts = await refreshSubAreas(payload, {
      subAreas: [{ id: SUBAREA, name: { es: 'Ciudad renombrada' }, areaId: BASE + 18 }],
      areas: [{ id: BASE + 18, name: { es: 'Astrub de prueba' } }],
    })

    expect(counts.updated).toBe(1)
    const after = await payload.findByID({ collection: 'subareas', id: subAreaId, depth: 0 })
    expect(after.name).toBe('Ciudad renombrada')
    expect(after.background).toBe(before.background)
    expect(after.backgroundMapId).toBe(before.backgroundMapId)
  })

  it('una cuenta del panel solo cambia el fondo', async () => {
    await payload.update({
      collection: 'subareas',
      id: subAreaId,
      data: { name: 'Nombre a mano', backgroundMapId: START_MAP },
      user: admin,
      overrideAccess: false,
    })
    const after = await payload.findByID({ collection: 'subareas', id: subAreaId, depth: 0 })
    expect(after.name).toBe('Ciudad renombrada')
    expect(after.backgroundMapId).toBe(START_MAP)
  })

  it('una cuenta de editor no la edita', async () => {
    await expect(
      payload.update({
        collection: 'subareas',
        id: subAreaId,
        data: { backgroundMapId: OUTDOOR_MAP },
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })
})

describe('el fondo de una página', () => {
  it('una guía publicada en la subzona elige el mapa donde empieza su misión', async () => {
    await payload.update({
      collection: 'subareas',
      id: subAreaId,
      data: { background: null, backgroundMapId: null },
    })
    const quest = await payload.create({
      collection: 'quests',
      data: {
        dofusId: BASE + 1,
        name: 'Misión de prueba',
        startPositions: [{ npcId: 1, mapId: OUTDOOR_MAP, subAreaId: SUBAREA }],
      },
    })
    await payload.create({
      collection: 'quest-guides',
      data: { title: 'Guía de zona', slug: 'zona-prueba', quest: quest.id, _status: 'published' },
    })

    const result = await fillZoneBackground(payload, subAreaId, { source: source() })
    expect(result).toMatchObject({ status: 'filled', mapId: OUTDOOR_MAP })
  })

  it('una misión toma el fondo de la subzona de su mapa de inicio', async () => {
    const quest = (
      await payload.find({ collection: 'quests', where: { dofusId: { equals: BASE + 1 } } })
    ).docs[0]!
    const image = await readZoneBackground(payload, { quest })
    expect(image?.src).toMatch(/\.webp$/)
    expect(image?.width).toBeGreaterThan(1000)
  })

  it('la imagen propia de la página gana a la de la zona', async () => {
    const override = await payload.findByID({
      collection: 'media',
      id: (await payload.findByID({ collection: 'subareas', id: subAreaId, depth: 0 }))
        .background as number,
    })
    const image = await readZoneBackground(payload, { override, quest: null })
    expect(image?.src).toBeTruthy()
  })

  it('sin subzona con fondo no hay fondo', async () => {
    expect(
      await readZoneBackground(payload, {
        quest: { startPositions: [{ subAreaId: BASE + 999 }], stages: [] },
      }),
    ).toBeNull()
    expect(await readZoneBackground(payload, { quest: null })).toBeNull()
  })
})
