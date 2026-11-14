// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// La vista de la guía (A-14) y su enlace del menú, con la plantilla de Payload sustituida.

const template = vi.hoisted(() => ({ props: {} as Record<string, unknown> }))
const nav = vi.hoisted(() => ({ pathname: '/admin' }))

vi.mock('@payloadcms/next/templates', () => ({
  DefaultTemplate: (props: Record<string, unknown> & { children: React.ReactNode }) => {
    template.props = props
    return <div data-template>{props.children}</div>
  },
}))
vi.mock('@payloadcms/ui', () => ({
  Gutter: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  useConfig: () => ({ config: { routes: { admin: '/admin' } } }),
}))
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`redirect:${to}`)
  },
  usePathname: () => nav.pathname,
}))

const { PanelGuide } = await import('@/components/admin/PanelGuide')
const { PanelGuideNavLink } = await import('@/components/admin/PanelGuideNavLink')

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const collection = (
  slug: string,
  plural: string | Record<string, string>,
  description: unknown,
) => ({
  slug,
  labels: { plural },
  admin: { description },
})

function props({ user = { id: 1, role: 'editor' } as unknown } = {}) {
  const visibleEntities = Object.freeze({
    collections: Object.freeze(['quest-guides', 'media']),
    globals: Object.freeze([]),
  })
  const req = {
    user,
    i18n: { language: 'es', fallbackLanguage: 'es' },
    payload: {
      config: {
        routes: { admin: '/admin' },
        collections: [
          collection('quest-guides', 'Guías de misiones', 'Descripción saneada de las guías'),
          collection('media', { es: 'Imágenes' }, 'Las imágenes, saneada'),
          // No la ve: no sale en visibleEntities.
          collection('users', 'Usuarios del panel', 'Las cuentas'),
        ],
      },
    },
  }
  return {
    initPageResult: {
      req,
      locale: { code: 'es' },
      permissions: {
        collections: { 'quest-guides': { read: true }, media: { read: false } },
      },
      visibleEntities,
    },
    params: {},
    searchParams: {},
  } as never
}

describe('PanelGuide', () => {
  it('pasa a la plantilla la petición y una copia de lo visible, como las vistas de Payload', () => {
    const view = props()
    renderToStaticMarkup(PanelGuide(view))
    const { initPageResult } = view as { initPageResult: Record<string, unknown> }
    expect(template.props.req).toBe(initPageResult.req)
    expect(template.props.viewType).toBe('panelGuide')
    expect(template.props.visibleEntities).not.toBe(initPageResult.visibleEntities)
    expect(template.props.visibleEntities).toEqual({
      collections: ['quest-guides', 'media'],
      globals: [],
    })
    expect(
      Object.isFrozen((template.props.visibleEntities as { collections: unknown }).collections),
    ).toBe(false)
  })

  it('lista solo lo que la cuenta puede ver y leer, con la descripción ya saneada', () => {
    const html = renderToStaticMarkup(PanelGuide(props()))
    expect(html).toContain('Guías de misiones')
    expect(html).toContain('Descripción saneada de las guías')
    // Sin permiso de lectura, o fuera de lo visible: no sale.
    expect(html).not.toContain('Las imágenes, saneada')
    expect(html).not.toContain('Usuarios del panel')
  })

  it('dice qué cuenta tiene quien lee', () => {
    expect(renderToStaticMarkup(PanelGuide(props()))).toContain('Tu cuenta es de editor.')
  })

  it('sin sesión, manda al inicio de sesión', () => {
    expect(() => PanelGuide(props({ user: null }))).toThrow(
      'redirect:/admin/login?redirect=/admin/guia',
    )
  })
})

describe('PanelGuideNavLink', () => {
  async function render() {
    const container = document.createElement('div')
    const root = createRoot(container)
    await act(async () => root.render(<PanelGuideNavLink />))
    const link = container.querySelector('a')!.cloneNode(true) as HTMLAnchorElement
    const indicator = container.querySelector('.nav__link-indicator')
    act(() => root.unmount())
    return { link, indicator }
  }

  it('en la guía, el enlace del menú está marcado como la página actual', async () => {
    nav.pathname = '/admin/guia'
    const { link, indicator } = await render()
    expect(link.getAttribute('aria-current')).toBe('page')
    expect(indicator).not.toBeNull()
  })

  it('en otra página, no', async () => {
    nav.pathname = '/admin/collections/quest-guides'
    const { link, indicator } = await render()
    expect(link.getAttribute('href')).toBe('/admin/guia')
    expect(link.hasAttribute('aria-current')).toBe(false)
    expect(indicator).toBeNull()
  })
})
