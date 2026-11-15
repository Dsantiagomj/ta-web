// @vitest-environment happy-dom
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ChecklistHeader, ProgressStrip } from '@/components/checklist/ChecklistParts'
import { startRoad } from '@/components/checklist/road-ui'
import type { ChecklistView, RoadStopView } from '@/lib/checklists/page'

// La isla pinta el camino del rush sobre el HTML del servidor: enciende los Dofus conseguidos
// en la franja y la cabecera enseña el siguiente; al conseguirlo se enciende y, después, llega
// el siguiente. Con movimiento reducido el cambio es inmediato.

const road: RoadStopView[] = [
  { stepId: 'a', n: 5, dofus: [{ name: 'Dofawa' }] },
  { stepId: 'b', n: 10, dofus: [{ name: 'Dofus Plateado' }] },
  { stepId: 'c', n: 190, dofus: [{ name: 'Dofus de los Hielos' }, { name: 'Dofus Centelleante' }] },
]
const view = {
  title: 'Rush',
  description: '',
  name: 'Rush',
  steps: [],
  road,
} as unknown as ChecklistView

let reduced = false

beforeEach(() => {
  vi.useFakeTimers()
  reduced = false
  window.matchMedia = ((query: string) => ({
    matches: query.includes('reduce') && reduced,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia
  document.body.innerHTML =
    renderToStaticMarkup(<ChecklistHeader view={view} />) +
    renderToStaticMarkup(<ProgressStrip view={view} />)
})

afterEach(() => {
  vi.useRealTimers()
})

const shownEgg = () =>
  [...document.querySelectorAll<HTMLElement>('[data-road-egg]')]
    .filter((el) => !el.hidden)
    .map((el) => el.dataset.roadEgg)
const shownLine = () =>
  [...document.querySelectorAll<HTMLElement>('[data-road-line]')]
    .filter((el) => !el.hidden)
    .map((el) => el.dataset.roadLine)
const stop = (i: number) => document.querySelector<HTMLElement>(`[data-road-stop="${i}"]`)!

describe('startRoad', () => {
  it('sin camino en la página, nada', () => {
    document.body.innerHTML = '<p>Otra checklist</p>'
    expect(startRoad()).toBeNull()
  })

  it('al cargar, sin animar: los conseguidos encendidos y el siguiente en la cabecera', () => {
    const ui = startRoad()!
    ui.paint((id) => id === 'a', false)
    expect(stop(0).hasAttribute('data-done')).toBe(true)
    expect(stop(1).hasAttribute('data-done')).toBe(false)
    expect(stop(1).hasAttribute('data-next')).toBe(true)
    expect(shownEgg()).toEqual(['1'])
    expect(shownLine()).toEqual(['1'])
    expect(document.querySelector('[data-road-hero]')!.hasAttribute('data-road-ready')).toBe(true)
    expect(document.querySelector('[data-flash]')).toBeNull()
  })

  it('al hacer el paso del Dofus de la cabecera: se enciende y después llega el siguiente', () => {
    const ui = startRoad()!
    ui.paint(() => false, false)
    ui.paint((id) => id === 'a', true)
    // Primero se enciende el que se consiguió, todavía en la cabecera.
    expect(shownEgg()).toEqual(['0'])
    expect(document.querySelector('[data-road-egg="0"]')!.hasAttribute('data-lit')).toBe(true)
    expect(stop(0).hasAttribute('data-flash')).toBe(true)
    vi.advanceTimersByTime(1000)
    expect(shownEgg()).toEqual(['1'])
    expect(document.querySelector('[data-road-egg="1"]')!.hasAttribute('data-enter')).toBe(true)
    expect(shownLine()).toEqual(['1'])
  })

  it('con movimiento reducido, el siguiente llega sin esperar ni animar', () => {
    reduced = true
    const ui = startRoad()!
    ui.paint(() => false, false)
    ui.paint((id) => id === 'a', true)
    expect(shownEgg()).toEqual(['1'])
    expect(document.querySelector('[data-flash], [data-enter]')).toBeNull()
  })

  it('con todo hecho, el último encendido y la línea del final', () => {
    const ui = startRoad()!
    ui.paint(() => true, false)
    expect(shownEgg()).toEqual(['2'])
    expect(document.querySelector('[data-road-egg="2"]')!.hasAttribute('data-lit')).toBe(true)
    expect(shownLine()).toEqual(['end'])
    expect(document.querySelector('[data-next]')).toBeNull()
  })

  it('deshacer un paso vuelve al Dofus que falta, sin esperar', () => {
    const ui = startRoad()!
    ui.paint((id) => id === 'a', false)
    ui.paint(() => false, true)
    expect(shownEgg()).toEqual(['0'])
    expect(document.querySelector('[data-road-egg="0"]')!.hasAttribute('data-lit')).toBe(false)
  })
})
