import type { Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { npcRenderKey } from '@/lib/dofusdb/npc-render'
import { refreshNpcs } from '@/lib/dofusdb/refresh-npcs'
import type { RawNpc } from '@/lib/dofusdb/types'
import type { Media, Npc } from '@/payload-types'

import { startPayload } from './payload'

// El refresco de PNJ: guarda nombre y look e importa sus dos renders a Media una sola vez.
// El renderizador de DofusDB se sustituye por una función que pinta un PNG falso.

const HUPE_ESSE: RawNpc = {
  id: 4412,
  name: { es: 'Hupe Esse', fr: 'Hupe Esse' },
  look: '{74||3=12993798,4=16707303}',
}
const SIN_LOOK: RawNpc = { id: 4413, name: { es: 'Sin look' }, look: null }

/** Un render como los de DofusDB: 1000×1000 transparente con la figura en el centro. */
async function fakeRender(): Promise<Buffer> {
  const figure = await sharp({
    create: {
      width: 200,
      height: 400,
      channels: 4,
      background: { r: 200, g: 90, b: 40, alpha: 1 },
    },
  })
    .png()
    .toBuffer()
  return sharp({
    create: { width: 1000, height: 1000, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: figure, left: 400, top: 300 }])
    .png()
    .toBuffer()
}

function renderFetcher() {
  const calls: string[] = []
  let failing = false
  const fetchRender = async (url: string) => {
    calls.push(url)
    if (failing) throw new Error('HTTP 503')
    return fakeRender()
  }
  return {
    calls,
    fetchRender,
    fail: (value: boolean) => {
      failing = value
    },
  }
}

let payload: Payload

async function npc(dofusId: number): Promise<Npc | undefined> {
  const { docs } = await payload.find({
    collection: 'npcs',
    where: { dofusId: { equals: dofusId } },
    depth: 1,
  })
  return docs[0]
}

async function renderMedia(): Promise<Media[]> {
  const { docs } = await payload.find({
    collection: 'media',
    where: { gameAsset: { like: 'dofusdb-npc-render:' } },
    pagination: false,
    depth: 0,
  })
  return docs
}

async function cleanUp() {
  await payload.delete({ collection: 'npcs', where: { dofusId: { in: [4412, 4413] } } })
  await payload.delete({ collection: 'media', where: { gameAsset: { exists: true } } })
}

beforeAll(async () => {
  payload = await startPayload()
})

afterAll(async () => {
  await cleanUp()
  await payload.destroy()
})

beforeEach(cleanUp)

describe('refreshNpcs', () => {
  it('guarda el PNJ e importa sus renders a Media, recortados y con su nombre como alt', async () => {
    const renders = renderFetcher()
    const counts = await refreshNpcs(payload, [HUPE_ESSE], { fetchRender: renders.fetchRender })

    expect(counts).toEqual({
      npcs: { created: 1, updated: 0, unchanged: 0 },
      renders: { imported: 2, reused: 0, failed: 0 },
    })
    expect(renders.calls).toHaveLength(2)
    expect(renders.calls[0]).toMatch(/\/full\/1\/300_300\.png$/)
    expect(renders.calls[1]).toMatch(/\/full\/3\/300_300\.png$/)

    const saved = await npc(4412)
    expect(saved).toMatchObject({ name: 'Hupe Esse', look: HUPE_ESSE.look })
    const right = saved?.renderRight as Media
    const left = saved?.renderLeft as Media
    expect(right.gameAsset).toBe(npcRenderKey(4412, 'right', HUPE_ESSE.look!))
    expect(left.gameAsset).toBe(npcRenderKey(4412, 'left', HUPE_ESSE.look!))
    expect(right.alt).toBe('Hupe Esse')
    // Sin el margen transparente: la figura de 200×400.
    expect([right.width, right.height]).toEqual([200, 400])
  })

  it('repetirlo con los mismos datos no descarga ni sube nada', async () => {
    const renders = renderFetcher()
    await refreshNpcs(payload, [HUPE_ESSE], { fetchRender: renders.fetchRender })
    const before = await renderMedia()

    const again = renderFetcher()
    const counts = await refreshNpcs(payload, [HUPE_ESSE], { fetchRender: again.fetchRender })

    expect(counts).toEqual({
      npcs: { created: 0, updated: 0, unchanged: 1 },
      renders: { imported: 0, reused: 0, failed: 0 },
    })
    expect(again.calls).toEqual([])
    expect((await renderMedia()).map((media) => media.id)).toEqual(before.map((media) => media.id))
  })

  it('reutiliza un render ya subido aunque el PNJ no lo enlace, sin duplicarlo', async () => {
    const renders = renderFetcher()
    await refreshNpcs(payload, [HUPE_ESSE], { fetchRender: renders.fetchRender })
    const before = await renderMedia()
    // Como si el refresco anterior se hubiera cortado tras subir los archivos.
    await payload.delete({ collection: 'npcs', where: { dofusId: { equals: 4412 } } })

    const again = renderFetcher()
    const counts = await refreshNpcs(payload, [HUPE_ESSE], { fetchRender: again.fetchRender })

    expect(counts.renders).toEqual({ imported: 0, reused: 2, failed: 0 })
    expect(again.calls).toEqual([])
    expect((await renderMedia()).length).toBe(before.length)
    expect((await npc(4412))?.renderRight).toBeTruthy()
  })

  // Los renders viejos siguen en Media: un editor puede haberlos usado en una guía, y
  // borrarlos rompería esa imagen.
  it('con un look nuevo sube los renders nuevos y conserva los viejos', async () => {
    const renders = renderFetcher()
    await refreshNpcs(payload, [HUPE_ESSE], { fetchRender: renders.fetchRender })
    const old = await renderMedia()

    const changed = { ...HUPE_ESSE, look: '{74||3=1,4=2}' }
    const counts = await refreshNpcs(payload, [changed], { fetchRender: renders.fetchRender })

    expect(counts).toMatchObject({
      npcs: { updated: 1 },
      renders: { imported: 2, reused: 0, failed: 0 },
    })
    const now = await renderMedia()
    expect(now).toHaveLength(4)
    expect(now.map((media) => media.id)).toEqual(expect.arrayContaining(old.map(({ id }) => id)))
    expect(((await npc(4412))?.renderRight as Media).gameAsset).toBe(
      npcRenderKey(4412, 'right', changed.look),
    )
  })

  it('sin look guarda el PNJ sin renders y no pide nada', async () => {
    const renders = renderFetcher()
    const counts = await refreshNpcs(payload, [SIN_LOOK], { fetchRender: renders.fetchRender })

    expect(counts.renders).toEqual({ imported: 0, reused: 0, failed: 0 })
    expect(renders.calls).toEqual([])
    const saved = await npc(4413)
    expect(saved?.renderRight ?? null).toBeNull()
    expect(saved?.renderLeft ?? null).toBeNull()
  })

  it('si el renderizador falla, guarda el PNJ sin render y lo reintenta la próxima vez', async () => {
    const renders = renderFetcher()
    renders.fail(true)
    const failed = await refreshNpcs(payload, [HUPE_ESSE], {
      fetchRender: renders.fetchRender,
      log: () => {},
    })
    expect(failed.renders).toEqual({ imported: 0, reused: 0, failed: 2 })
    expect((await npc(4412))?.renderRight ?? null).toBeNull()

    renders.fail(false)
    const retried = await refreshNpcs(payload, [HUPE_ESSE], { fetchRender: renders.fetchRender })
    expect(retried.renders).toEqual({ imported: 2, reused: 0, failed: 0 })
    expect((await npc(4412))?.renderRight).toBeTruthy()
  })
})
