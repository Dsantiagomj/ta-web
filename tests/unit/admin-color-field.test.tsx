// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// El color del brillo de un Dofus (A-22): el campo de texto de Payload con su validación en el
// navegador, y un selector de color que escribe en el mismo campo solo al soltarlo.

const form = vi.hoisted(() => ({
  value: '#d18b23' as unknown,
  disabled: false,
  setValue: vi.fn(),
  textFieldProps: {} as Record<string, unknown>,
}))

vi.mock('@payloadcms/ui', () => ({
  useField: () => ({ value: form.value, setValue: form.setValue, disabled: form.disabled }),
  TextField: (props: Record<string, unknown>) => {
    form.textFieldProps = props
    return <div data-text-field />
  },
}))

const { ColorField, ColorSwatch } = await import('@/components/admin/ColorField')
const { validateColor } = await import('@/lib/dofus-guides/color')

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  form.setValue.mockClear()
  form.value = '#d18b23'
  form.disabled = false
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const field = { name: 'color', label: 'Color', type: 'text' } as never

describe('ColorField', () => {
  it('es el campo de texto de Payload, con la validación del color en el navegador', async () => {
    await act(async () => root.render(<ColorField field={field} path="color" />))
    expect(container.querySelector('[data-text-field]')).not.toBeNull()
    expect(form.textFieldProps).toMatchObject({ field, path: 'color' })
    const validate = form.textFieldProps.validate as (value: unknown) => true | string
    expect(validate('#2a5aaa')).toBe(true)
    expect(validate('')).toBe(true)
    expect(validate('#2a5aa')).toBe(validateColor('#2a5aa'))
    expect(validate('#2a5aa')).not.toBe(true)
  })
})

describe('ColorSwatch', () => {
  const swatch = () => container.querySelector('input[type="color"]') as HTMLInputElement

  it('enseña el color del campo y tiene nombre', async () => {
    await act(async () => root.render(<ColorSwatch field={field} path="color" />))
    expect(swatch().value).toBe('#d18b23')
    expect(swatch().getAttribute('aria-label')).toBe('Elegir color con el selector')
  })

  it('al arrastrar no toca el formulario; al soltar, escribe una vez', async () => {
    await act(async () => root.render(<ColorSwatch field={field} path="color" />))
    for (const color of ['#110000', '#220000', '#330000']) {
      swatch().value = color
      swatch().dispatchEvent(new Event('input', { bubbles: true }))
    }
    expect(form.setValue).not.toHaveBeenCalled()
    swatch().dispatchEvent(new Event('change', { bubbles: true }))
    expect(form.setValue).toHaveBeenCalledTimes(1)
    expect(form.setValue).toHaveBeenCalledWith('#330000')
  })

  it('sigue al campo cuando se escribe el color a mano', async () => {
    await act(async () => root.render(<ColorSwatch field={field} path="color" />))
    form.value = '#2a5aaa'
    await act(async () => root.render(<ColorSwatch field={field} path="color" />))
    expect(swatch().value).toBe('#2a5aaa')
  })

  it('desactivado o de solo lectura, no se puede usar', async () => {
    form.disabled = true
    await act(async () => root.render(<ColorSwatch field={field} path="color" />))
    expect(swatch().disabled).toBe(true)
    form.disabled = false
    await act(async () => root.render(<ColorSwatch field={field} path="color" readOnly />))
    expect(swatch().disabled).toBe(true)
  })
})
