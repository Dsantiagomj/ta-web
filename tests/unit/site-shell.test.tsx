import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Lockup } from '@/components/brand/Lockup'
import {
  type ChecklistNavItem,
  CLASSES,
  type DofusNavItem,
  DUNGEONS,
  SECTIONS,
  SOCIALS,
  TOP_ANCHOR,
  searchIndex,
} from '@/components/site/nav'
import { SiteFooter } from '@/components/site/SiteFooter'
import { ChecklistCards, SiteHeader, Well } from '@/components/site/SiteHeader'
import { searchNav } from '@/components/site/search'
import { LEGACY_SITE_ORIGIN } from '@/lib/site/legacy'

const html = (node: React.ReactNode) => renderToStaticMarkup(node)
const counts = { guides: 1272, achievements: 274 }
/** Una cifra sin miles, como la pinta Amount. */
const n = (value: number) => `<span class="amount">${value}</span>`
/** Unos Dofus como los da la colección de guías de Dofus (loadDofusNav), en su orden. */
const egg = (slug: string) => ({ src: `/media/${slug}.webp`, size: 128 })
const DOFUS: DofusNavItem[] = [
  { name: 'Dofawa', href: '/dofawa', image: egg('dofawa') },
  { name: 'Jyfus', image: egg('jyfus') },
  { name: 'Dofus Ébano', href: '/dofus-ebano', image: egg('dofus-ebano') },
  { name: 'Piñata de Pino', href: '/piata-de-pino', image: egg('pinata') },
  { name: 'Dofus Silvestre' },
]
/** Unas checklists como las da su colección (loadChecklistNav), en su orden. */
const CHECKLISTS: ChecklistNavItem[] = [
  {
    name: 'Dofus Nebuloso',
    slug: 'checklist-nebuloso',
    href: '/checklist-nebuloso',
    description: 'Del Nebuloso, paso a paso.',
    image: egg('nebuloso'),
  },
  {
    name: 'Dofus Silvestre',
    slug: 'checklist-silvestre',
    href: `${LEGACY_SITE_ORIGIN}/checklist-silvestre`,
    legacy: true,
    description: 'Con la guía de Sandglass.',
    image: egg('silvestre'),
  },
  {
    name: 'Almas del Ocre',
    slug: 'lista-ocre',
    href: `${LEGACY_SITE_ORIGIN}/lista-ocre`,
    legacy: true,
  },
  { name: 'Dofus Púrpura', slug: 'checklist-purpura' },
]
const header = () =>
  html(<SiteHeader counts={counts} dofus={DOFUS} checklists={CHECKLISTS} initialMode="dark" />)
const footer = () => html(<SiteFooter year={2026} />)
const hrefs = (markup: string) => [...markup.matchAll(/href="([^"]+)"/g)].map((m) => m[1])

/** Los Dofus sin guía publicada: salen apagados y sin enlace. */
const PREPARING = DOFUS.filter((d) => !d.href).map((d) => d.name)
const READY = DOFUS.filter((d) => d.href)

describe('los datos del menú', () => {
  it('lista las 19 clases y las 8 mazmorras; los Dofus y las checklists llegan de sus colecciones', () => {
    expect(CLASSES).toHaveLength(19)
    expect(DUNGEONS).toHaveLength(8)
  })

  it('las páginas que aún no viven aquí enlazan a la web de siempre, con su slug', () => {
    for (const link of [...CLASSES, ...DUNGEONS])
      expect(link.href).toMatch(new RegExp(`^${LEGACY_SITE_ORIGIN}/[a-z0-9-]+$`))
  })

  it('Dofus lleva al índice de las guías de Dofus de la app', () => {
    expect(SECTIONS.find((s) => s.key === 'dofus')?.href).toBe('/guias-dofus')
  })

  it('Checklists lleva al índice de las checklists de la app, no a la web de Torre', () => {
    expect(SECTIONS.find((s) => s.key === 'checklists')?.href).toBe('/checklists')
  })

  it('cada imagen del juego sale de public/img/game y declara su tamaño', () => {
    for (const link of [
      ...CLASSES,
      { image: SECTIONS.find((s) => s.key === 'checklists')!.icon },
    ]) {
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
  const index = searchIndex(DOFUS, CHECKLISTS)

  it('indexa las secciones con página, los Dofus con guía publicada y las checklists con enlace', () => {
    expect(index).toHaveLength(3 + READY.length + 3)
    const checklists = index.filter((e) => e.type === 'checklist')
    expect(checklists.map((e) => e.href)).toEqual(CHECKLISTS.slice(0, 3).map((c) => c.href))
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

  it('el panel de Dofus une los Dofus de la colección, en su orden, y los checklists, sin cifras', () => {
    const markup = header()
    const panel = markup.slice(markup.indexOf('id="menu-dofus"'), markup.indexOf('</nav>'))
    for (const c of CHECKLISTS) expect(panel).toContain(`<span class="chk__t">${c.name}</span>`)
    for (const d of READY) expect(panel).toContain(`href="${d.href}"`)
    const order = DOFUS.map((d) => panel.indexOf(`<span>${d.name}</span>`))
    expect(order).toEqual([...order].sort((a, b) => a - b))
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
      new RegExp(`<a class="all-link" href="/guias-dofus">Ver todas las guías de Dofus<svg`),
    )
  })

  it('las checklists salen de su colección, en su orden, con «Ver todas las checklists»', () => {
    const markup = header()
    const panel = markup.slice(markup.indexOf('id="menu-dofus"'), markup.indexOf('</nav>'))
    const order = CHECKLISTS.map((c) => panel.indexOf(`<span class="chk__t">${c.name}</span>`))
    expect(order.every((i) => i > 0)).toBe(true)
    expect(order).toEqual([...order].sort((a, b) => a - b))
    expect(panel).toContain('href="/checklist-nebuloso"')
    expect(panel).toMatch(
      new RegExp(`<a class="all-link" href="/checklists">Ver todas las checklists<svg`),
    )
    // Lo que ya vive aquí no lleva a la web de siempre; el índice tampoco.
    expect(markup).not.toContain(`${LEGACY_SITE_ORIGIN}/checklist-nebuloso`)
    expect(markup).not.toContain(`${LEGACY_SITE_ORIGIN}/checklists`)
    // Ninguna frase cuenta pasos ni checklists.
    expect(panel).not.toMatch(/\d+ (pasos|almas|checklists)/)
  })

  it('una checklist En preparación avisa de que abre la web anterior; sin enlace, sale apagada', () => {
    const markup = header()
    const panel = markup.slice(markup.indexOf('id="menu-dofus"'), markup.indexOf('</nav>'))
    expect(panel).toMatch(
      new RegExp(
        `<a href="${LEGACY_SITE_ORIGIN}/lista-ocre">.*?Almas del Ocre</span><span class="sr-only"> \\(en preparación: se abre en la web anterior\\)</span>`,
      ),
    )
    expect(panel).toMatch(
      /<span class="chk__off" aria-disabled="true">.*?Dofus Púrpura<\/span><span class="sr-only"> \(en preparación\)<\/span>/,
    )
  })

  it('el menú del móvil lista las mismas checklists y enlaza su índice', () => {
    const markup = header()
    const sheet = markup.slice(markup.indexOf('id="sheet-dofus"'))
    for (const c of CHECKLISTS) expect(sheet).toContain(`<span class="chk__t">${c.name}</span>`)
    expect(sheet).toContain('<a class="all-link" href="/checklists">Ver todas las checklists<svg')
  })

  it('sin checklists que listar, ni el panel ni el móvil enseñan el bloque de checklists', () => {
    const markup = html(
      <SiteHeader counts={counts} dofus={DOFUS} checklists={[]} initialMode="dark" />,
    )
    const panel = markup.slice(markup.indexOf('id="menu-dofus"'), markup.indexOf('</nav>'))
    const sheet = markup.slice(markup.indexOf('id="sheet-dofus"'))
    for (const part of [panel, sheet]) {
      expect(part).not.toContain('Ver todas las checklists')
      expect(part).not.toMatch(/class="chk(-mini)?"/)
    }
    expect(panel).not.toContain('<p class="panel__h">Checklists</p>')
    // Los Dofus siguen ahí.
    expect(panel).toContain('Todos los Dofus')
  })

  it('cada fila de checklist lleva su slug como clave, no el nombre', () => {
    const twins: ChecklistNavItem[] = [
      { name: 'Dofus Ocre', slug: 'lista-ocre', href: '/lista-ocre' },
      { name: 'Dofus Ocre', slug: 'checklist-ocre', href: '/checklist-ocre' },
    ]
    const list = ChecklistCards({ checklists: twins }) as React.ReactElement<{
      children: React.ReactElement[]
    }>
    expect(list.props.children.map((row) => row.key)).toEqual(['lista-ocre', 'checklist-ocre'])
  })

  it('los Dofus en preparación salen sin enlace, apagados y avisados', () => {
    const markup = header()
    const panel = markup.slice(markup.indexOf('id="menu-dofus"'), markup.indexOf('</nav>'))
    for (const name of PREPARING) {
      expect(panel).toMatch(
        new RegExp(
          `<span class="egg-soon" aria-disabled="true">(<img[^>]*>|<span class="egg-none" aria-hidden="true"></span>)<span>${name}</span><span class="sr-only"> \\(en preparación\\)</span></span>`,
        ),
      )
    }
    expect(panel).not.toContain('href="/jyfus"')
  })

  it('cuenta las guías y los logros con el espacio de miles', () => {
    const markup = header()
    expect(markup).toContain(
      '<b><span class="amount">1<span class="amount__th">\u202F</span>272</span></b>',
    )
    expect(markup).toContain('<b><span class="amount">274</span></b>')
  })

  it('con una sola guía o un solo logro, en singular', () => {
    const markup = html(
      <SiteHeader
        counts={{ guides: 1, achievements: 1 }}
        dofus={DOFUS}
        checklists={[]}
        initialMode="dark"
      />,
    )
    expect(markup).toContain(`<b>${n(1)}</b> misión paso a paso, en <b>${n(1)}</b> logro.`)
  })

  it('el singular y el plural de cada cifra van por separado', () => {
    const markup = html(
      <SiteHeader
        counts={{ guides: 3, achievements: 1 }}
        dofus={DOFUS}
        checklists={[]}
        initialMode="dark"
      />,
    )
    expect(markup).toContain(`<b>${n(3)}</b> misiones paso a paso, en <b>${n(1)}</b> logro.`)
    const other = html(
      <SiteHeader
        counts={{ guides: 1, achievements: 2 }}
        dofus={DOFUS}
        checklists={[]}
        initialMode="dark"
      />,
    )
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

describe('Well', () => {
  it('pinta el icono a su tamaño en rem, para crecer con la fuente raíz', () => {
    const markup = html(<Well image={{ src: '/img/a.webp', size: 64 }} size={36} />)
    expect(markup).toContain('width="36" height="36"')
    expect(markup).toContain('style="--icon:2.25rem"')
    // Un archivo más pequeño que el hueco se queda en su tamaño, también con la raíz al
    // 110 %: nunca se amplía.
    expect(html(<Well image={{ src: '/img/b.webp', size: 24 }} size={36} />)).toContain(
      'style="--icon:min(1.5rem, 24px)"',
    )
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

  it('Checklists lleva al índice de la app, no a la web de siempre', () => {
    const markup = footer()
    expect(markup).toContain('<a href="/checklists">Checklists</a>')
    expect(markup).not.toContain(`${LEGACY_SITE_ORIGIN}/checklists`)
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
