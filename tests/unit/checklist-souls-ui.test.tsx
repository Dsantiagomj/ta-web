// @vitest-environment happy-dom
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { SoulsList, SoulsStrip, SoulsTools } from '@/components/checklist/SoulsParts'
import { startSouls } from '@/components/checklist/souls-ui'
import { soulsView, type SoulsData } from '@/lib/checklists/souls'
import type { Checklist } from '@/payload-types'

// La isla del Ocre sobre el HTML que pinta el servidor: React es dueño de cada fila, así que la
// isla nunca las mueve, y puede pararse y volver a arrancar (la vista previa del panel lo hace al
// guardar) sin perder lo elegido.

const bring = (monsterId: number) => ({ kind: 'bring', monsterId, text: 'Lleva 1 alma' })

const data: SoulsData = {
  checklist: {
    id: 9,
    name: 'Almas del Ocre',
    slug: 'lista-ocre',
    description: 'Las almas.',
    kind: 'souls',
    legacy: { prefix: 'cosecha:' },
    updatedAt: '2026-11-14T00:00:00.000Z',
  } as unknown as Checklist,
  stages: [{ objectives: [bring(928)] }, { objectives: [bring(500), bring(501)] }],
  monsters: {
    928: { name: 'Mob Lasponja', levels: [20], boss: true, subAreaId: 1 },
    500: { name: 'Pikopi', levels: [55], archmonster: true, subAreaId: 2 },
    501: { name: 'Arakna Maja', levels: [12], archmonster: true, subAreaId: 1 },
  },
  subareas: {
    1: { name: 'Castillo de Arena', areaName: 'Astrub' },
    2: { name: 'Bosque', areaName: 'Amakna' },
  },
  dungeons: [{ name: 'Castillo de Arena', level: 25, bosses: [928] }],
  siteUrl: 'https://torrentearcano.com',
}
const view = soulsView(data)

const $ = <T extends Element = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!
const $$ = <T extends Element = HTMLElement>(selector: string) => [
  ...document.querySelectorAll<T>(selector),
]
// La vista que enseña checklist.css: la que dice `.sl-win` y, sin nada, por etapa. (happy-dom
// guarda el primer getComputedStyle y no ve el cambio de un antepasado.)
const shownView = () => $$(`[data-sl-view="${$('.sl-win').dataset.slShown ?? 'stage'}"]`)
/** Las almas que se ven: en la vista elegida, en un grupo que se ve y sin ocultar. */
const visible = () =>
  shownView()
    .flatMap((el) => [
      ...el.querySelectorAll<HTMLElement>('[data-sl-group]:not([hidden]) .sl-soul:not([hidden])'),
    ])
    .map((row) => row.querySelector('.sl-soul__n')!.textContent)
const click = (selector: string) => $(selector).click()
const tick = (id: number) => {
  const box = shownView()[0].querySelector<HTMLInputElement>(`[data-sl-own="${id}"]`)!
  box.checked = !box.checked
  box.dispatchEvent(new Event('change', { bubbles: true }))
}

let stop: (() => void) | undefined
beforeEach(() => {
  localStorage.clear()
  document.documentElement.setAttribute('data-js', '')
  document.body.innerHTML = renderToStaticMarkup(
    <>
      <section className="ck-win sl-win">
        <SoulsStrip view={view} />
        <SoulsTools view={view} />
        <SoulsList view={view} />
      </section>
      <div className="ck-toast" role="status" data-ck-toast hidden />
    </>,
  )
})
afterEach(() => stop?.())

describe('marcar se nota', () => {
  const just = (id: number) => $$(`[data-soul="${id}"]`).map((row) => row.getAttribute('data-just'))
  const toast = () => $('[data-ck-toast]')

  it('marcar y desmarcar un alma la anima en las dos vistas; lo que llega de otra pestaña, no', () => {
    stop = startSouls(view.island)
    expect(just(500)).toEqual([null, null])
    tick(500)
    expect(just(500)).toEqual(['on', 'on'])
    tick(500)
    expect(just(500)).toEqual(['off', 'off'])
    localStorage.setItem(
      'ta-web:progress',
      JSON.stringify({ v: 1, quests: {}, steps: {}, souls: { 501: 1 } }),
    )
    window.dispatchEvent(new StorageEvent('storage', { key: 'ta-web:progress' }))
    expect(just(501)).toEqual([null, null])
  })

  it('completar una etapa la celebra una vez, con un aviso; quitar una la deja sin completar', () => {
    stop = startSouls(view.island)
    const group = () => $('[data-sl-view="stage"] [data-sl-group="2"]')
    const button = () => $('[data-sl-stage="2"]')
    tick(500)
    expect(group().hasAttribute('data-complete')).toBe(false)
    tick(501)
    expect(group().hasAttribute('data-complete')).toBe(true)
    expect(group().hasAttribute('data-cheer')).toBe(true)
    expect(button().hasAttribute('data-complete')).toBe(true)
    expect(button().hasAttribute('data-cheer')).toBe(true)
    // Y el alma que la completa, donde se ha hecho clic: el título puede quedar fuera de la vista.
    expect($$('[data-soul="501"]').map((row) => row.hasAttribute('data-cheer'))).toEqual([
      true,
      true,
    ])
    expect($$('[data-soul="500"][data-cheer]')).toEqual([])
    expect(toast().textContent).toBe('¡Etapa 2 completa!')
    expect(toast().hidden).toBe(false)
    tick(501)
    expect(group().hasAttribute('data-complete')).toBe(false)
    expect(group().hasAttribute('data-cheer')).toBe(false)
  })

  it('una etapa que ya estaba completa al cargar se ve completa, sin celebrarla', () => {
    localStorage.setItem(
      'ta-web:progress',
      JSON.stringify({ v: 1, quests: {}, steps: {}, souls: { 928: 1 } }),
    )
    stop = startSouls(view.island)
    const group = $('[data-sl-view="stage"] [data-sl-group="1"]')
    expect(group.hasAttribute('data-complete')).toBe(true)
    expect(group.hasAttribute('data-cheer')).toBe(false)
    expect(toast().hidden).toBe(true)
  })

  it('con la última alma, el aviso es de todas', () => {
    stop = startSouls(view.island)
    tick(928)
    tick(500)
    tick(501)
    expect(toast().textContent).toBe('¡Tienes todas las almas!')
  })
})

describe('la isla del Ocre', () => {
  it('por región no mueve las filas: cada vista pinta las suyas, con ids que no se repiten', () => {
    const parents = $$('.sl-soul').map((row) => row.parentElement)
    stop = startSouls(view.island)
    click('[data-sl-by="region"]')
    expect($$('.sl-soul').map((row) => row.parentElement)).toEqual(parents)
    expect(visible()).toEqual(['Mob Lasponja', 'Arakna Maja', 'Pikopi'])
    const ids = $$('[id]').map((el) => el.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('al volver a arrancar sigue como estaba: la vista, el tipo y lo que se ve', () => {
    stop = startSouls(view.island)
    click('[data-sl-by="region"]')
    click('[data-sl-type="archi"]')
    stop()
    stop = startSouls(view.island)
    expect($('[data-sl-by="region"]').getAttribute('aria-pressed')).toBe('true')
    expect($('[data-sl-by="stage"]').getAttribute('aria-pressed')).toBe('false')
    expect($('[data-sl-type="archi"]').getAttribute('aria-pressed')).toBe('true')
    expect(visible()).toEqual(['Arakna Maja', 'Pikopi'])
  })

  it('el aviso para lectores de pantalla cambia con los filtros, no al marcar', () => {
    stop = startSouls(view.island)
    const status = $('[data-sl-status]')
    expect(status.textContent).toBe('')
    tick(500)
    expect(status.textContent).toBe('')
    click('[data-sl-type="boss"]')
    expect(status.textContent).toBe('1 alma')
    click('[data-sl-type="all"]')
    const announced = status.textContent
    tick(501)
    expect(status.textContent).toBe(announced)
  })

  it('lo que se escribió en el buscador y la casilla de ocultar antes de cargar cuenta', () => {
    localStorage.setItem(
      'ta-web:progress',
      JSON.stringify({ v: 1, quests: {}, steps: {}, souls: { 928: 1 } }),
    )
    $<HTMLInputElement>('[data-sl-q]').value = 'a'
    $<HTMLInputElement>('[data-sl-hide]').checked = true
    stop = startSouls(view.island)
    // «a» está en las tres; Mob Lasponja se tiene y se oculta.
    expect(visible()).toEqual(['Pikopi', 'Arakna Maja'])
  })

  it('sin JavaScript no salen los controles que no hacen nada: el buscador tampoco', () => {
    expect($('[data-sl-q]').closest('.ck-js')).not.toBeNull()
    expect($('[data-sl-hide]').closest('.ck-js')).not.toBeNull()
    expect($('[data-sl-stages]').closest('.ck-js')).not.toBeNull()
  })
})

describe('las etapas al lado de la lista', () => {
  const stageButtons = () =>
    $$('[data-sl-stage]').map((button) => [
      button.dataset.slStage,
      button.querySelector('[data-sl-sc]')!.textContent,
      button.getAttribute('aria-pressed'),
    ])

  it('todas las etapas con lo que se tiene de cada una, y «Todas» para volver', () => {
    stop = startSouls(view.island)
    tick(500)
    expect(stageButtons()).toEqual([
      ['all', '1/3', 'true'],
      ['1', '0/1', 'false'],
      ['2', '1/2', 'false'],
    ])
  })

  it('elegir una etapa enseña solo sus almas; «Todas» las vuelve a enseñar', () => {
    stop = startSouls(view.island)
    click('[data-sl-stage="2"]')
    expect(visible()).toEqual(['Pikopi', 'Arakna Maja'])
    expect($('[data-sl-stage="2"]').getAttribute('aria-pressed')).toBe('true')
    expect($('[data-sl-status]').textContent).toBe('2 almas')
    click('[data-sl-stage="all"]')
    expect(visible()).toEqual(['Mob Lasponja', 'Pikopi', 'Arakna Maja'])
  })

  it('la etapa elegida sigue al volver a arrancar, y por región no filtra', () => {
    stop = startSouls(view.island)
    click('[data-sl-stage="1"]')
    stop()
    stop = startSouls(view.island)
    expect($('[data-sl-stage="1"]').getAttribute('aria-pressed')).toBe('true')
    expect(visible()).toEqual(['Mob Lasponja'])
    click('[data-sl-by="region"]')
    expect(visible()).toEqual(['Mob Lasponja', 'Arakna Maja', 'Pikopi'])
  })
})

describe('el buscador y las tarjetas', () => {
  const search = (text: string) => {
    const input = $<HTMLInputElement>('[data-sl-q]')
    input.value = text
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }

  it('busca por nivel, por rango de niveles, por región y por mazmorra', () => {
    stop = startSouls(view.island)
    search('55')
    expect(visible()).toEqual(['Pikopi'])
    search('10-25')
    expect(visible()).toEqual(['Mob Lasponja', 'Arakna Maja'])
    search('amakna')
    expect(visible()).toEqual(['Pikopi'])
    search('castillo')
    expect(visible()).toEqual(['Mob Lasponja', 'Arakna Maja'])
  })

  it('la casilla dice el nombre entero, el nivel y dónde se lucha; sin etiqueta de tipo', () => {
    const box = $('[data-sl-view="stage"] [data-sl-own="928"]')
    expect(box.getAttribute('aria-label')).toBe('Mob Lasponja, Nv. 20 · Castillo de Arena')
    // La etiqueta «Jefe» o «Archi» no decía nada: el filtro por tipo se queda.
    expect($$('.sl-tag')).toEqual([])
    expect($$('[data-sl-type]')).toHaveLength(3)
    expect($('[data-sl-view="stage"] [data-soul="928"] .sl-soul__n').getAttribute('title')).toBe(
      'Mob Lasponja',
    )
  })
})
