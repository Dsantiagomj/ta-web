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
const shownView = () => $$('[data-sl-view]').filter((el) => getComputedStyle(el).display !== 'none')
/** Las almas que se ven: en la vista elegida y sin ocultar. */
const visible = () =>
  shownView()
    .flatMap((el) => [...el.querySelectorAll<HTMLElement>('.sl-soul:not([hidden])')])
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
  document.head.innerHTML = `<style>
    .sl-win[data-sl-shown='region'] [data-sl-view='stage'],
    .sl-win:not([data-sl-shown='region']) [data-sl-view='region'] { display: none; }
  </style>`
  document.body.innerHTML = renderToStaticMarkup(
    <section className="ck-win sl-win">
      <SoulsStrip view={view} />
      <SoulsTools view={view} />
      <SoulsList view={view} />
    </section>,
  )
})
afterEach(() => stop?.())

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
  })
})
