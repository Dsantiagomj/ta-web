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
const { COPIED_RESET_MS, CopyValueDescription } =
  await import('@/components/admin/CopyValueDescription')
const { LoginWelcome, PanelIcon, PanelLogo } = await import('@/components/admin/PanelBrand')

// React necesita saber que corre en pruebas para que act() espere sus efectos.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/**
 * Deja correr el lote de nombres (se junta en un setTimeout) y su respuesta. Va en su propio
 * act, después del que pinta: React lanza los efectos al cerrar ese act.
 */
const settle = () => new Promise((resolve) => setTimeout(resolve, 20))

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
      vi.fn(async () => Response.json({ docs: [{ id: 1976, name: 'Seis pies bajo tierra' }] })),
    )
    row.data = { quest: 1976, kind: 'mandatory' }
    row.rowNumber = 2
    act(() =>
      root.render(<RelationRowLabel singular="Misión" relationField="quest" relationTo="quests" />),
    )
    await act(settle)
    expect(container.textContent).toBe('Misión 3: Seis pies bajo tierra')
  })

  it('con misiones alternativas, nombra la primera y dice cuántas más hay', async () => {
    const fetchMock = vi.fn(async (_url: string) =>
      Response.json({ docs: [{ id: 501, name: 'La forja' }] }),
    )
    vi.stubGlobal('fetch', fetchMock)
    row.data = { name: '', quests: [501, 502, 503] }
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
    await act(settle)
    expect(container.textContent).toBe('Misión 1: La forja (o 2 más)')
    // Solo hace falta el nombre de la primera.
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('where[id][in]=501&')
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

  it('mal escrita, no enseña una dirección falsa: dice lo que diría al guardar', () => {
    form.fields = { slug: { value: 'La Misión' } }
    const html = renderToStaticMarkup(<SlugDescription {...fieldProps} help="Ayuda" />)
    expect(html).not.toContain('torrentearcano.com')
    expect(html).toContain('La dirección solo admite minúsculas')
  })

  it('una ruta del sitio o de la tabla de redirecciones tampoco se enseña como dirección', () => {
    form.fields = { slug: { value: 'sistema' } }
    expect(renderToStaticMarkup(<SlugDescription {...fieldProps} help="Ayuda" />)).toContain(
      '/sistema es una página del sitio',
    )
    form.fields = { slug: { value: 'home' } }
    expect(renderToStaticMarkup(<SlugDescription {...fieldProps} help="Ayuda" />)).toContain(
      'tabla de redirecciones',
    )
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

  const renderCopy = () =>
    act(() =>
      root.render(
        <CopyValueDescription path="steps.0.stepId" help="Ayuda" what="el identificador" />,
      ),
    )
  const status = () => container.querySelector('[role="status"]')?.textContent
  const copyButton = () => container.querySelector('button') as HTMLButtonElement

  it('«Copiado» se borra a los pocos segundos', async () => {
    vi.useFakeTimers()
    try {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: vi.fn(async () => {}) },
        configurable: true,
      })
      form.fields = { 'steps.0.stepId': { value: 'b7f1c2' } }
      renderCopy()
      await act(async () => copyButton().click())
      expect(status()).toBe('Copiado')
      await act(async () => vi.advanceTimersByTime(COPIED_RESET_MS))
      expect(status()).toBe('')
    } finally {
      vi.useRealTimers()
    }
  })

  it('«Copiado» se borra si cambia el valor', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn(async () => {}) },
      configurable: true,
    })
    form.fields = { 'steps.0.stepId': { value: 'b7f1c2' } }
    renderCopy()
    await act(async () => copyButton().click())
    expect(status()).toBe('Copiado')
    form.fields = { 'steps.0.stepId': { value: 'c8a2d3' } }
    renderCopy()
    expect(status()).toBe('')
  })

  it('cada copia vuelve a anunciarse: el aviso se vacía antes de decir «Copiado» otra vez', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn(async () => {}) },
      configurable: true,
    })
    form.fields = { 'steps.0.stepId': { value: 'b7f1c2' } }
    renderCopy()
    await act(async () => copyButton().click())
    const seen: string[] = []
    const region = container.querySelector('[role="status"]') as HTMLElement
    const observer = new MutationObserver(() => seen.push(region.textContent ?? ''))
    observer.observe(region, { childList: true, characterData: true, subtree: true })
    await act(async () => copyButton().click())
    await act(async () => {})
    observer.disconnect()
    expect(seen).toContain('')
    expect(status()).toBe('Copiado')
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
