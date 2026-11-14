// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// PublishStatus (A-16) con lo que le daría Payload: la información del documento, si el
// formulario tiene cambios y la versión publicada, que pide a la API.

const doc = vi.hoisted(() => ({
  info: {} as Record<string, unknown>,
  modified: false,
}))

vi.mock('@payloadcms/ui', () => ({
  useDocumentInfo: () => doc.info,
  useFormModified: () => doc.modified,
  useConfig: () => ({ config: { serverURL: '', routes: { api: '/api' } } }),
}))

const { PublishStatus } = await import('@/components/admin/PublishStatus')

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLElement
let root: Root
let requested: string[]

function answer(body: unknown) {
  requested = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      requested.push(url)
      return { ok: true, json: async () => body }
    }),
  )
}

async function render() {
  await act(async () => root.render(<PublishStatus />))
  await act(() => new Promise((resolve) => setTimeout(resolve, 10)))
  return container.textContent ?? ''
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  doc.modified = false
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
})

const info = (over: Record<string, unknown> = {}) => ({
  id: 3,
  collectionSlug: 'achievement-pages',
  unpublishedVersionCount: 0,
  isTrashed: false,
  savedDocumentData: { state: 'published', updatedAt: '2026-11-14T10:00:00.000Z' },
  ...over,
})

describe('PublishStatus', () => {
  it('pide la versión publicada y dice lo que ve un visitante con ella', async () => {
    doc.info = info({ unpublishedVersionCount: 1 })
    // El borrador dice Publicada; lo publicado sigue En preparación.
    answer({ id: 3, _status: 'published', state: 'preparing' })
    const text = await render()
    expect(requested[0]).toMatch(/^\/api\/achievement-pages\/3\?/)
    expect(requested[0]).toContain('draft=false')
    expect(text).toContain('En la web: sale apagado, sin página')
    expect(text).toContain('Tienes cambios sin publicar')
    expect(container.querySelector('[role="status"]')).not.toBeNull()
  })

  it('si lo guardado nunca se publicó, es un borrador', async () => {
    doc.info = info()
    answer({ id: 3, _status: 'draft', state: 'published' })
    expect(await render()).toContain('No se ve en la web: es un borrador')
  })

  it('en la papelera no pide nada', async () => {
    doc.info = info({ isTrashed: true })
    answer({})
    expect(await render()).toContain('No se ve en la web: está en la papelera')
    expect(requested).toEqual([])
  })

  it('una página nueva no tiene id ni versión publicada', async () => {
    doc.info = info({ id: undefined, savedDocumentData: undefined })
    doc.modified = true
    answer({})
    expect(await render()).toContain('No se ve en la web: aún no está guardada')
    expect(requested).toEqual([])
  })

  it('vuelve a preguntar al guardar o publicar', async () => {
    doc.info = info()
    answer({ id: 3, _status: 'published', state: 'published' })
    expect(await render()).toContain('En la web: visible')
    doc.info = info({
      savedDocumentData: { state: 'published', updatedAt: '2026-11-14T11:00:00.000Z' },
    })
    answer({ id: 3, _status: 'published', state: 'preparing' })
    expect(await render()).toContain('En la web: sale apagado, sin página')
  })
})
