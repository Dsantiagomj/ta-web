// @vitest-environment happy-dom
import type { FieldDescriptionClientProps } from 'payload'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Los componentes propios del panel (src/components/admin/). Payload les da la fila y el
// formulario por sus hooks; aquí los sustituimos por valores fijos.

const row = vi.hoisted(() => ({ data: {} as unknown, rowNumber: 0 as number | undefined }))
const form = vi.hoisted(() => ({ fields: {} as Record<string, { value?: unknown }> }))

vi.mock('@payloadcms/ui', () => ({
  useRowLabel: () => ({ data: row.data, rowNumber: row.rowNumber, path: 'steps.0' }),
  useFormFields: (selector: (state: [Record<string, { value?: unknown }>]) => unknown) =>
    selector([form.fields]),
  useConfig: () => ({ config: { serverURL: '', routes: { api: '/api' } } }),
}))

const { ChecklistStepLabel, RelationRowLabel, SegmentLabel, TextRowLabel } =
  await import('@/components/admin/RowLabels')
const { SlugDescription } = await import('@/components/admin/SlugDescription')
const { CopyValueDescription } = await import('@/components/admin/CopyValueDescription')
const { LoginWelcome, PanelIcon, PanelLogo } = await import('@/components/admin/PanelBrand')

// React necesita saber que corre en pruebas para que act() espere sus efectos.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
  form.fields = {}
})

const fieldProps = { path: 'slug' } as unknown as FieldDescriptionClientProps

describe('etiquetas de las filas', () => {
  it('un paso se llama por su primer tramo', () => {
    row.data = { segments: [{ kind: 'plain', text: 'Habla con Ganymede.' }] }
    row.rowNumber = 1
    expect(renderToStaticMarkup(<ChecklistStepLabel />)).toContain('Paso 2: Habla con Ganymede.')
  })

  it('un tramo dice su tipo y su texto', () => {
    row.data = { kind: 'stop', text: 'Para tras la pelea.' }
    row.rowNumber = 0
    expect(renderToStaticMarkup(<SegmentLabel />)).toContain(
      'Tramo 1 (Detente aquí): Para tras la pelea.',
    )
  })

  it('una fila se llama por el campo de texto que se le indica', () => {
    row.data = { name: 'Recursos' }
    row.rowNumber = 0
    expect(renderToStaticMarkup(<TextRowLabel singular="Grupo" field="name" />)).toContain(
      'Grupo 1: Recursos',
    )
  })

  it('con texto propio, la fila de una relación no pide nada a la API', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    row.data = { name: 'Clase', quests: [12, 13] }
    row.rowNumber = 0
    act(() =>
      root.render(
        <RelationRowLabel
          singular="Misión"
          textField="name"
          relationField="quests"
          relationTo="quests"
        />,
      ),
    )
    expect(container.textContent).toBe('Misión 1: Clase')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sin texto, la fila de una relación se llama por el nombre del documento enlazado', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ name: 'Seis pies bajo tierra' })),
    )
    row.data = { quest: 1976, kind: 'mandatory' }
    row.rowNumber = 2
    await act(async () =>
      root.render(<RelationRowLabel singular="Misión" relationField="quest" relationTo="quests" />),
    )
    expect(container.textContent).toBe('Misión 3: Seis pies bajo tierra')
  })

  it('mientras llega el nombre, o si no llega, queda el número', () => {
    row.data = {}
    row.rowNumber = 0
    expect(
      renderToStaticMarkup(
        <RelationRowLabel singular="Objeto" relationField="item" relationTo="items" />,
      ),
    ).toContain('Objeto 1')
  })
})

describe('SlugDescription', () => {
  it('enseña la ayuda y la dirección completa en la web', () => {
    form.fields = { slug: { value: 'seis-pies-bajo-tierra' } }
    const html = renderToStaticMarkup(
      <SlugDescription {...fieldProps} help="La dirección de la guía." />,
    )
    expect(html).toContain('La dirección de la guía.')
    expect(html).toContain('torrentearcano.com/seis-pies-bajo-tierra')
  })

  it('en un metalogro, enseña su panel en el índice de metalogros', () => {
    form.fields = { slug: { value: 'metalogro-astrub' } }
    expect(
      renderToStaticMarkup(<SlugDescription {...fieldProps} help="Ayuda" address="metalogro" />),
    ).toContain('torrentearcano.com/metalogros#astrub')
  })

  it('sin dirección, dice que hay que escribirla', () => {
    form.fields = { slug: { value: '' } }
    expect(
      renderToStaticMarkup(<SlugDescription {...fieldProps} help="La dirección de la guía." />),
    ).toContain('Escribe la dirección para ver dónde se verá la página.')
  })
})

describe('CopyValueDescription', () => {
  it('copia el valor del campo de un clic y lo confirma', async () => {
    const writeText = vi.fn(async () => {})
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    form.fields = { 'steps.0.stepId': { value: 'b7f1c2' } }
    act(() =>
      root.render(
        <CopyValueDescription
          path="steps.0.stepId"
          help="Guarda el progreso de cada persona."
          what="el identificador"
        />,
      ),
    )
    expect(container.textContent).toContain('Guarda el progreso de cada persona.')
    const button = container.querySelector('button')
    expect(button?.getAttribute('aria-label')).toBe('Copiar el identificador')
    expect(button?.getAttribute('type')).toBe('button')
    await act(async () => button?.click())
    expect(writeText).toHaveBeenCalledWith('b7f1c2')
    expect(container.querySelector('[role="status"]')?.textContent).toBe('Copiado')
  })

  it('sin valor todavía, no enseña el botón', () => {
    form.fields = {}
    act(() =>
      root.render(
        <CopyValueDescription path="steps.0.stepId" help="Ayuda" what="el identificador" />,
      ),
    )
    expect(container.querySelector('button')).toBeNull()
  })
})

describe('la marca del panel', () => {
  it('el logo del inicio de sesión dice Torrente Arcano con el emblema decorativo', () => {
    const html = renderToStaticMarkup(<PanelLogo />)
    expect(html).toContain('Torrente')
    expect(html).toContain('Arcano')
    expect(html).toContain('aria-hidden="true"')
  })

  it('el icono del menú es el emblema, con nombre para los lectores de pantalla', () => {
    const html = renderToStaticMarkup(<PanelIcon />)
    expect(html).toContain('<svg')
    expect(html).toContain('Torrente Arcano')
  })

  it('el inicio de sesión da la bienvenida en español, de tú', () => {
    const html = renderToStaticMarkup(<LoginWelcome />)
    expect(html).toContain('Este es el panel de Torrente Arcano')
    expect(html).toContain('Entra con tu correo')
  })
})
