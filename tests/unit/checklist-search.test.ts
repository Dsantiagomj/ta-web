// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'

import { startChecklist } from '@/components/checklist/checklist-ui'
import type { ChecklistIslandData } from '@/lib/checklists/page'

// La isla llega con import() después de pintar: quien escribe en el buscador antes de que
// llegue no puede quedarse con la lista entera y el texto escrito encima.

const data = { slug: 'checklist-nebuloso', version: '1' } as ChecklistIslandData

const page = (query: string) => {
  document.body.innerHTML = `
    <label><input type="search" data-ck-q value="${query}"></label>
    <p data-ck-status></p>
    <ul class="ck-list">
      <li class="ck-row" data-n="1" data-search="habla con hupe"></li>
      <li class="ck-row" data-n="2" data-search="busca el pico"></li>
      <li class="ck-row" data-n="3" data-search="vence al rey"></li>
    </ul>
    <p data-ck-empty hidden></p>
    <div data-ck-pane></div>
    <dialog data-ck-sheet></dialog>`
}

const shown = () =>
  [...document.querySelectorAll<HTMLElement>('.ck-row:not([hidden])')].map((row) => row.dataset.n)

describe('el buscador de la checklist', () => {
  let stop: (() => void) | undefined
  afterEach(() => {
    stop?.()
    vi.unstubAllGlobals()
  })

  it('filtra lo que ya estaba escrito cuando llega la isla', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {})),
    )
    page('rey')

    stop = startChecklist(() => data)

    expect(shown()).toEqual(['3'])
  })

  it('con el buscador vacío deja todos los pasos', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {})),
    )
    page('')

    stop = startChecklist(() => data)

    expect(shown()).toEqual(['1', '2', '3'])
    expect(document.querySelector('[data-ck-status]')?.textContent).toBe('')
  })
})
