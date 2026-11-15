import type { Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { readSlugRedirects } from '@/lib/redirects/queries'

import { startPayload } from './payload'

// Las redirecciones de dirección cambiada (AGENTS.md, Redirects): al publicar una página con
// otro slug, la colección redirects guarda /<viejo> → /<nuevo>, que la página /[slug] sirve
// con un 308 cuando no hay nada con ese slug. Las cadenas se acortan, los bucles se rechazan
// y una página que publica un slug viejo se lo queda.

let payload: Payload

const PREFIX = 'redir-'

async function cleanUp() {
  const own = { slug: { like: PREFIX } }
  await payload.delete({ collection: 'quest-guides', where: own })
  await payload.delete({ collection: 'pages', where: own })
  await payload.delete({
    collection: 'redirects',
    where: { or: [{ from: { like: PREFIX } }, { to: { like: PREFIX } }] },
  })
}

/** Las filas de redirects que tocan las pruebas, como «from → to». */
async function rows(): Promise<string[]> {
  const { docs } = await payload.find({
    collection: 'redirects',
    where: { from: { like: PREFIX } },
    pagination: false,
    sort: 'from',
  })
  return docs.map((doc) => `${doc.from} → ${doc.to}`)
}

async function publishGuide(slug: string) {
  return payload.create({
    collection: 'quest-guides',
    data: { title: `Guía ${slug}`, slug, _status: 'published' },
  })
}

const rename = (id: number, slug: string, draft = false) =>
  payload.update({
    collection: 'quest-guides',
    id,
    data: { slug, ...(draft ? {} : { _status: 'published' as const }) },
    draft,
  })

/** El mensaje con que Payload rechaza una fila, o «sin error». */
async function failure(operation: Promise<unknown>): Promise<string> {
  const error = (await operation.then(
    () => null,
    (reason: unknown) => reason,
  )) as { data?: { errors?: { message: string }[] }; message?: string } | null
  if (!error) return 'sin error'
  return error.data?.errors?.map((e) => e.message).join(' ') || error.message || 'error'
}

beforeAll(async () => {
  payload = await startPayload()
})

beforeEach(cleanUp)

afterAll(async () => {
  await cleanUp()
  await payload.destroy()
})

describe('al cambiar la dirección de lo publicado', () => {
  it('la vieja lleva a la nueva, y la fila dice que la creó la web', async () => {
    const guide = await publishGuide('redir-a')
    await rename(guide.id, 'redir-b')

    expect(await rows()).toEqual(['redir-a → redir-b'])
    const { docs } = await payload.find({
      collection: 'redirects',
      where: { from: { equals: 'redir-a' } },
    })
    expect(docs[0].auto).toBe(true)
  })

  it('un borrador con otro slug no mueve nada hasta que se publica', async () => {
    const guide = await publishGuide('redir-a')
    await rename(guide.id, 'redir-b', true)
    expect(await rows()).toEqual([])

    await payload.update({
      collection: 'quest-guides',
      id: guide.id,
      data: { _status: 'published' },
    })
    expect(await rows()).toEqual(['redir-a → redir-b'])
  })

  it('lo que nunca se publicó no deja dirección vieja', async () => {
    const draft = await payload.create({
      collection: 'quest-guides',
      data: { title: 'Borrador', slug: 'redir-borrador' },
      draft: true,
    })
    await rename(draft.id, 'redir-publicado')
    expect(await rows()).toEqual([])
  })

  it('acorta las cadenas: A → B → C deja A → C y B → C', async () => {
    const guide = await publishGuide('redir-a')
    await rename(guide.id, 'redir-b')
    await rename(guide.id, 'redir-c')

    expect(await rows()).toEqual(['redir-a → redir-c', 'redir-b → redir-c'])
  })

  it('volver a la dirección de antes no hace un bucle', async () => {
    const guide = await publishGuide('redir-a')
    await rename(guide.id, 'redir-b')
    await rename(guide.id, 'redir-a')

    expect(await rows()).toEqual(['redir-b → redir-a'])
  })

  it('una página que publica una dirección vieja se la queda', async () => {
    const old = await publishGuide('redir-a')
    await rename(old.id, 'redir-b')
    await publishGuide('redir-a')

    expect(await rows()).toEqual([])
  })

  it('vale para las demás colecciones con página, como las páginas sueltas', async () => {
    const page = await payload.create({
      collection: 'pages',
      data: { title: 'Emotes', slug: 'redir-emotes', state: 'published', _status: 'published' },
    })
    await payload.update({
      collection: 'pages',
      id: page.id,
      data: { slug: 'redir-emotes-nuevos', _status: 'published' },
    })

    expect(await rows()).toEqual(['redir-emotes → redir-emotes-nuevos'])
  })
})

describe('las filas que escribe Torre en el panel', () => {
  it('un destino que ya redirige se guarda acortado', async () => {
    await payload.create({ collection: 'redirects', data: { from: 'redir-m2', to: 'redir-m3' } })
    const row = await payload.create({
      collection: 'redirects',
      data: { from: 'redir-m1', to: 'redir-m2' },
    })

    expect(row.to).toBe('redir-m3')
    expect(row.auto).toBeFalsy()
  })

  it('una fila nueva acorta las que llevaban a su origen', async () => {
    await payload.create({ collection: 'redirects', data: { from: 'redir-m1', to: 'redir-m2' } })
    await payload.create({ collection: 'redirects', data: { from: 'redir-m2', to: 'redir-m3' } })

    expect(await rows()).toEqual(['redir-m1 → redir-m3', 'redir-m2 → redir-m3'])
  })

  it('rechaza un bucle', async () => {
    await payload.create({ collection: 'redirects', data: { from: 'redir-m1', to: 'redir-m2' } })

    expect(
      await failure(
        payload.create({ collection: 'redirects', data: { from: 'redir-m2', to: 'redir-m1' } }),
      ),
    ).toMatch(/vuelta/)
  })

  it('rechaza un origen que ya es la dirección de algo publicado', async () => {
    await publishGuide('redir-viva')

    expect(
      await failure(
        payload.create({
          collection: 'redirects',
          data: { from: 'redir-viva', to: 'redir-otra' },
        }),
      ),
    ).toMatch(/redir-viva/)
  })

  it('rechaza una ruta del sitio y un origen repetido', async () => {
    expect(
      await failure(
        payload.create({ collection: 'redirects', data: { from: 'admin', to: 'redir-x' } }),
      ),
    ).toMatch(/\/admin/)
    await payload.create({ collection: 'redirects', data: { from: 'redir-m1', to: 'redir-m2' } })
    expect(
      await failure(
        payload.create({ collection: 'redirects', data: { from: 'redir-m1', to: 'redir-m9' } }),
      ),
    ).not.toBe('sin error')
  })
})

describe('acceso', () => {
  it('un visitante lee las redirecciones pero no las escribe', async () => {
    await payload.create({ collection: 'redirects', data: { from: 'redir-m1', to: 'redir-m2' } })

    const read = await payload.find({
      collection: 'redirects',
      where: { from: { equals: 'redir-m1' } },
      overrideAccess: false,
    })
    expect(read.docs.map((doc) => doc.to)).toEqual(['redir-m2'])
    expect(await readSlugRedirects(payload)).toContainEqual(['redir-m1', 'redir-m2'])
    expect(
      await failure(
        payload.create({
          collection: 'redirects',
          data: { from: 'redir-m5', to: 'redir-m6' },
          overrideAccess: false,
        }),
      ),
    ).not.toBe('sin error')
  })
})
