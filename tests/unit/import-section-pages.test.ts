import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  CLASS_CATALOG,
  DUNGEON_CATALOG,
  type SectionPageEntry,
} from '../../scripts/import/section-pages/catalog'
import { convertClassPage, convertDungeonPage } from '../../scripts/import/section-pages/convert'
import { parsePage } from '../../scripts/import/squarespace/parse-page'

// Las páginas de clase y de mazmorra de Torre en Squarespace, recortadas en
// tests/fixtures/section-pages/. Regla de fidelidad: nada se pierde, se junta ni se reescribe,
// y todo sigue su orden.

const fixture = (slug: string) =>
  readFileSync(path.resolve(__dirname, `../fixtures/section-pages/${slug}.html`), 'utf8')

const entry = (catalog: SectionPageEntry[], slug: string) => {
  const found = catalog.find((candidate) => candidate.slug === slug)
  if (!found) throw new Error(`Falta ${slug} en el catálogo`)
  return found
}

const DOFUSBOOK = 'https://www.dofusbook.net/fr/membre/464797-huz/equipements'
const live = () => false

describe('el catálogo', () => {
  it('lleva las 19 clases con su slug de siempre, Feca y Yopuka con su -1', () => {
    expect(CLASS_CATALOG.map((page) => page.slug)).toEqual([
      'feca-1',
      'osamodas',
      'sram',
      'anutrof',
      'xelor',
      'zurcarak',
      'aniripsa',
      'yopuka-1',
      'sadida',
      'ocra',
      'pandawa',
      'sacrogrito',
      'tymador',
      'zobal',
      'steamer',
      'selotrop',
      'hipermago',
      'forjalanza',
      'uginak',
    ])
    expect(entry(CLASS_CATALOG, 'zurcarak').title).toBe('Zurcarák')
    expect(entry(CLASS_CATALOG, 'sacrogrito').title).toBe('Sacrógrito')
    expect(CLASS_CATALOG.every((page) => page.inMenu)).toBe(true)
  })

  it('lleva las mazmorras y los jefes; los que no están en el menú de hoy, fuera de él', () => {
    expect(DUNGEON_CATALOG.map((page) => page.slug)).toEqual([
      'mazmorra-templo-del-dios-kao',
      'mazmorra-crunchidor',
      'pikabeto',
      'mazmorras-de-nawidad',
      'gruente',
      'minotobola-de-nawidad',
      'mazmorra-templo-de-kutulu',
      'mazmorra-nave-del-capitan-meno',
      'mazmorra-acuadomo-de-merkator',
      'mazmorra-fundicion-de-los-waddictos',
      'pagina-nueva',
    ])
    expect(DUNGEON_CATALOG.filter((page) => !page.inMenu).map((page) => page.slug)).toEqual([
      'gruente',
      'minotobola-de-nawidad',
      'pagina-nueva',
    ])
    expect(entry(DUNGEON_CATALOG, 'pagina-nueva').title).toBe('Palacio de Dientinea')
  })
})

describe('las imágenes con enlace', () => {
  it('guardan adónde llevan', () => {
    const [first] = parsePage(fixture('feca-1')).blocks.filter((block) => block.type === 'image')
    expect(first).toMatchObject({
      type: 'image',
      link: `${DOFUSBOOK}?include=feu-pvm&classes=1`,
    })
  })
})

describe('una página de builds', () => {
  const feca = convertClassPage(fixture('feca-1'), entry(CLASS_CATALOG, 'feca-1'), live)

  it('el encabezado de Torre es el título y no se repite', () => {
    expect(feca.title).toBe('Feca')
    expect(feca.pieces).toEqual([])
    expect(feca.oddities).toEqual([])
  })

  it('cada imagen bajo PVM y PVP es una build, en su orden, con su enlace', () => {
    expect(feca.builds.pvm.map((build) => build.link)).toEqual([
      `${DOFUSBOOK}?include=feu-pvm&classes=1`,
      `${DOFUSBOOK}?include=pvm-eau&classes=1`,
      `${DOFUSBOOK}?include=pvm-air&classes=1`,
      `${DOFUSBOOK}?include=pvm-ter&classes=1`,
      `${DOFUSBOOK}?include=cc-pvm&classes=9`,
    ])
    expect(feca.builds.pvp.map((build) => build.link)).toEqual([
      `${DOFUSBOOK}?include=pvp-feu&classes=1`,
      `${DOFUSBOOK}?include=pvp-eau&classes=1`,
      `${DOFUSBOOK}?include=pvp-air&classes=1`,
      `${DOFUSBOOK}?include=pvp-ter&classes=1`,
      `${DOFUSBOOK}?include=cc-pvm&classes=9`,
    ])
    expect(feca.builds.pvm[0]?.url).toMatch(/^https:\/\/images\.squarespace-cdn\.com\/.+\.png$/)
  })

  it('una imagen sin enlace sigue siendo una build: no se pierde ninguna', () => {
    const anutrof = convertClassPage(fixture('anutrof'), entry(CLASS_CATALOG, 'anutrof'), live)
    const images = parsePage(fixture('anutrof')).blocks.filter((block) => block.type === 'image')
    const builds = [...anutrof.builds.pvm, ...anutrof.builds.pvp]
    expect(builds).toHaveLength(images.length)
    expect(builds.filter((build) => !build.link)).toHaveLength(1)
  })

  it('el texto fuera de PVM y PVP se queda en el texto, en su orden', () => {
    const html = fixture('feca-1').replace('<strong>PVM</strong>', '<strong>Builds de PVM</strong>')
    const changed = convertClassPage(html, entry(CLASS_CATALOG, 'feca-1'), live)
    expect(changed.builds.pvm).toEqual([])
    expect(changed.pieces[0]).toMatchObject({ type: 'html' })
    expect(changed.pieces.filter((piece) => piece.type === 'image')).toHaveLength(5)
    expect(changed.builds.pvp).toHaveLength(5)
  })
})

describe('una página de mazmorra', () => {
  it('su texto y sus capturas, en su orden, con su encabezado como título', () => {
    const pikabeto = convertDungeonPage(
      fixture('pikabeto'),
      entry(DUNGEON_CATALOG, 'pikabeto'),
      live,
    )
    expect(pikabeto.title).toBe('Pikabeto')
    expect(pikabeto.pieces.map((piece) => piece.type)).toEqual([
      'html',
      'image',
      'image',
      'image',
      'html',
      'image',
    ])
    expect(pikabeto.oddities).toEqual([])
  })
})
