import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Lockup } from '@/components/brand/Lockup'
import {
  CHECKLISTS,
  CLASSES,
  DOFUS_GUIDES,
  DOFUS_READY,
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

/** Los Dofus que Torre aún no tiene escritos: sin página en su web, o con la página vacía. */
const PREPARING = [
  'Jyfus',
  'Dofus Kalipto',
  'Dolmanax',
  'Dotruz',
  'Dofzzbz',
  'Dofus Forjalava',
  'Dofus Centelleante',
  'Dofus Pesadilla',
  'Dofus Silvestre',
]
const READY = DOFUS_READY

describe('los datos del menú', () => {
  it('lista los 30 Dofus de Torre, los 3 checklists, las 19 clases y las 8 mazmorras', () => {
    expect(DOFUS_GUIDES).toHaveLength(30)
    expect(CHECKLISTS).toHaveLength(3)
    expect(CLASSES).toHaveLength(19)
    expect(DUNGEONS).toHaveLength(8)
  })

  it('los Dofus van en el orden de Torre y nueve están en preparación', () => {
    expect(DOFUS_GUIDES[0].name).toBe('Dofawa')
    expect(DOFUS_GUIDES.at(-1)?.name).toBe('Dofus Silvestre')
    expect(DOFUS_GUIDES.filter((d) => d.preparing).map((d) => d.name)).toEqual(PREPARING)
    expect(READY).toHaveLength(21)
    expect(READY).toEqual(DOFUS_GUIDES.filter((d) => !d.preparing))
  })

  it('las páginas que aún no viven aquí enlazan a la web de siempre, con su slug', () => {
    const all = [...READY, ...CHECKLISTS, ...CLASSES, ...DUNGEONS]
    for (const link of all)
      expect(link.href).toMatch(new RegExp(`^${LEGACY_SITE_ORIGIN}/[a-z0-9-]+$`))
    // El Nebuloso y la Piñata de Pino tienen el slug de su página en la web de Torre.
    expect(READY.map((d) => d.href)).toContain(`${LEGACY_SITE_ORIGIN}/misiones-nebuloso`)
    expect(READY.map((d) => d.href)).toContain(`${LEGACY_SITE_ORIGIN}/piata-de-pino`)
    expect(READY.find((d) => d.name === 'Dofus Ocre')?.href).toBe(
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

  it('Clases y Mazmorras están por llegar: sin enlace hasta tener sus páginas', () => {
    expect(SECTIONS.filter((s) => s.soon).map((s) => s.key)).toEqual(['clases', 'mazmorras'])
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

  it('Misiones lleva al índice de metalogros de la app, no a la web de Torre', () => {
    // La portada enlaza su bloque de misiones con esta misma dirección.
    expect(SECTIONS.find((s) => s.key === 'misiones')?.href).toBe('/metalogros')
  })
})

describe('la búsqueda del menú', () => {
  const index = searchIndex()

  it('indexa las secciones con página, los Dofus escritos y los checklists', () => {
    expect(index).toHaveLength(3 + 21 + 3)
    expect(index.map((e) => e.type)).not.toContain('clase')
    expect(index.map((e) => e.type)).not.toContain('mazmorra')
    // El checklist del Silvestre sí se encuentra; su Dofus, aún sin guía, no.
    const dofus = index.filter((e) => e.type === 'dofus').map((e) => e.name)
    for (const name of PREPARING) expect(dofus).not.toContain(name)
    for (const name of ['Clases', 'Mazmorras']) expect(index.map((e) => e.name)).not.toContain(name)
  })

  it('no distingue tildes ni mayúsculas y agrupa por tipo', () => {
    const groups = searchNav(index, 'ebano')
    expect(groups.map((g) => g.type)).toEqual(['dofus'])
    expect(groups[0].items.map((i) => i.name)).toEqual(['Dofus Ébano'])
    expect(searchNav(index, 'PIÑATA')[0].items[0].name).toBe('Piñata de Pino')
    expect(searchNav(index, 'zurcarak')).toEqual([])
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

  it('tiene dos desplegables, Misiones y Dofus; Clases y Mazmorras salen como próximamente', () => {
    const markup = header()
    const buttons = [...markup.matchAll(/aria-controls="(menu-[a-z]+)"/g)].map((m) => m[1])
    expect(buttons).toEqual(['menu-misiones', 'menu-dofus'])
    for (const id of buttons) expect(markup).toMatch(new RegExp(`id="${id}"[^>]*hidden`))
    const nav = markup.slice(markup.indexOf('aria-label="Principal"'), markup.indexOf('</nav>'))
    for (const name of ['Clases', 'Mazmorras']) {
      expect(nav).toMatch(
        new RegExp(
          `<span class="np np--soon" aria-disabled="true">.*?${name} <span class="soon">Próximamente</span></span>`,
        ),
      )
    }
  })

  it('nada de la cabecera enlaza a las clases ni a las mazmorras', () => {
    const markup = header()
    for (const link of [...CLASSES, ...DUNGEONS]) expect(markup).not.toContain(link.href)
    expect(markup).not.toContain('id="menu-clases"')
    expect(markup).not.toContain('id="sheet-clases"')
    expect(markup).not.toContain('Ver las 19 clases')
    expect(markup).not.toContain('Ir a la Crocantería')
  })

  it('el panel de Dofus une todos los Dofus de Torre y los checklists, sin cifras', () => {
    const markup = header()
    const panel = markup.slice(markup.indexOf('id="menu-dofus"'), markup.indexOf('</nav>'))
    for (const c of CHECKLISTS) expect(panel).toContain(c.href)
    for (const d of READY) expect(panel).toContain(`href="${d.href}"`)
    expect(panel).toContain('Checklists')
    expect(panel).toContain('Guías de Dofus')
    expect(panel).toContain('Todos los Dofus')
    // Torre suma Dofus con el tiempo: ningún texto los cuenta.
    expect(panel).not.toMatch(/\b(19|21|30) (guías|Dofus)/)
  })

  it('el panel de Dofus enlaza todas las guías con «Ver todas las guías de Dofus»', () => {
    const markup = header()
    const panel = markup.slice(markup.indexOf('id="menu-dofus"'), markup.indexOf('</nav>'))
    expect(panel).toMatch(
      new RegExp(
        `<a class="all-link" href="${LEGACY_SITE_ORIGIN}/guias-dofus">Ver todas las guías de Dofus<svg`,
      ),
    )
  })

  it('los Dofus en preparación salen sin enlace, apagados y avisados', () => {
    const markup = header()
    const panel = markup.slice(markup.indexOf('id="menu-dofus"'), markup.indexOf('</nav>'))
    for (const name of PREPARING) {
      expect(panel).toMatch(
        new RegExp(
          `<span class="egg-soon" aria-disabled="true"><img[^>]*><span>${name}</span><span class="sr-only"> \\(en preparación\\)</span></span>`,
        ),
      )
    }
    expect(panel).not.toContain(`${LEGACY_SITE_ORIGIN}/jyfus`)
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

  it('el panel de Misiones tiene Buscar y un solo «Ver todo», hacia /metalogros', () => {
    const markup = header()
    const panel = markup.slice(
      markup.indexOf('id="menu-misiones"'),
      markup.indexOf('id="menu-dofus"'),
    )
    expect(panel).not.toContain('Todos los metalogros')
    expect(panel).not.toContain('Todos los logros')
    expect(panel.match(/Ver todo/g)).toHaveLength(1)
    expect(hrefs(panel)).toEqual(['/metalogros'])
  })

  it('ningún enlace de misiones o logros sale de la app, ni en el panel ni en el móvil', () => {
    const markup = header()
    const panel = markup.slice(
      markup.indexOf('id="menu-misiones"'),
      markup.indexOf('id="menu-dofus"'),
    )
    const sheet = markup.slice(
      markup.indexOf('id="sheet-misiones"'),
      markup.indexOf('id="sheet-dofus"'),
    )
    const links = [
      SECTIONS.find((s) => s.key === 'misiones')!.href,
      ...hrefs(panel),
      ...hrefs(sheet),
    ]
    expect(links.length).toBeGreaterThan(2)
    for (const href of links) expect(href).toMatch(/^\/(?!\/)/)
    expect(sheet.match(/Ver todo/g)).toHaveLength(1)
  })

  it('el menú del móvil es un diálogo aparte con las mismas secciones', () => {
    const markup = header()
    expect(markup).toContain('aria-controls="site-sheet"')
    expect(markup).toMatch(/<dialog [^>]*id="site-sheet"/)
    expect(markup).toContain('Dofus y checklists')
  })

  it('en el móvil, Clases y Mazmorras son fichas apagadas sin panel', () => {
    const markup = header()
    const sheet = markup.slice(markup.indexOf('id="site-sheet"'))
    expect(sheet.match(/<div class="stile__b stile__b--soon" aria-disabled="true">/g)).toHaveLength(
      2,
    )
    expect(sheet).toContain('Clases <span class="soon">Próximamente</span>')
    expect(sheet).toContain('Mazmorras <span class="soon">Próximamente</span>')
    expect(sheet).toContain(`>Ver todas las guías de Dofus<svg`)
    expect(sheet).toContain('Las guías de Dofus y los checklists para conseguirlos.')
    expect(sheet).not.toMatch(/\b(19|21|30) (guías|Dofus)/)
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
    for (const s of SECTIONS.filter((s) => !s.soon)) expect(markup).toContain(`>${s.title}</a>`)
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

  it('Clases y Mazmorras salen en Explorar como próximamente, sin enlace', () => {
    const markup = footer()
    for (const s of SECTIONS.filter((s) => s.soon)) {
      expect(markup).toContain(
        `<span class="ft-soon" aria-disabled="true">${s.title} <span class="soon">Próximamente</span></span>`,
      )
      expect(markup).not.toContain(`href="${s.href}"`)
    }
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
