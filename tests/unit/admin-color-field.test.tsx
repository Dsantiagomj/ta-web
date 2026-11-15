// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// El color del brillo de un Dofus (A-22): el campo de texto de Payload con su validación en el
// navegador, y un selector de color que escribe en el mismo campo solo al soltarlo.

const form = vi.hoisted(() => ({
  value: '#d18b23' as unknown,
  disabled: false,
  submitted: false,
  setValue: vi.fn(),
  inputProps: {} as Record<string, unknown>,
  errorProps: {} as Record<string, unknown>,
}))

vi.mock('@payloadcms/ui', () => ({
  useField: () => ({
    value: form.value,
    setValue: form.setValue,
    disabled: form.disabled,
    path: 'color',
    showError: false,
    customComponents: { BeforeInput: <span data-before /> },
  }),
  useFormSubmitted: () => form.submitted,
  withCondition: (component: unknown) => component,
  FieldError: (props: Record<string, unknown>) => {
    form.errorProps = props
    return props.showError ? <p data-error>{String(props.message)}</p> : null
  },
  TextInput: (props: Record<string, unknown> & { Error: React.ReactNode }) => {
    form.inputProps = props
    return (
      <div data-text-field>
        <input data-input />
        {props.Error}
      </div>
    )
  },
}))

const { ColorField, ColorSwatch } = await import('@/components/admin/ColorField')
const { validateColor } = await import('@/lib/dofus-guides/color')
const { VideoUrlField, OptionalVideoUrlField } =
  await import('@/components/admin/ValidatedTextField')
const { validateVideoUrl } = await import('@/lib/guides/video')

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
  form.submitted = false
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const field = { name: 'color', label: 'Color', type: 'text' } as never

describe('ColorField', () => {
  const error = () => container.querySelector('[data-error]')
  const leave = () =>
    act(async () => {
      container
        .querySelector('[data-input]')!
        .dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })

  it('es el TextInput de Payload con lo que va antes del campo (el selector)', async () => {
    await act(async () => root.render(<ColorField field={field} path="color" />))
    expect(container.querySelector('[data-text-field]')).not.toBeNull()
    expect(form.inputProps).toMatchObject({ path: 'color', label: 'Color', value: '#d18b23' })
    expect(form.inputProps.BeforeInput).toBeTruthy()
  })

  it('un color mal escrito dice por qué bajo el campo al salir de él, antes de guardar', async () => {
    form.value = 'azul'
    await act(async () => root.render(<ColorField field={field} path="color" />))
    // Mientras escribe, nada.
    expect(error()).toBeNull()
    await leave()
    expect(error()?.textContent).toBe(validateColor('azul'))
    expect(form.inputProps.showError).toBe(true)
  })

  it('después de guardar lo dice aunque no haya salido del campo', async () => {
    form.value = 'azul'
    form.submitted = true
    await act(async () => root.render(<ColorField field={field} path="color" />))
    expect(error()?.textContent).toBe(validateColor('azul'))
  })

  it('un color bueno o vacío no lleva mensaje', async () => {
    for (const value of ['#2a5aaa', '']) {
      form.value = value
      form.submitted = true
      await act(async () => root.render(<ColorField field={field} path="color" />))
      expect(error()).toBeNull()
    }
  })
})

describe('los campos de vídeo', () => {
  const videoField = { name: 'url', label: 'URL del vídeo', type: 'text' } as never

  it('un enlace que no es de YouTube dice por qué; el opcional acepta el vacío', async () => {
    form.submitted = true
    form.value = 'https://vimeo.com/1'
    await act(async () => root.render(<VideoUrlField field={videoField} path="url" />))
    expect(container.querySelector('[data-error]')?.textContent).toBe(
      validateVideoUrl('https://vimeo.com/1'),
    )
    form.value = ''
    await act(async () => root.render(<OptionalVideoUrlField field={videoField} path="url" />))
    expect(container.querySelector('[data-error]')).toBeNull()
    await act(async () => root.render(<VideoUrlField field={videoField} path="url" />))
    expect(container.querySelector('[data-error]')).not.toBeNull()
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
