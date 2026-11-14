// @vitest-environment happy-dom
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// PublishStatus (A-16) con lo que le daría Payload: la información del documento y si el
// formulario tiene cambios.

const doc = vi.hoisted(() => ({
  info: {} as Record<string, unknown>,
  modified: false,
}))

vi.mock('@payloadcms/ui', () => ({
  useDocumentInfo: () => doc.info,
  useFormModified: () => doc.modified,
}))

const { PublishStatus } = await import('@/components/admin/PublishStatus')

describe('PublishStatus', () => {
  it('lee el «Visible en la web» guardado, no el del formulario', () => {
    doc.info = {
      id: 3,
      hasPublishedDoc: true,
      unpublishedVersionCount: 0,
      savedDocumentData: { state: 'preparing' },
    }
    doc.modified = false
    const html = renderToStaticMarkup(<PublishStatus />)
    expect(html).toContain('No se ve en la web: En preparación')
    expect(html).toContain('ta-publish--hidden')
    expect(html).toContain('role="status"')
  })

  it('una página nueva no tiene id', () => {
    doc.info = { hasPublishedDoc: false, unpublishedVersionCount: 0 }
    doc.modified = true
    expect(renderToStaticMarkup(<PublishStatus />)).toContain(
      'No se ve en la web: aún no está guardada',
    )
  })

  it('con cambios en el formulario, lo dice debajo', () => {
    doc.info = {
      id: 3,
      hasPublishedDoc: true,
      unpublishedVersionCount: 0,
      savedDocumentData: { state: 'published' },
    }
    doc.modified = true
    const html = renderToStaticMarkup(<PublishStatus />)
    expect(html).toContain('En la web: visible')
    expect(html).toContain('Lo que acabas de cambiar aún no está guardado.')
  })
})
