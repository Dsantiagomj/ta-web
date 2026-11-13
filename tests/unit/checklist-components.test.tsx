import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { StepDetail } from '@/components/checklist/ChecklistParts'
import type { QuestRowView, StepView } from '@/lib/checklists/page'

// Las partes de la página de una checklist (prototipo A).

const step = (quest: QuestRowView): StepView => ({
  stepId: 'a',
  n: 1,
  label: 'El rey y yo',
  segments: [{ kind: 'stop', parts: ['Para.'] }],
  hasStop: true,
  hasResolve: false,
  closes: [],
  closedBy: null,
  achievements: [],
  quests: [quest],
  needs: [],
  bosses: [],
  note: null,
  search: '',
})

const route = (at: number): QuestRowView => ({
  dofusId: 1,
  name: 'Sangre fría',
  kind: 'mandatory',
  route: {
    objectives: [
      { kind: 'npc', text: 'Ve a ver a Wello' },
      { kind: 'fight', text: 'Vence a 1 x Rey Nidas' },
    ],
    line: { at, kind: 'stop', text: 'Para después de todo.' },
  },
})

/** Las filas de la ruta de la misión, en orden: «línea» u «objetivo». */
const rows = (html: string) =>
  [...html.matchAll(/<li class="(ck-line[^"]*|ck-o)"/g)].map((match) =>
    match[1].startsWith('ck-line') ? 'línea' : 'objetivo',
  )

describe('StepDetail: la línea de Torre en la ruta de la misión', () => {
  it('va delante del objetivo donde para', () => {
    expect(rows(renderToStaticMarkup(<StepDetail step={step(route(1))} last={1} />))).toEqual([
      'objetivo',
      'línea',
      'objetivo',
    ])
  })

  it('si para después del último objetivo, va al final en vez de perderse', () => {
    for (const at of [2, 5]) {
      const html = renderToStaticMarkup(<StepDetail step={step(route(at))} last={1} />)
      expect(rows(html)).toEqual(['objetivo', 'objetivo', 'línea'])
      expect(html).toContain('Para después de todo.')
    }
  })
})
