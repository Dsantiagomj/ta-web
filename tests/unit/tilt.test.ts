// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { startTilt } from '@/components/ui/tilt'

// La inclinación hacia el ratón con el brillo que lo sigue (src/components/ui/tilt.ts), sobre el
// HTML del servidor: la usan los carteles de /checklists y las tarjetas de /guias-dofus.

const html = `
  <ul>
    <li><a class="poster" href="/checklist-nebuloso" data-tilt="">
      <span class="poster__name">Dofus Nebuloso</span>
    </a></li>
    <li><a class="dcard" href="/dofus-ocre" data-tilt="">
      <span class="dcard__n">Dofus Ocre</span>
      <span class="dcard__foil" aria-hidden="true"></span>
    </a></li>
    <li><div class="dcard dcard--off" aria-disabled="true">
      <span class="dcard__n">Dofus Jyfus</span>
    </div></li>
  </ul>`

const motion = (reduce: boolean) => ({ matches: reduce })

let stop: (() => void) | undefined
beforeEach(() => {
  document.body.innerHTML = html
})
afterEach(() => {
  stop?.()
  stop = undefined
})

describe('la inclinación', () => {
  const card = () => document.querySelector<HTMLElement>('a[href="/checklist-nebuloso"]')!

  function move(pointerType: string, x: number, y: number) {
    card().getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 200, height: 300, right: 200, bottom: 300 }) as DOMRect
    card().dispatchEvent(
      new PointerEvent('pointermove', { pointerType, clientX: x, clientY: y, bubbles: true }),
    )
  }

  it('con el ratón se inclina hacia él, hasta 9° por lado, y el brillo lo sigue', () => {
    stop = startTilt(document, motion(false))
    move('mouse', 200, 0)
    expect(card().classList.contains('is-tilted')).toBe(true)
    expect(card().style.transform).toBe('perspective(800px) rotateY(9.00deg) rotateX(9.00deg)')
    expect(card().style.getPropertyValue('--fx')).toBe('100.0%')
    expect(card().style.getPropertyValue('--fy')).toBe('0.0%')
  })

  it('al salir vuelve a su sitio', () => {
    stop = startTilt(document, motion(false))
    move('mouse', 50, 150)
    card().dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))
    expect(card().style.transform).toBe('')
    expect(card().classList.contains('is-tilted')).toBe(false)
  })

  it('con el dedo o el lápiz no se inclina', () => {
    stop = startTilt(document, motion(false))
    move('touch', 200, 0)
    move('pen', 200, 0)
    expect(card().style.transform).toBe('')
    expect(card().classList.contains('is-tilted')).toBe(false)
  })

  it('con movimiento reducido no se inclina', () => {
    stop = startTilt(document, motion(true))
    move('mouse', 200, 0)
    expect(card().style.transform).toBe('')
  })

  it('al pararla deja de escuchar', () => {
    stop = startTilt(document, motion(false))
    stop()
    stop = undefined
    move('mouse', 200, 0)
    expect(card().style.transform).toBe('')
  })
})

describe('la inclinación de las tarjetas de los Dofus', () => {
  function hover(el: HTMLElement) {
    el.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200 }) as DOMRect
    el.dispatchEvent(
      new PointerEvent('pointermove', {
        pointerType: 'mouse',
        clientX: 0,
        clientY: 200,
        bubbles: true,
      }),
    )
  }

  it('una tarjeta publicada se inclina como un cartel', () => {
    stop = startTilt(document, motion(false))
    const card = document.querySelector<HTMLElement>('a.dcard')!
    hover(card)
    expect(card.classList.contains('is-tilted')).toBe(true)
    expect(card.style.transform).toBe('perspective(800px) rotateY(-9.00deg) rotateX(-9.00deg)')
    expect(card.style.getPropertyValue('--fx')).toBe('0.0%')
    expect(card.style.getPropertyValue('--fy')).toBe('100.0%')
  })

  it('una «En preparación», sin data-tilt, no se mueve', () => {
    stop = startTilt(document, motion(false))
    const off = document.querySelector<HTMLElement>('.dcard--off')!
    hover(off)
    expect(off.style.transform).toBe('')
    expect(off.classList.contains('is-tilted')).toBe(false)
  })
})
