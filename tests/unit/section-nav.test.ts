import { describe, expect, it } from 'vitest'

import { CLASSES, DUNGEONS, classLinks, dungeonLinks } from '@/components/site/nav'
import { legacyHref } from '@/lib/site/legacy'
import type { SectionNavDoc } from '@/lib/section-pages/nav'

// Las listas de clases y mazmorras del menú salen de sus colecciones (backlog S-10 y S-11):
// Publicada lleva a su página, En preparación a su enlace de Squarespace y, sin documento,
// queda el enlace de siempre. Sin nada en las colecciones, el menú es el de hoy.

const doc = (slug: string, overrides: Partial<SectionNavDoc> = {}): SectionNavDoc => ({
  slug,
  title: `Página ${slug}`,
  state: 'preparing',
  legacyHref: null,
  inMenu: true,
  menuName: null,
  ...overrides,
})

const names = (links: { name: string }[]) => links.map((link) => link.name)

describe('las listas del menú', () => {
  it('sin documentos, son las de hoy, enlace a enlace', () => {
    expect(classLinks()).toEqual(CLASSES)
    expect(classLinks([])).toEqual(CLASSES)
    expect(dungeonLinks([])).toEqual(DUNGEONS)
  })

  it('las de hoy ya van por nombre: ordenar no cambia nada', () => {
    const sorted = (links: { name: string }[]) =>
      [...links].sort((a, b) => a.name.localeCompare(b.name, 'es'))
    expect(names(sorted(CLASSES))).toEqual(names(CLASSES))
    expect(names(sorted(DUNGEONS))).toEqual(names(DUNGEONS))
  })

  it('En preparación, lleva a su enlace de Squarespace; sin él, al de siempre', () => {
    const links = classLinks([
      doc('feca-1', { legacyHref: 'https://www.torrentearcano.com/feca-nueva' }),
      doc('sram'),
    ])
    expect(links.find((link) => link.name === 'Feca')?.href).toBe(
      'https://www.torrentearcano.com/feca-nueva',
    )
    expect(links.find((link) => link.name === 'Sram')?.href).toBe(legacyHref('sram'))
    expect(links).toHaveLength(CLASSES.length)
  })

  it('Publicada, lleva a su página de este sitio, con su imagen de siempre', () => {
    const crocanteria = dungeonLinks([doc('mazmorra-crunchidor', { state: 'published' })]).find(
      (link) => link.name === 'Crocantería',
    )
    expect(crocanteria).toEqual({
      slug: 'mazmorra-crunchidor',
      name: 'Crocantería',
      href: '/mazmorra-crunchidor',
      image: DUNGEONS.find((link) => link.name === 'Crocantería')?.image,
    })
  })

  it('Torre la quita del menú o le cambia el nombre, y la lista sigue por nombre', () => {
    const links = dungeonLinks([
      doc('pikabeto', { inMenu: false }),
      doc('mazmorras-de-nawidad', { menuName: 'Mazmorras de Nawidad' }),
    ])
    expect(names(links)).not.toContain('Pikabeto')
    expect(names(links)).not.toContain('Nawidad')
    expect(names(links)).toContain('Mazmorras de Nawidad')
    expect(names(links).indexOf('Mazmorras de Nawidad')).toBeLessThan(
      names(links).indexOf('Nave del Capitán Meno'),
    )
  })

  it('una nueva sale con su título si tiene adónde llevar y está en el menú', () => {
    const links = dungeonLinks([
      doc('pagina-nueva', {
        title: 'Palacio de Dientinea',
        legacyHref: 'https://www.torrentearcano.com/pagina-nueva',
      }),
      doc('gruente', {
        title: 'Gruñente',
        inMenu: false,
        legacyHref: 'https://www.torrentearcano.com/gruente',
      }),
      doc('sin-enlace', { title: 'Sin enlace' }),
    ])
    expect(links).toContainEqual({
      slug: 'pagina-nueva',
      name: 'Palacio de Dientinea',
      href: 'https://www.torrentearcano.com/pagina-nueva',
    })
    expect(names(links)).not.toContain('Gruñente')
    expect(names(links)).not.toContain('Sin enlace')
    expect(names(links).indexOf('Palacio de Dientinea')).toBe(names(links).indexOf('Nawidad') + 1)
  })
})
