// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// PanelA11y (A-21): cuándo revisa el panel. No antes de que React termine de montar, una vez
// por fotograma, y nunca por escribir dentro de un editor de texto.

const fixes = vi.hoisted(() => ({ calls: 0 }))
vi.mock('@/lib/admin/a11y-fixes', () => ({
  applyPanelA11yFixes: () => {
    fixes.calls += 1
    return 0
  },
}))

const { PanelA11y } = await import('@/components/admin/PanelA11y')

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

let container: HTMLElement
let root: Root

beforeEach(() => {
  fixes.calls = 0
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('PanelA11y', () => {
  it('la primera revisión espera a un fotograma después de montar', async () => {
    // Un act síncrono monta y corre los efectos sin dejar pasar ningún fotograma.
    act(() => root.render(<PanelA11y>hola</PanelA11y>))
    expect(fixes.calls).toBe(0)
    await act(frame)
    expect(fixes.calls).toBe(1)
  })

  it('un cambio del panel se revisa en el siguiente fotograma, una vez', async () => {
    await act(async () => root.render(<PanelA11y>hola</PanelA11y>))
    await act(frame)
    const before = fixes.calls
    document.body.append(document.createElement('div'))
    document.body.append(document.createElement('div'))
    await act(tick)
    await act(frame)
    expect(fixes.calls).toBe(before + 1)
  })

  it('escribir en un editor de texto no lanza revisiones', async () => {
    const editor = document.createElement('div')
    editor.setAttribute('contenteditable', 'true')
    const text = document.createTextNode('Hola')
    const paragraph = document.createElement('p')
    paragraph.append(text)
    editor.append(paragraph)
    document.body.append(editor)
    await act(async () => root.render(<PanelA11y>hola</PanelA11y>))
    await act(frame)
    const before = fixes.calls
    text.data = 'Hola, Torre'
    paragraph.append(document.createElement('span'))
    await act(tick)
    await act(frame)
    expect(fixes.calls).toBe(before)
    editor.remove()
  })
})
