import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { StepDetail, StepList } from '@/components/checklist/ChecklistParts'
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
  updates: [],
  resumedIn: [],
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
    lines: [{ at, kind: 'stop', text: 'Para después de todo.' }],
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

describe('StepDetail: lo que trae el Silvestre', () => {
  it('varias líneas en una misión, cada una delante de su objetivo', () => {
    const quest = route(0)
    quest.route!.lines = [
      { at: 0, kind: 'resolve', text: 'Se hacen las peleas.' },
      { at: 1, kind: 'stop', text: 'Hasta la mazmorra.' },
    ]
    const html = renderToStaticMarkup(<StepDetail step={step(quest)} last={1} />)
    expect(rows(html)).toEqual(['línea', 'objetivo', 'línea', 'objetivo'])
    expect(html).toContain('ck-line--resolve')
  })

  it('los avisos de la guía van resaltados en su tramo, con su tipo', () => {
    const withCalls: StepView = {
      ...step(route(0)),
      segments: [
        { kind: 'plain', parts: ['Logro.'] },
        { kind: 'tip', parts: ['(Se pueden encadenar)'] },
        { kind: 'must', parts: ['Hay que tomar la misión.'] },
      ],
    }
    const html = renderToStaticMarkup(<StepDetail step={withCalls} last={1} />)
    expect(html).toContain('<mark class="hl hl--tip">(Se pueden encadenar)</mark>')
    expect(html).toContain('<mark class="hl hl--must">Hay que tomar la misión.</mark>')
  })

  it('una fila con alternativas nombra cada opción con su cantidad', () => {
    const withNeeds: StepView = {
      ...step(route(0)),
      needs: [
        {
          category: 'consumables',
          title: 'Consumibles',
          rows: [
            {
              kind: 'item',
              key: '7045|7047',
              name: 'Pandaburg',
              quantity: 1,
              alternatives: [{ kind: 'item', key: '7047', name: 'Pandapils', quantity: 1 }],
            },
          ],
        },
      ],
    }
    const html = renderToStaticMarkup(<StepDetail step={withNeeds} last={1} />)
    expect(html).toContain('data-own="7045|7047#a"')
    expect(html).toMatch(/Pandaburg.*o .*1 ×.*Pandapils/)
  })

  it('dice qué pasos avanza y en cuál se retoma', () => {
    const html = renderToStaticMarkup(
      <StepDetail step={{ ...step(route(0)), updates: [84], resumedIn: [93] }} last={1} />,
    )
    expect(html).toContain('avanza el 84')
    expect(html).toContain('se retoma en el 93')
  })
})

describe('la zona del paso', () => {
  const withZone = { ...step(route(0)), zone: 'Anutropía' }

  it('va bajo el nombre en la lista y en el banner del paso', () => {
    expect(renderToStaticMarkup(<StepList steps={[withZone]} />)).toContain(
      '<span class="ck-row__z">Anutropía</span>',
    )
    expect(renderToStaticMarkup(<StepDetail step={withZone} last={1} />)).toContain(
      '<span class="ck-dh__zone">Anutropía</span>',
    )
  })

  it('sin zona no se pinta nada', () => {
    const list = renderToStaticMarkup(<StepList steps={[step(route(0))]} />)
    expect(list).not.toContain('ck-row__z')
  })
})

describe('StepDetail: las madres y sus hijas', () => {
  it('una línea dice qué hijas se hacen, delante del objetivo donde empiezan', () => {
    const quest = route(5)
    quest.route!.kids = [{ at: 1, names: ['Hija', 'Otra hija'] }]
    const html = renderToStaticMarkup(<StepDetail step={step(quest)} last={1} />)
    expect(rows(html)).toEqual(['objetivo', 'línea', 'objetivo', 'línea'])
    expect(html).toContain('Aquí se hacen también «Hija» y «Otra hija».')
  })
})

describe('el progreso en el paso', () => {
  const plain = (kind: QuestRowView['kind']): QuestRowView => ({
    dofusId: 7,
    name: 'Otra',
    kind,
  })

  it('cada misión que se hace lleva su casilla, con el paso al que pertenece; la de solo tomarla, no', () => {
    const html = renderToStaticMarkup(<StepDetail step={step(plain('mandatory'))} last={2} />)
    expect(html).toContain('data-q-hit')
    expect(html).toContain('aria-label="Marcar «Otra» como hecha"')
    // data-q-step: «data-step» es el del artículo del paso, que la isla busca por él
    expect(html).toMatch(/<li class="ck-q" data-q="7" data-q-step="1"/)
    expect(html.match(/data-step="1"/g)).toHaveLength(1)
    expect(renderToStaticMarkup(<StepDetail step={step(plain('take'))} last={2} />)).not.toContain(
      'data-q-hit',
    )
  })

  it('el pie lleva «Completar paso N»', () => {
    const html = renderToStaticMarkup(<StepDetail step={step(plain('mandatory'))} last={2} />)
    expect(html).toContain('data-complete="1"')
    expect(html).toContain('Completar paso 1')
  })

  it('cada fila de Necesitarás se marca como conseguida para ese paso', () => {
    const withNeeds: StepView = {
      ...step(plain('mandatory')),
      needs: [
        {
          category: 'resources',
          title: 'Recursos',
          rows: [{ kind: 'label', key: 'x:kama', name: 'Kama', quantity: 1 }],
        },
      ],
    }
    const html = renderToStaticMarkup(<StepDetail step={withNeeds} last={2} />)
    expect(html).toContain('data-own="x:kama#a"')
    expect(html).toContain('aria-label="Ya tengo Kama"')
  })

  it('cada paso de la lista lleva su casilla', () => {
    const html = renderToStaticMarkup(<StepList steps={[step(plain('mandatory'))]} />)
    expect(html).toContain('data-step-check="1"')
    expect(html).toContain('aria-label="Paso 1 hecho"')
  })
})

describe('el progreso antes de que llegue su código', () => {
  it('las casillas y botones del progreso salen desactivados: la isla los activa al cargarlo', () => {
    const quest: QuestRowView = { dofusId: 7, name: 'Otra', kind: 'mandatory' }
    const list = renderToStaticMarkup(<StepList steps={[step(quest)]} />)
    expect(list).toMatch(
      /<input type="checkbox" class="checkbox ck-js"[^>]*data-step-check="1"[^>]*disabled=""/,
    )
    expect(list).toMatch(/data-ck-f="todo"[^>]*disabled=""|disabled=""[^>]*data-ck-f="todo"/)
    const detail = renderToStaticMarkup(<StepDetail step={step(quest)} last={2} />)
    expect(detail).toMatch(/data-q-hit="true"[^>]*disabled=""|disabled=""[^>]*data-q-hit="true"/)
    expect(detail).toMatch(
      /<button type="button" class="ck-btn ck-complete" data-complete="1"[^>]*disabled=""/,
    )
  })
})
