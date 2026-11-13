import { createLocalReq, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { isRootSlugTaken } from '@/collections/root-slug'

import { startPayload } from './payload'

// Una URL de la tabla de redirecciones (src/lib/redirects/legacy-urls.json) nunca llega a su
// página: el proxy la responde antes. El panel no deja publicar una página con ese slug, y
// dice a Torre que hay que quitar la fila. Los metalogros sí la usan: su slug es el ancla de
// su panel en /metalogros (metalogro-astrub), no una página.

let payload: Payload

/** El mensaje del campo slug con que Payload rechaza la operación. */
async function slugError(operation: Promise<unknown>): Promise<string> {
  const error = (await operation.then(
    () => null,
    (reason: unknown) => reason,
  )) as { data?: { errors?: { path: string; message: string }[] } } | null
  return error?.data?.errors?.find((e) => e.path === 'slug')?.message ?? 'sin error'
}

const OWN = ['legacy-libre', 'legacy-cambiada']

async function cleanUp() {
  await payload.delete({
    collection: 'quest-guides',
    where: { slug: { in: [...OWN, 'home', 'cart'] } },
  })
  await payload.delete({
    collection: 'achievement-groups',
    where: { slug: { equals: 'metalogro-cania' } },
  })
}

beforeAll(async () => {
  payload = await startPayload()
  await cleanUp()
})

afterAll(async () => {
  await cleanUp()
  await payload.destroy()
})

describe('slugs de la tabla de redirecciones', () => {
  it('rechaza una guía con el slug de una URL antigua, y dice a Torre que quite la fila', async () => {
    expect(
      await slugError(
        payload.create({
          collection: 'quest-guides',
          data: { title: 'Portada vieja', slug: 'home', _status: 'published' },
        }),
      ),
    ).toMatch(/\/home.*tabla de redirecciones.*quiten su fila/s)
  })

  it('también al cambiar el slug de una guía que ya existe, y en borrador', async () => {
    const guide = await payload.create({
      collection: 'quest-guides',
      data: { title: 'Cambiada', slug: 'legacy-cambiada', _status: 'published' },
    })
    expect(
      await slugError(
        payload.update({ collection: 'quest-guides', id: guide.id, data: { slug: 'cart' } }),
      ),
    ).toMatch(/\/cart.*tabla de redirecciones/s)
    expect(
      await slugError(
        payload.update({
          collection: 'quest-guides',
          id: guide.id,
          data: { slug: 'cart' },
          draft: true,
        }),
      ),
    ).toMatch(/\/cart.*tabla de redirecciones/s)
  })

  it('deja un slug que no está en la tabla', async () => {
    const guide = await payload.create({
      collection: 'quest-guides',
      data: { title: 'Libre', slug: 'legacy-libre', _status: 'published' },
    })
    expect(guide.slug).toBe('legacy-libre')
  })

  it('deja a un metalogro usar su slug de siempre: es un ancla, no una página', async () => {
    const group = await payload.create({
      collection: 'achievement-groups',
      data: { name: 'Cania', slug: 'metalogro-cania', state: 'published', _status: 'published' },
    })
    expect(group.slug).toBe('metalogro-cania')
  })

  it('el autorrelleno lo da por ocupado y busca otro slug; para un metalogro, no', async () => {
    const req = await createLocalReq({}, payload)
    expect(await isRootSlugTaken(req, 'home', 'quest-guides')).toBe(true)
    expect(await isRootSlugTaken(req, 'corazon-de-piedra', 'achievement-pages')).toBe(true)
    expect(await isRootSlugTaken(req, 'metalogro-astrub', 'achievement-groups')).toBe(false)
  })
})
