// @vitest-environment happy-dom
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DofusPart } from '@/components/dofus/DofusGuideParts'
import { GuideRichText } from '@/components/game/GuideRichText'
import { VideoFacade } from '@/components/game/VideoFacade'
import { Author } from '@/components/home/Author'
import { LiveStrip } from '@/components/home/LiveStrip'
import type { DofusNavItem } from '@/components/site/nav'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import type { DofusQuestCard } from '@/lib/dofus-guides/page'
import type { RichTextState } from '@/lib/guides/page'
import { isExternalHref } from '@/lib/site/external'
import { LEGACY_SITE_ORIGIN } from '@/lib/site/legacy'

// Un enlace a otra web (Discord, Twitch, Kick, YouTube, Ko-fi…) se abre en otra pestaña y lo
// dice al lector de pantalla; uno del sitio, en la misma (DESIGN.md, Accessibility).
const NEW_TAB = ' (se abre en otra pestaña)'

/** Los enlaces de un trozo de página, como los lee el navegador. */
function links(node: React.ReactNode): HTMLAnchorElement[] {
  const holder = document.createElement('div')
  holder.innerHTML = renderToStaticMarkup(node)
  return [...holder.querySelectorAll<HTMLAnchorElement>('a[href]')]
}

/** El nombre accesible del enlace: su aria-label o su texto, el oculto incluido. */
const accessibleName = (a: HTMLAnchorElement) => a.getAttribute('aria-label') ?? a.textContent ?? ''

/** Lo que se le pide a cada enlace de una pieza, con las pruebas a la vista si falla. */
function expectNewTabRule(node: React.ReactNode, minExternal: number) {
  const all = links(node)
  const external = all.filter((a) => isExternalHref(a.getAttribute('href')!))
  expect(external.length).toBeGreaterThanOrEqual(minExternal)
  for (const a of all) {
    const href = a.getAttribute('href')!
    if (isExternalHref(href)) {
      expect(a.getAttribute('target'), href).toBe('_blank')
      expect(a.getAttribute('rel')?.split(/\s+/), href).toContain('noopener')
      expect(accessibleName(a), href).toMatch(new RegExp(`\\S${escape(NEW_TAB)}$`))
    } else {
      expect(a.getAttribute('target'), href).toBeNull()
      expect(accessibleName(a), href).not.toContain(NEW_TAB.trim())
    }
  }
}

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

describe('isExternalHref', () => {
  it('otra web es externa', () => {
    expect(isExternalHref('https://discord.gg/wgCxwd7b3r')).toBe(true)
    expect(isExternalHref('https://www.twitch.tv/torrentearcano')).toBe(true)
    expect(isExternalHref('http://ko-fi.com/torrentearcano')).toBe(true)
  })

  it('el sitio, sus anclas y la web de siempre de Torre no lo son', () => {
    for (const href of [
      '/',
      '/aprendizaje-escudero',
      '#contenido',
      '?tema=bonta',
      `${LEGACY_SITE_ORIGIN}/checklist-silvestre`,
      'https://torrentearcano.com/clases-1',
      'https://dev.torrentearcano.com/guias-dofus',
    ]) {
      expect(isExternalHref(href), href).toBe(false)
    }
  })

  it('lo que no es una web tampoco', () => {
    expect(isExternalHref('mailto:torre@example.com')).toBe(false)
    expect(isExternalHref('tel:+34000000000')).toBe(false)
  })

  it('una dirección sin protocolo u otro dominio que empieza igual sí lo son', () => {
    expect(isExternalHref('//cdn.example.com/x.png')).toBe(true)
    expect(isExternalHref('https://torrentearcano.com.example.com/')).toBe(true)
    expect(isExternalHref('https://faketorrentearcano.com/')).toBe(true)
  })
})

describe('los enlaces a otras webs se abren en otra pestaña', () => {
  const egg = (slug: string) => ({ src: `/media/${slug}.webp`, size: 128 })
  const DOFUS: DofusNavItem[] = [{ name: 'Dofawa', href: '/dofawa', image: egg('dofawa') }]

  it('la cabecera, con las redes y el Ko-fi de la hoja del móvil', () => {
    expectNewTabRule(
      <SiteHeader
        counts={{ guides: 10, achievements: 2 }}
        dofus={DOFUS}
        checklists={[
          {
            name: 'Dofus Silvestre',
            slug: 'checklist-silvestre',
            href: `${LEGACY_SITE_ORIGIN}/checklist-silvestre`,
            legacy: true,
          },
        ]}
        initialMode="dark"
      />,
      // Twitch, Kick, YouTube y Discord de la hoja, su Ko-fi y el de la cabecera.
      6,
    )
  })

  it('el pie: el Discord, el Ko-fi y los canales', () => {
    expectNewTabRule(<SiteFooter year={2026} />, 5)
  })

  it('Torre en la portada, con y sin directo', () => {
    expectNewTabRule(<Author live={{ live: false }} />, 4)
    expectNewTabRule(<Author live={{ live: true, title: 'Misiones' }} />, 5)
  })

  it('la tarjeta del directo', () => {
    expectNewTabRule(<LiveStrip live={{ live: true }} />, 1)
  })

  it('un vídeo que no es de YouTube se queda en un enlace a su web', () => {
    expectNewTabRule(<VideoFacade url="https://vimeo.com/1" title="Combate" />, 1)
  })

  it('lo que Torre enlaza a mano en una guía de Dofus', () => {
    const quest = {
      kind: 'link',
      position: 1,
      title: 'Logro: Cazadores cazados',
      href: 'https://dofusdb.fr/es/database/achievement/1',
    } as DofusQuestCard
    const pieces = {
      position: 2,
      title: 'La fatalidad - El destino',
      links: [
        { text: 'La fatalidad', href: '/la-fatalidad' },
        { text: ' - ' },
        { text: 'El destino', href: 'https://www.youtube.com/watch?v=1' },
      ],
    } as DofusQuestCard
    expectNewTabRule(<DofusPart part={{ kind: 'quests', quests: [quest, pieces] }} />, 2)
  })

  it('un enlace de la prosa de una guía a otra web, aunque no marcara «nueva pestaña»', () => {
    const link = (url: string, newTab: boolean) => ({
      type: 'link',
      version: 1,
      fields: { url, newTab, linkType: 'custom' },
      children: [{ type: 'text', text: 'canal', format: 0, version: 1 }],
    })
    const content = {
      root: {
        type: 'root',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        children: [
          {
            type: 'paragraph',
            version: 1,
            children: [
              link('https://www.youtube.com/@TorrenteArcano', false),
              link('https://www.twitch.tv/torrentearcano', true),
              link('/aprendizaje-escudero', false),
            ],
          },
        ],
      },
    } as unknown as RichTextState
    expectNewTabRule(<GuideRichText content={content} />, 2)
  })
})
