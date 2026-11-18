import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { QuestGuide } from '@/payload-types'

import { deltaReport, loadDelta } from '../../scripts/import/delta/load-delta'
import { compareInventories } from '../../scripts/import/inventory/read'
import { loadQuestGuides, type FetchImage } from '../../scripts/import/load-quest-guides'
import { parsePage } from '../../scripts/import/squarespace/parse-page'
import { toQuestGuide } from '../../scripts/import/squarespace/to-quest-guide'

import { startPayload, tinyPng } from './payload'

// La importación delta contra Payload de verdad: dos inventarios en disco (el anterior y el
// nuevo) y guías importadas como en dev, publicadas y sin importSnapshot.

const fixture = (slug: string) =>
  readFileSync(path.join(__dirname, '../fixtures/squarespace', `${slug}.html`), 'utf8')

const UNEDITED = 'operacion-envenenamiento'
const EDITED = 'el-cazador-cazado'
const NEW = 'se-busca-prueba-delta'
const OLD_IMAGE =
  'https://images.squarespace-cdn.com/content/v1/67976884fd6bbb4c207d8c51/afcd2733-ff8c-4270-9e44-e48de3003985/Captura+de+pantalla+2026-07-20+010216.png'
const NEW_IMAGE =
  'https://images.squarespace-cdn.com/content/v1/67976884fd6bbb4c207d8c51/delta-0000/Captura+de+pantalla+2026-11-08+delta.png'

function writeInventory(dir: string, pages: Record<string, string>) {
  mkdirSync(path.join(dir, 'raw', 'pages'), { recursive: true })
  const urls = Object.keys(pages)
    .map((slug) => `<url><loc>https://www.torrentearcano.com/${slug}</loc></url>`)
    .join('')
  writeFileSync(path.join(dir, 'raw', 'sitemap.xml'), `<urlset>${urls}</urlset>`)
  for (const [slug, html] of Object.entries(pages)) {
    writeFileSync(path.join(dir, 'raw', 'pages', `${slug}.html`), html)
  }
}

describe('pnpm import:delta', () => {
  let payload: Payload
  let previous: string
  let next: string
  const downloads: string[] = []
  const fetchImage: FetchImage = async (url) => {
    downloads.push(url)
    return tinyPng(`delta-${downloads.length}.png`)
  }

  const guide = async (slug: string): Promise<QuestGuide> => {
    const { docs } = await payload.find({
      collection: 'quest-guides',
      where: { slug: { equals: slug } },
      depth: 0,
      draft: true,
    })
    return docs[0]!
  }

  async function cleanUp() {
    await payload.delete({
      collection: 'quest-guides',
      where: { slug: { in: [UNEDITED, EDITED, NEW] } },
      overrideAccess: true,
    })
    await payload.delete({
      collection: 'media',
      where: { originalUrl: { contains: 'images.squarespace-cdn.com' } },
      overrideAccess: true,
    })
  }

  beforeAll(async () => {
    payload = await startPayload()
    await cleanUp()
    const root = mkdtempSync(path.join(tmpdir(), 'ta-web-delta-'))
    previous = path.join(root, 'anterior')
    next = path.join(root, 'nuevo')
    const unedited = fixture(UNEDITED)
    const edited = fixture(EDITED)
    writeInventory(previous, { [UNEDITED]: unedited, [EDITED]: edited })
    writeInventory(next, {
      // Torre cambia una frase y una captura de una guía, y otra frase de otra.
      [UNEDITED]: unedited
        .replace('Tienes que hablar con Peny Tenciario', 'Ahora hay que hablar con Peny Tenciario')
        .replaceAll(OLD_IMAGE, NEW_IMAGE),
      [EDITED]: edited.replace('A continuación dirígete a', 'Luego dirígete a'),
      // Y llena un esbozo con una guía entera.
      [NEW]: fixture('seis-pies-bajo-tierra'),
    })

    // Las guías como están en dev: importadas de la página anterior, publicadas y sin snapshot.
    await loadQuestGuides(
      payload,
      [UNEDITED, EDITED].map((slug) =>
        toQuestGuide(parsePage(fixture(slug)), { slug, questDofusIds: [] }),
      ),
      { fetchImage },
    )
    for (const slug of [UNEDITED, EDITED]) {
      const current = await guide(slug)
      await payload.update({
        collection: 'quest-guides',
        id: current.id,
        data: { importSnapshot: null, _status: 'published' },
        depth: 0,
        overrideAccess: true,
      })
    }
    // Torre retoca el cuerpo de una en el panel.
    const edited2 = await guide(EDITED)
    await payload.update({
      collection: 'quest-guides',
      id: edited2.id,
      data: { body: [...(edited2.body ?? []).slice(1)], _status: 'published' },
      depth: 0,
      overrideAccess: true,
    })
    downloads.length = 0
  }, 120_000)

  afterAll(async () => {
    await cleanUp()
    rmSync(path.dirname(previous), { recursive: true, force: true })
    await payload.destroy()
  })

  const run = async (apply: boolean) =>
    loadDelta(payload, {
      previous,
      next,
      deltas: await compareInventories(previous, next),
      apply,
      fetchImage,
    })

  it('en seco informa de la guía nueva y no escribe ni sube nada', async () => {
    const before = await Promise.all([guide(UNEDITED), guide(EDITED)])
    const report = await run(false)

    expect(report.newGuides.map((g) => g.slug)).toEqual([NEW])
    expect(report.newGuides[0]!.uploads.length).toBeGreaterThan(0)
    // Las guías ya importadas se listan sin tocar.
    expect(report.untreated.map((page) => page.path).sort()).toEqual([`/${EDITED}`, `/${UNEDITED}`])

    expect(downloads).toEqual([])
    expect(await guide(NEW)).toBeUndefined()
    expect(await Promise.all([guide(UNEDITED), guide(EDITED)])).toEqual(before)
    expect(deltaReport(report, false).at(-1)).toMatch(/^En seco: .*Imágenes que subiría: \d+\.$/)
  }, 120_000)

  it('con --apply crea la guía nueva como borrador, con sus imágenes', async () => {
    const report = await run(true)

    const created = await guide(NEW)
    expect(created._status).toBe('draft')
    expect(created.importSnapshot).toBeTruthy()
    expect(downloads.length).toBeGreaterThan(0)
    expect(report.written.created).toBe(1)
  }, 120_000)

  it('una segunda pasada no crea nada más', async () => {
    downloads.length = 0
    const report = await run(false)

    expect(report.newGuides).toEqual([])
    expect(downloads).toEqual([])
  }, 120_000)
})
