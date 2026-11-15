// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { paintProgress, startProgress } from '@/components/checklists/poster-progress-ui'
import { hasProgress } from '@/components/checklists/posters-ui'
import type { PosterProgressModel } from '@/lib/checklists/poster-progress'
import { emptyProgress, PROGRESS_KEY, type Progress } from '@/lib/checklists/progress/store'

// La isla del índice /checklists sobre el HTML del servidor: el porcentaje de cada cartel, del
// progreso del navegador. La inclinación de los carteles se prueba en tilt.test.ts.

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
    paintProgress(document, models, storage(progress))
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
    paintProgress(document, models, storage(emptyProgress()))
    expect(ring('checklist-nebuloso').hidden).toBe(true)
    expect(ring('lista-ocre').hidden).toBe(true)
  })

  it('el motor solo se carga si el navegador guarda progreso', () => {
    expect(hasProgress(storage(null))).toBe(false)
    expect(hasProgress(storage(emptyProgress()))).toBe(true)
    expect(hasProgress(null)).toBe(false)
  })

  it('sin localStorage (modo privado estricto), nada y sin errores', () => {
    const blocked = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {},
    }
    expect(hasProgress(blocked)).toBe(false)
    paintProgress(document, models, blocked)
    expect(ring('checklist-nebuloso').hidden).toBe(true)
  })
})

describe('el porcentaje al volver o cambiar en otra pestaña', () => {
  const marked = (steps: string[]) => ({
    ...emptyProgress(),
    steps: Object.fromEntries(steps.map((id) => [id, { done: true, at: 1 }])),
  })

  it('pide los modelos una sola vez, y solo cuando arranca', async () => {
    let calls = 0
    const store = storage(marked(['a']))
    stop = startProgress(document, {
      storage: store,
      loadModels: async () => {
        calls += 1
        return models
      },
      events: window,
    })
    await expect.poll(() => ring('checklist-nebuloso').hidden).toBe(false)
    window.dispatchEvent(new StorageEvent('storage', { key: PROGRESS_KEY }))
    await Promise.resolve()
    expect(calls).toBe(1)
  })

  it('vuelve a pintarlo cuando otra pestaña cambia el progreso', async () => {
    const store = storage(marked(['a']))
    stop = startProgress(document, {
      storage: store,
      loadModels: async () => models,
      events: window,
    })
    const pct = () => ring('checklist-nebuloso').querySelector('[data-poster-pct]')!.textContent
    await expect.poll(pct).toBe('25 %')
    store.setItem(PROGRESS_KEY, JSON.stringify(marked(['a', 'b'])))
    window.dispatchEvent(new StorageEvent('storage', { key: PROGRESS_KEY }))
    await expect.poll(pct).toBe('100 %')
    // Otra clave no cambia nada.
    store.setItem(PROGRESS_KEY, JSON.stringify(emptyProgress()))
    window.dispatchEvent(new StorageEvent('storage', { key: 'otra' }))
    await Promise.resolve()
    expect(pct()).toBe('100 %')
  })

  it('al volver con atrás (bfcache) lo vuelve a leer; sin nada marcado, se esconde', async () => {
    const store = storage(marked(['a']))
    stop = startProgress(document, {
      storage: store,
      loadModels: async () => models,
      events: window,
    })
    await expect.poll(() => ring('checklist-nebuloso').hidden).toBe(false)
    store.setItem(PROGRESS_KEY, JSON.stringify(emptyProgress()))
    window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true }))
    await expect.poll(() => ring('checklist-nebuloso').hidden).toBe(true)
  })

  it('al pararlo deja de escuchar', async () => {
    const store = storage(marked(['a']))
    stop = startProgress(document, {
      storage: store,
      loadModels: async () => models,
      events: window,
    })
    await expect.poll(() => ring('checklist-nebuloso').hidden).toBe(false)
    stop()
    stop = undefined
    store.setItem(PROGRESS_KEY, JSON.stringify(emptyProgress()))
    window.dispatchEvent(new StorageEvent('storage', { key: PROGRESS_KEY }))
    await Promise.resolve()
    expect(ring('checklist-nebuloso').hidden).toBe(false)
  })
})
