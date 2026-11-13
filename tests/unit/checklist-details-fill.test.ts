// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'

import { fillDetails } from '@/components/checklist/ChecklistIsland'
import type { ChecklistDetails, ObjectiveDetail } from '@/lib/checklists/details-url'

// Lo que la isla pinta con los detalles en la ruta de una misión: la subzona de cada objetivo,
// solo cuando cambia, con un separador que se lee.

const route = (count: number) => {
  document.body.innerHTML = `<ol><li class="ck-q" data-q="1"><span data-ck-npc></span><span data-ck-start></span><ol class="ck-route">${Array.from(
    { length: count },
    (_, i) =>
      `<li class="ck-o" data-i="${i}"><span class="ck-o__t">Objetivo ${i}</span><span data-ck-coord="${i}"></span></li>`,
  ).join('')}</ol></li></ol>`
}
const objective = (subarea: string | null): ObjectiveDetail => ['npc', 'Ve', 1, 1, subarea]
const details = (objectives: ObjectiveDetail[]): ChecklistDetails => ({
  q: { 1: ['Wello', 1, 1, objectives] },
})
const names = () =>
  [...document.querySelectorAll('.ck-o')].map(
    (row) => row.querySelector('.ck-o__a')?.textContent ?? null,
  )

describe('fillDetails: la subzona de cada objetivo', () => {
  it('un objetivo sin subzona la olvida: volver a la misma la vuelve a nombrar', () => {
    route(4)
    fillDetails(details([objective('A'), objective('A'), objective(null), objective('A')]))
    expect(names()).toEqual(['A', null, null, 'A'])
  })

  it('quita el nombre de antes aunque el objetivo ya no llegue en los detalles', () => {
    route(2)
    fillDetails(details([objective('A'), objective('B')]))
    fillDetails(details([objective('A')]))
    expect(names()).toEqual(['A', null])
  })

  it('el nombre va separado del texto con «, » para quien no ve la línea nueva', () => {
    route(1)
    fillDetails(details([objective('Anutropía')]))
    expect(document.querySelector('.ck-o__t')?.textContent).toBe('Objetivo 0, Anutropía')
    expect(document.querySelector('.ck-o__t .sr-only')?.textContent).toBe(', ')
  })
})
