import { ValidationError, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { readSitePage } from '@/lib/pages/queries'
import { guideContent } from '@/lib/guides/page'
import type { User } from '@/payload-types'

import { createPanelUser, startPayload } from './payload'

// El bloque Tabla (backlog D-02) contra Postgres: lo que Torre guarda en una página, suelto o
// dentro de un paso, vuelve igual y la página lo pinta; una fila con más celdas que columnas
// no se guarda.

let payload: Payload
let editor: User

const PREFIX = 'prueba-tabla'

async function cleanUp() {
  await payload.delete({ collection: 'pages', where: { slug: { like: PREFIX } } })
}

beforeAll(async () => {
  payload = await startPayload()
  await cleanUp()
  editor = await createPanelUser(payload, 'editor')
})

afterAll(async () => {
  await cleanUp()
})

const cells = (...texts: string[]) => ({ cells: texts.map((text) => ({ text })) })

const table = {
  blockType: 'table' as const,
  title: 'Familiares',
  rowHeaders: true,
  columns: [
    { header: 'Familiar', align: 'start' as const },
    { header: 'Nivel', align: 'end' as const },
  ],
  rows: [cells('Tofu', '12'), cells('Bwak', '1')],
}

describe('el bloque Tabla', () => {
  it('se guarda suelto y dentro de un paso, y la página lo lee como un visitante', async () => {
    const slug = `${PREFIX}-guardada`
    await payload.create({
      collection: 'pages',
      data: {
        title: 'Tabla de prueba',
        slug,
        state: 'published',
        _status: 'published',
        body: [table, { blockType: 'step', body: [{ ...table, title: 'En el paso' }] }],
      },
      user: editor,
      overrideAccess: false,
    })

    const page = await readSitePage(payload, slug)
    expect(page).not.toBeNull()
    const content = guideContent(page!)
    expect(content.intro).toEqual([
      expect.objectContaining({
        kind: 'table',
        title: 'Familiares',
        rowHeaders: true,
        columns: [
          { header: 'Familiar', align: 'start' },
          { header: 'Nivel', align: 'end' },
        ],
        rows: [
          ['Tofu', '12'],
          ['Bwak', '1'],
        ],
      }),
    ])
    expect(content.steps[0]?.blocks).toEqual([
      expect.objectContaining({ kind: 'table', title: 'En el paso' }),
    ])
  })

  it('rechaza una fila con más celdas que columnas y dice cuál', async () => {
    const save = payload.create({
      collection: 'pages',
      data: {
        title: 'Tabla rota',
        slug: `${PREFIX}-rota`,
        state: 'published',
        _status: 'published',
        body: [{ ...table, rows: [cells('Tofu', '12'), cells('Bwak', '1', 'sobra')] }],
      },
      user: editor,
      overrideAccess: false,
    })
    const error = await save.catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ValidationError)
    expect((error as ValidationError).data.errors).toEqual([
      expect.objectContaining({
        path: 'body.0.rows',
        message:
          'La fila 2 tiene 3 celdas y la tabla 2 columnas: añade una columna o quita la ' +
          'celda que sobra.',
      }),
    ])
  })

  it('pide al menos una columna con su encabezado y al menos una fila', async () => {
    const save = (body: unknown[]) =>
      payload.create({
        collection: 'pages',
        data: {
          title: 'Tabla vacía',
          slug: `${PREFIX}-vacia`,
          state: 'published',
          _status: 'published',
          body: body as never,
        },
        user: editor,
        overrideAccess: false,
      })
    await expect(save([{ ...table, columns: [] }])).rejects.toBeInstanceOf(ValidationError)
    await expect(save([{ ...table, rows: [] }])).rejects.toBeInstanceOf(ValidationError)
    await expect(
      save([{ ...table, columns: [{ header: '', align: 'start' }], rows: [cells('a')] }]),
    ).rejects.toBeInstanceOf(ValidationError)
  })
})
