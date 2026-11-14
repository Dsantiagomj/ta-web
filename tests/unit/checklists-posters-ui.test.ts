// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { startPosters } from '@/components/checklists/posters-ui'
import type { PosterProgressModel } from '@/lib/checklists/poster-progress'
import { emptyProgress, PROGRESS_KEY, type Progress } from '@/lib/checklists/progress/store'

// La isla del índice /checklists sobre el HTML del servidor: el porcentaje de cada cartel, del
// progreso del navegador, y la inclinación hacia el ratón con el brillo que lo sigue.

const models: PosterProgressModel[] = [
  {
    kind: 'steps',
    slug: 'checklist-nebuloso',
    id: 7,
    steps: [
      ['a', [[10, 'mandatory']]],
      ['b', [[20, 'mandatory']]],
    ],
    weights: [
      [100, [100]],
      [300, [300]],
    ],
    objectives: { 10: 1, 20: 1 },
    prereqs: {},
    anyOf: [],
    completedBy: [],
  },
  { kind: 'souls', slug: 'lista-ocre', souls: [1, 2, 3, 4] },
]

const html = `
  <ul>
    <li><a class="poster" href="/checklist-nebuloso" data-tilt="">
      <span class="poster__name">Dofus Nebuloso</span>
      <span class="poster__ring" data-poster-progress="checklist-nebuloso" hidden="">
        <span data-poster-pct=""></span><span class="sr-only"> hecho</span>
      </span>
    </a></li>
    <li><a class="poster" href="/lista-ocre" data-tilt="">
      <span class="poster__ring" data-poster-progress="lista-ocre" hidden="">
        <span data-poster-pct=""></span>
      </span>
    </a></li>
  </ul>`

function storage(progress: Progress | null) {
  const store = new Map<string, string>()
  if (progress) store.set(PROGRESS_KEY, JSON.stringify(progress))
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  }
}

const motion = (reduce: boolean) => ({ matches: reduce }) as MediaQueryList

let stop: (() => void) | undefined
beforeEach(() => {
  document.body.innerHTML = html
})
afterEach(() => {
  stop?.()
  stop = undefined
})

const ring = (slug: string) =>
  document.querySelector<HTMLElement>(`[data-poster-progress="${slug}"]`)!

describe('el porcentaje de cada cartel', () => {
  it('con progreso, lo enseña con un decimal, como su página, y la parte hecha del anillo', () => {
    const progress = {
      ...emptyProgress(),
      steps: { a: { done: true, at: 1 } },
      souls: { 1: 1, 2: 1, 3: 1, 4: 1 },
    }
    stop = startPosters(document, models, { storage: storage(progress), motion: motion(false) })
    const nebuloso = ring('checklist-nebuloso')
    expect(nebuloso.hidden).toBe(false)
    expect(nebuloso.querySelector('[data-poster-pct]')!.textContent).toBe('25 %')
    expect(nebuloso.style.getPropertyValue('--ratio')).toBe('0.25')
    expect(nebuloso.classList.contains('poster__ring--done')).toBe(false)
    // Todas las almas: el anillo de hecho.
    expect(ring('lista-ocre').querySelector('[data-poster-pct]')!.textContent).toBe('100 %')
    expect(ring('lista-ocre').classList.contains('poster__ring--done')).toBe(true)
  })

  it('sin nada marcado, nada: ni un 0 %', () => {
    stop = startPosters(document, models, { storage: storage(null), motion: motion(false) })
    expect(ring('checklist-nebuloso').hidden).toBe(true)
    expect(ring('lista-ocre').hidden).toBe(true)
  })

  it('sin localStorage (modo privado estricto), nada y sin errores', () => {
    const blocked = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {},
    }
    stop = startPosters(document, models, { storage: blocked, motion: motion(false) })
    expect(ring('checklist-nebuloso').hidden).toBe(true)
  })
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
    stop = startPosters(document, models, { storage: storage(null), motion: motion(false) })
    move('mouse', 200, 0)
    expect(card().classList.contains('is-tilted')).toBe(true)
    expect(card().style.transform).toBe('perspective(800px) rotateY(9.00deg) rotateX(9.00deg)')
    expect(card().style.getPropertyValue('--fx')).toBe('100.0%')
    expect(card().style.getPropertyValue('--fy')).toBe('0.0%')
  })

  it('al salir vuelve a su sitio', () => {
    stop = startPosters(document, models, { storage: storage(null), motion: motion(false) })
    move('mouse', 50, 150)
    card().dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))
    expect(card().style.transform).toBe('')
    expect(card().classList.contains('is-tilted')).toBe(false)
  })

  it('con el dedo o el lápiz no se inclina', () => {
    stop = startPosters(document, models, { storage: storage(null), motion: motion(false) })
    move('touch', 200, 0)
    move('pen', 200, 0)
    expect(card().style.transform).toBe('')
    expect(card().classList.contains('is-tilted')).toBe(false)
  })

  it('con movimiento reducido no se inclina', () => {
    stop = startPosters(document, models, { storage: storage(null), motion: motion(true) })
    move('mouse', 200, 0)
    expect(card().style.transform).toBe('')
  })

  it('al pararla deja de escuchar', () => {
    stop = startPosters(document, models, { storage: storage(null), motion: motion(false) })
    stop()
    stop = undefined
    move('mouse', 200, 0)
    expect(card().style.transform).toBe('')
  })
})
