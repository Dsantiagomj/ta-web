// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ChecklistIsland } from '@/components/checklist/ChecklistIsland'
import type { ChecklistIslandData } from '@/lib/checklists/page'

// La isla se monta una vez por checklist: una vista previa que se refresca le pasa un objeto
// nuevo con lo mismo, y eso no puede volver a empezar (la pestaña, el paso abierto, los
// detalles). Solo una versión nueva de la checklist la reinicia.

const island = (version: string): ChecklistIslandData => ({
  checklistId: 7,
  slug: 'checklist-nebuloso',
  version,
  steps: [['a', 1, []]],
  closes: [],
  legacy: undefined,
  weights: [[1, []]],
  objectives: {},
  prereqs: {},
  parents: {},
  checklists: {},
})

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('ChecklistIsland', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('no vuelve a empezar con los mismos datos; sí con una versión nueva', async () => {
    document.body.innerHTML =
      '<div class="ck-list"></div><div data-ck-pane></div><dialog data-ck-sheet></dialog><div id="root"></div>'
    const fetch = vi.fn(() => new Promise<Response>(() => {}))
    vi.stubGlobal('fetch', fetch)
    const root = createRoot(document.getElementById('root')!)
    await act(async () => root.render(<ChecklistIsland data={island('1')} />))
    await act(async () => root.render(<ChecklistIsland data={island('1')} />))
    expect(fetch).toHaveBeenCalledTimes(1)
    await act(async () => root.render(<ChecklistIsland data={island('2')} />))
    expect(fetch).toHaveBeenCalledTimes(2)
    await act(async () => root.unmount())
  })
})
