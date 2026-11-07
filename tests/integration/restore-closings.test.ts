import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { restoreClosings } from '../../scripts/import/restore-closings'
import type { QuestGuide } from '@/payload-types'

import { startPayload } from './payload'

// La frase de cierre que el importador quitaba vuelve a las guías ya importadas, leída de
// la página guardada de Squarespace. En seco no escribe; con apply sí; repetirlo no cambia nada.

const SLUG = 'prueba-cierre'
const element = { format: '', indent: 0, version: 1, direction: 'ltr' }
const text = (value: string) => ({
  type: 'text',
  text: value,
  format: 0,
  style: '',
  mode: 'normal',
  detail: 0,
  version: 1,
})
const content = (value: string) =>
  ({
    root: {
      ...element,
      type: 'root',
      children: [
        { ...element, type: 'paragraph', textFormat: 0, textStyle: '', children: [text(value)] },
      ],
    },
  }) as never

function sourcePage(...paragraphs: string[]) {
  const css = paragraphs
    .map(
      (_, i) =>
        `@media (min-width: 768px) { .fe-block-b${i} { grid-area: ${i + 1}/2/${i + 2}/26; } }`,
    )
    .join('\n')
  const blocks = paragraphs
    .map(
      (html, i) =>
        `<div class="fe-block fe-block-b${i}"><div class="sqs-block" data-sqsp-block="text">` +
        `<div class="sqs-html-content" data-sqsp-text-block-content>${html}</div></div></div>`,
    )
    .join('')
  return (
    '<script>Static.SQUARESPACE_CONTEXT = {"collection":{"title":"Prueba","id":"x"}};</script>' +
    `<article><div data-fluid-engine="true"><style>${css}</style>${blocks}</div></article>`
  )
}

let payload: Payload
let dir: string

async function guide(): Promise<QuestGuide> {
  const { docs } = await payload.find({
    collection: 'quest-guides',
    where: { slug: { equals: SLUG } },
    draft: true,
    depth: 0,
    limit: 1,
  })
  return docs[0]!
}

function outroText(doc: QuestGuide): string {
  return JSON.stringify(doc.body?.at(-1))
}

beforeAll(async () => {
  payload = await startPayload()
  dir = await mkdtemp(path.join(tmpdir(), 'cierres-'))
  await mkdir(path.join(dir, 'raw', 'pages'), { recursive: true })
  await writeFile(
    path.join(dir, 'raw', 'pages', `${SLUG}.html`),
    sourcePage(
      '<p>Un paso.</p>',
      '<p>Aquí termina la misión. Espero haberte ayudado: <a href="/otra"><strong>Otra.</strong></a></p>',
    ),
  )
})

afterAll(async () => {
  await payload.delete({ collection: 'quest-guides', where: { slug: { equals: SLUG } } })
  await rm(dir, { recursive: true, force: true })
  await payload.destroy()
})

beforeEach(async () => {
  await payload.delete({ collection: 'quest-guides', where: { slug: { equals: SLUG } } })
  await payload.create({
    collection: 'quest-guides',
    data: {
      title: 'Prueba cierre',
      slug: SLUG,
      _status: 'published',
      body: [
        { blockType: 'step', body: [{ blockType: 'richText', content: content('Un paso.') }] },
        { blockType: 'richText', content: content('Espero haberte ayudado: Otra.') },
      ],
    },
  })
})

describe('restoreClosings', () => {
  it('en seco cuenta lo que haría y no escribe nada', async () => {
    const result = await restoreClosings(payload, { dir, apply: false, slugs: [SLUG] })
    expect(result).toMatchObject({ guides: 1, restored: 1, published: 0 })
    expect(outroText(await guide())).not.toContain('Aquí termina la misión')
  })

  it('con apply devuelve el párrafo entero, con su enlace, y repetirlo no cambia nada', async () => {
    const result = await restoreClosings(payload, { dir, apply: true, slugs: [SLUG] })
    expect(result).toMatchObject({ restored: 1, published: 1 })
    const saved = await guide()
    expect(saved._status).toBe('published')
    expect(outroText(saved)).toContain('Aquí termina la misión. Espero haberte ayudado: ')
    expect(outroText(saved)).toContain('"url":"/otra"')

    const again = await restoreClosings(payload, { dir, apply: true, slugs: [SLUG] })
    expect(again).toMatchObject({ restored: 0, present: 1, published: 0 })
  })

  it('una guía sin página guardada se cuenta y no se toca', async () => {
    const result = await restoreClosings(payload, {
      dir: path.join(dir, 'no-existe'),
      apply: true,
      slugs: [SLUG],
    })
    expect(result).toMatchObject({ noSource: 1, restored: 0 })
  })
})
