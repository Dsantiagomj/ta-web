import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Lockup } from '@/components/brand/Lockup'
import {
  CHECKLISTS,
  CLASSES,
  DOFUS_GUIDES,
  DUNGEONS,
  SECTIONS,
  SOCIALS,
  TOP_ANCHOR,
  searchIndex,
} from '@/components/site/nav'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { searchNav } from '@/components/site/search'
import { LEGACY_SITE_ORIGIN } from '@/lib/site/legacy'

const html = (node: React.ReactNode) => renderToStaticMarkup(node)
const counts = { guides: 1272, achievements: 274 }
/** Una cifra sin miles, como la pinta Amount. */
const n = (value: number) => `<span class="amount">${value}</span>`
const header = () => html(<SiteHeader counts={counts} initialMode="dark" />)
const footer = () => html(<SiteFooter year={2026} />)
const hrefs = (markup: string) => [...markup.matchAll(/href="([^"]+)"/g)].map((m) => m[1])

describe('los datos del menú', () => {
  it('lista los 19 Dofus, los 3 checklists, las 19 clases y las 8 mazmorras', () => {
    expect(DOFUS_GUIDES).toHaveLength(19)
    expect(CHECKLISTS).toHaveLength(3)
    expect(CLASSES).toHaveLength(19)
    expect(DUNGEONS).toHaveLength(8)
  })

  it('las páginas que aún no viven aquí enlazan a la web de siempre, con su slug', () => {
    const all = [...DOFUS_GUIDES, ...CHECKLISTS, ...CLASSES, ...DUNGEONS]
    for (const link of all)
      expect(link.href).toMatch(new RegExp(`^${LEGACY_SITE_ORIGIN}/[a-z0-9-]+$`))
    expect(DOFUS_GUIDES.find((d) => d.name === 'Dofus Ocre')?.href).toBe(
      `${LEGACY_SITE_ORIGIN}/dofus-ocre`,
    )
  })

  it('cada imagen del juego sale de public/img/game y declara su tamaño', () => {
    for (const link of [...DOFUS_GUIDES, ...CHECKLISTS, ...CLASSES]) {
      expect(link.image?.src).toMatch(/^\/img\/game\/[a-z0-9/-]+\.webp$/)
      expect(link.image?.size).toBeGreaterThan(0)
    }
  })

  it('las redes son Twitch, Kick, YouTube y Discord: sin Instagram', () => {
    expect(SOCIALS.map((s) => s.key)).toEqual(['twitch', 'kick', 'youtube', 'discord'])
    expect(JSON.stringify(SOCIALS)).not.toMatch(/instagram/i)
  })

  it('las secciones son cinco y Checklists va dentro de Dofus en el menú', () => {
    expect(SECTIONS.map((s) => s.key)).toEqual([
      'misiones',
      'dofus',
      'checklists',
      'clases',
      'mazmorras',
    ])
  })
})

describe('la búsqueda del menú', () => {
  const index = searchIndex()

  it('indexa las secciones, los Dofus, los checklists, las clases y las mazmorras', () => {
    expect(index).toHaveLength(5 + 19 + 3 + 19 + 8)
  })

  it('no distingue tildes ni mayúsculas y agrupa por tipo', () => {
    const groups = searchNav(index, 'ebano')
    expect(groups.map((g) => g.type)).toEqual(['dofus'])
    expect(groups[0].items.map((i) => i.name)).toEqual(['Dofus Ébano'])
    expect(searchNav(index, 'ZURCA')[0].items[0].name).toBe('Zurcarák')
  })

  it('sin texto no devuelve nada', () => {
    expect(searchNav(index, '   ')).toEqual([])
  })
})

describe('Lockup', () => {
  it('es un enlace a la portada con el emblema y el nombre en dos líneas', () => {
    const markup = html(<Lockup />)
    expect(markup).toMatch(/^<a [^>]*href="\/"/)
    expect(markup).toContain('data-variant="full"')
    expect(markup).toContain(
      '<span class="lockup__top">Torrente</span> <span class="lockup__acc">Arcano</span>',
    )
  })
})

describe('SiteHeader', () => {
  it('pinta la marca, el menú principal y las acciones', () => {
    const markup = header()
    expect(markup).toContain('<header class="site-hdr"')
    expect(markup).toContain('aria-label="Principal"')
    expect(markup).toContain('class="mode-switch"')
    expect(markup).toContain('<kbd>Ctrl K</kbd>')
    expect(markup).toContain('aria-label="Buscar (Ctrl K)"')
    // Aún no hay cuentas de miembro: no hay botón Entrar que no lleve a ninguna parte.
    expect(markup).not.toContain('Entrar')
  })

  it('tiene cuatro desplegables: Misiones, Dofus, Clases y Mazmorras', () => {
    const markup = header()
    const buttons = [...markup.matchAll(/aria-controls="(menu-[a-z]+)"/g)].map((m) => m[1])
    expect(buttons).toEqual(['menu-misiones', 'menu-dofus', 'menu-clases', 'menu-mazmorras'])
    for (const id of buttons) expect(markup).toMatch(new RegExp(`id="${id}"[^>]*hidden`))
    expect(markup.match(/aria-expanded="false"/g)?.length).toBeGreaterThanOrEqual(4)
  })

  it('el panel de Dofus une la guía de los 19 Dofus y los checklists', () => {
    const markup = header()
    const panel = markup.slice(
      markup.indexOf('id="menu-dofus"'),
      markup.indexOf('id="menu-clases"'),
    )
    for (const c of CHECKLISTS) expect(panel).toContain(c.href)
    for (const d of DOFUS_GUIDES) expect(panel).toContain(d.href)
    expect(panel).toContain('Checklists')
  })

  it('cuenta las guías y los logros con el espacio de miles', () => {
    const markup = header()
    expect(markup).toContain(
      '<b><span class="amount">1<span class="amount__th">\u202F</span>272</span></b>',
    )
    expect(markup).toContain('<b><span class="amount">274</span></b>')
  })

  it('con una sola guía o un solo logro, en singular', () => {
    const markup = html(<SiteHeader counts={{ guides: 1, achievements: 1 }} initialMode="dark" />)
    expect(markup).toContain(`<b>${n(1)}</b> misión paso a paso, en <b>${n(1)}</b> logro.`)
  })

  it('el singular y el plural de cada cifra van por separado', () => {
    const markup = html(<SiteHeader counts={{ guides: 3, achievements: 1 }} initialMode="dark" />)
    expect(markup).toContain(`<b>${n(3)}</b> misiones paso a paso, en <b>${n(1)}</b> logro.`)
    const other = html(<SiteHeader counts={{ guides: 1, achievements: 2 }} initialMode="dark" />)
    expect(other).toContain(
      `<b>${n(1)}</b> misión paso a paso, ordenada en sus <b>${n(2)}</b> logros.`,
    )
  })

  it('el panel de Misiones no repite el enlace a los metalogros', () => {
    const markup = header()
    const panel = markup.slice(
      markup.indexOf('id="menu-misiones"'),
      markup.indexOf('id="menu-dofus"'),
    )
    expect(panel.match(/Todos los metalogros/g)).toHaveLength(1)
  })

  it('el menú del móvil es un diálogo aparte con las mismas secciones', () => {
    const markup = header()
    expect(markup).toContain('aria-controls="site-sheet"')
    expect(markup).toMatch(/<dialog [^>]*id="site-sheet"/)
    expect(markup).toContain('Dofus y checklists')
  })

  it('enlaza el salto al contenido', () => {
    expect(header()).toContain('href="#contenido"')
  })

  it('el panel de Misiones abre la búsqueda de misiones', () => {
    const markup = header()
    const panel = markup.slice(
      markup.indexOf('id="menu-misiones"'),
      markup.indexOf('id="menu-dofus"'),
    )
    expect(panel).toContain('Buscar una misión')
    expect(panel).toContain('data-open-search')
  })
})

describe('SiteFooter', () => {
  it('pinta a Torre, Explorar, Comunidad y la banda legal', () => {
    const markup = footer()
    expect(markup).toContain('Juega a Dofus en directo y escribe todas las guías de esta web.')
    expect(markup).toContain('Explorar')
    for (const s of SECTIONS) expect(markup).toContain(`>${s.title}</a>`)
    expect(markup).toContain('Únete al Discord')
    expect(markup).toContain('Apoya en Ko-fi')
    expect(markup).toContain('Sigue a Torre')
    for (const handle of ['torrentearcano', 'torretv', '@TorrenteArcano'])
      expect(markup).toContain(handle)
    expect(markup).toContain('Aviso legal')
    expect(markup).toContain('Política de cookies')
    expect(markup).toContain('Política de privacidad')
    expect(markup).toContain('© 2026 Torrente Arcano')
    expect(markup).toContain('no está afiliada ni asociada con Ankama')
  })

  it('«Volver arriba» lleva al principio de la página, no a un ancla vacía', () => {
    const markup = footer()
    expect(markup).toContain(`href="#${TOP_ANCHOR}"`)
    expect(markup).not.toContain('href="#"')
  })

  it('no repite ningún enlace y no enlaza Instagram', () => {
    const links = hrefs(footer()).filter((h) => h !== '#' && h !== '/')
    expect(new Set(links).size).toBe(links.length)
    expect(footer()).not.toMatch(/instagram/i)
  })
})
