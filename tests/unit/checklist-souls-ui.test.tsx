// @vitest-environment happy-dom
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SoulsList, SoulsStrip, SoulsTools } from '@/components/checklist/SoulsParts'
import { startSouls } from '@/components/checklist/souls-ui'
import { soulsView, type SoulsData } from '@/lib/checklists/souls'
import type { Checklist } from '@/payload-types'

// La isla del Ocre sobre el HTML que pinta el servidor: React es dueño de cada fila, así que la
// isla nunca las mueve, y puede pararse y volver a arrancar (la vista previa del panel lo hace al
// guardar) sin perder lo elegido. Las etapas (o las regiones) van al lado y se ve una.

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
// La vista que enseña checklist.css: la que dice `.sl-win` y, sin nada, por etapa. (happy-dom
// guarda el primer getComputedStyle y no ve el cambio de un antepasado.)
const shownView = () => $(`[data-sl-view="${$('.sl-win').dataset.slShown ?? 'stage'}"]`)
/** Las almas que se ven: en la vista elegida, en un panel y un grupo que se ven, sin ocultar. */
const visible = () =>
  [...shownView().querySelectorAll<HTMLElement>('.sl-soul')]
    .filter((row) => !row.closest('[hidden]'))
    .map((row) => row.querySelector('.sl-soul__n')!.textContent)
const shownPanels = () =>
  [...shownView().querySelectorAll<HTMLElement>('[data-sl-panel]')]
    .filter((panel) => !panel.hidden)
    .map((panel) => panel.dataset.slPanel)
const click = (selector: string) => $(selector).click()
const stage = (key: string) => `[data-sl-view="stage"] [data-sl-at="${key}"]`
const tick = (id: number) => {
  const box = shownView().querySelector<HTMLInputElement>(`[data-sl-own="${id}"]`)!
  box.checked = !box.checked
  box.dispatchEvent(new Event('change', { bubbles: true }))
}
const hideOwned = () => {
  $<HTMLInputElement>('[data-sl-hide]').checked = true
  $('[data-sl-hide]').dispatchEvent(new Event('change', { bubbles: true }))
}
const search = (text: string) => {
  const input = $<HTMLInputElement>('[data-sl-q]')
  input.value = text
  input.dispatchEvent(new Event('input', { bubbles: true }))
}
const owning = (...ids: number[]) =>
  localStorage.setItem(
    'ta-web:progress',
    JSON.stringify({
      v: 1,
      quests: {},
      steps: {},
      souls: Object.fromEntries(ids.map((id) => [id, 1])),
    }),
  )

let stop: (() => void) | undefined
beforeEach(() => {
  localStorage.clear()
  window.history.replaceState(null, '', '/lista-ocre')
  document.documentElement.setAttribute('data-js', '')
  document.body.innerHTML = renderToStaticMarkup(
    <>
      <section className="ck-win sl-win">
        <SoulsStrip view={view} />
        <SoulsTools view={view} />
        <SoulsList view={view} />
      </section>
      <div className="ck-toast" role="status" data-ck-toast hidden />
    </>,
  )
})
afterEach(() => {
  stop?.()
  vi.useRealTimers()
})

describe('una etapa a la vez, con la lista al lado', () => {
  const items = () =>
    $$('[data-sl-view="stage"] [data-sl-item]')
      .filter((item) => !item.hidden)
      .map((item) => {
        const button = item.querySelector<HTMLElement>('[data-sl-at]')!
        return [
          button.dataset.slAt,
          button.querySelector('[data-sl-sc]')!.textContent,
          button.getAttribute('aria-current'),
        ]
      })

  it('empieza en la primera etapa; la lista dice lo que se tiene de cada una', () => {
    owning(500)
    stop = startSouls(view.island)
    expect(shownPanels()).toEqual(['1'])
    expect(visible()).toEqual(['Mob Lasponja'])
    expect(items()).toEqual([
      ['1', '0/1', 'true'],
      ['2', '1/2', null],
    ])
  })

  it('el panel dice lo que se tiene, con el anillo', () => {
    owning(500)
    stop = startSouls(view.island)
    click(stage('2'))
    const panel = $('[data-sl-view="stage"] [data-sl-panel="2"]')
    expect(panel.querySelector('[data-sl-sum]')!.textContent).toBe('1 de 2 almas')
    expect(panel.querySelector('[data-sl-rv]')!.textContent).toBe('50 %')
    expect(
      panel.querySelector<HTMLElement>('[data-sl-ring]')!.style.getPropertyValue('--ratio'),
    ).toBe('0.5')
  })

  it('anterior y siguiente llevan a la etapa de al lado, con su nombre', () => {
    stop = startSouls(view.island)
    const prev = $<HTMLButtonElement>('[data-sl-view="stage"] [data-sl-go="prev"]')
    const next = $<HTMLButtonElement>('[data-sl-view="stage"] [data-sl-go="next"]')
    expect(prev.hidden).toBe(true)
    expect(next.hidden).toBe(false)
    expect(next.querySelector('[data-sl-gl]')!.textContent).toBe('Etapa 2 · Archis')
    next.click()
    expect(shownPanels()).toEqual(['2'])
    expect(next.hidden).toBe(true)
    expect(prev.querySelector('[data-sl-gl]')!.textContent).toBe('Etapa 1 · Jefes')
    // El foco va al título de la etapa: el botón pulsado ya no está.
    expect(document.activeElement).toBe($('[data-sl-view="stage"] [data-sl-panel="2"] .sl-ph__t'))
  })

  it('el tipo deja en la lista solo las etapas que tienen almas de ese tipo', () => {
    stop = startSouls(view.island)
    click('[data-sl-type="archi"]')
    expect(items()).toEqual([['2', '0/2', 'true']])
    expect(shownPanels()).toEqual(['2'])
    click('[data-sl-type="all"]')
    expect(items().map(([key]) => key)).toEqual(['1', '2'])
  })

  it('lo elegido va en la dirección y una dirección abre lo que dice', () => {
    stop = startSouls(view.island)
    click(stage('2'))
    expect(window.location.hash).toBe('#etapa=2')
    click('[data-sl-type="archi"]')
    expect(window.location.hash).toBe('#etapa=2&tipo=archis')
    stop()
    window.history.replaceState(null, '', '/lista-ocre#region=Amakna')
    document.body.innerHTML = document.body.innerHTML
    stop = startSouls(view.island)
    expect($('[data-sl-by="region"]').getAttribute('aria-pressed')).toBe('true')
    expect(shownPanels()).toEqual(['Amakna'])
    expect(visible()).toEqual(['Pikopi'])
  })

  it('cambiar de etapa anima el panel desde su lado', () => {
    stop = startSouls(view.island)
    click(stage('2'))
    expect($('[data-sl-view="stage"] [data-sl-panel="2"]').getAttribute('data-enter')).toBe('next')
    click(stage('1'))
    expect($('[data-sl-view="stage"] [data-sl-panel="1"]').getAttribute('data-enter')).toBe('prev')
  })
})

describe('por región', () => {
  it('cada región por mazmorra y por subzona, con lo que se tiene de cada una', () => {
    owning(928)
    stop = startSouls(view.island)
    click('[data-sl-by="region"]')
    expect(shownPanels()).toEqual(['Astrub'])
    const subs = $$('[data-sl-view="region"] [data-sl-panel="Astrub"] [data-sl-sub]')
      .filter((sub) => !sub.hidden)
      .map((sub) => sub.querySelector('.sl-sh')!.textContent)
    expect(subs).toEqual(['Castillo de Arena 1/1', 'Castillo de Arena 0/1'])
    click('[data-sl-type="archi"]')
    expect(visible()).toEqual(['Arakna Maja'])
  })
})

describe('marcar se nota', () => {
  const just = (id: number) => $$(`[data-soul="${id}"]`).map((row) => row.getAttribute('data-just'))
  const toast = () => $('[data-ck-toast]')
  const panel = (key: string) => $(`[data-sl-view="stage"] [data-sl-panel="${key}"]`)

  it('marcar y desmarcar anima solo la copia que se ve; lo que llega de otra pestaña, nada', () => {
    stop = startSouls(view.island)
    click(stage('2'))
    expect(just(500)).toEqual([null, null])
    tick(500)
    // Por etapa: la copia de la vista por región no se ve y no se anima.
    expect(just(500)).toEqual(['on', null])
    tick(500)
    expect(just(500)).toEqual(['off', null])
    owning(501)
    window.dispatchEvent(new StorageEvent('storage', { key: 'ta-web:progress' }))
    expect(just(501)).toEqual([null, null])
  })

  it('completar una etapa la celebra una vez, con un aviso; quitar una la deja sin completar', () => {
    stop = startSouls(view.island)
    click(stage('2'))
    const button = () => $(stage('2'))
    tick(500)
    expect(panel('2').hasAttribute('data-complete')).toBe(false)
    tick(501)
    expect(panel('2').hasAttribute('data-complete')).toBe(true)
    expect(panel('2').hasAttribute('data-cheer')).toBe(true)
    expect(button().hasAttribute('data-complete')).toBe(true)
    expect(button().hasAttribute('data-cheer')).toBe(true)
    // Y el alma que la completa, donde se ha hecho clic.
    expect($$('[data-soul="501"]').map((row) => row.hasAttribute('data-cheer'))).toEqual([
      true,
      false,
    ])
    expect($$('[data-soul="500"][data-cheer]')).toEqual([])
    expect(toast().textContent).toBe('¡Etapa 2 completa!')
    expect(toast().hidden).toBe(false)
    tick(501)
    expect(panel('2').hasAttribute('data-complete')).toBe(false)
    expect(panel('2').hasAttribute('data-cheer')).toBe(false)
  })

  it('una etapa que ya estaba completa al cargar se ve completa, sin celebrarla', () => {
    owning(928)
    stop = startSouls(view.island)
    expect(panel('1').hasAttribute('data-complete')).toBe(true)
    expect(panel('1').hasAttribute('data-cheer')).toBe(false)
    expect(toast().hidden).toBe(true)
  })

  it('con la última alma, el aviso es de todas', () => {
    stop = startSouls(view.island)
    tick(928)
    click(stage('2'))
    tick(500)
    tick(501)
    expect(toast().textContent).toBe('¡Tienes todas las almas!')
  })

  it('con «Ocultar las que tengo», el alma que se marca se queda un momento y se va', () => {
    vi.useFakeTimers()
    stop = startSouls(view.island)
    click(stage('2'))
    hideOwned()
    tick(500)
    expect(visible()).toEqual(['Pikopi', 'Arakna Maja'])
    vi.advanceTimersByTime(650)
    expect($('[data-sl-view="stage"] [data-soul="500"]').hasAttribute('data-leave')).toBe(true)
    vi.advanceTimersByTime(240)
    expect(visible()).toEqual(['Arakna Maja'])
  })

  it('al poner «Ocultar las que tengo», las que se tienen se van con su animación', () => {
    vi.useFakeTimers()
    owning(500)
    stop = startSouls(view.island)
    click(stage('2'))
    hideOwned()
    expect($('[data-sl-view="stage"] [data-soul="500"]').hasAttribute('data-leave')).toBe(true)
    expect(visible()).toEqual(['Pikopi', 'Arakna Maja'])
    vi.advanceTimersByTime(240)
    expect(visible()).toEqual(['Arakna Maja'])
  })

  // Cada atributo mueve varias animaciones de distinta duración: se quita al acabar la última.
  const running = (el: HTMLElement, names: string[]) => {
    Object.defineProperty(el, 'getAnimations', {
      configurable: true,
      value: () => names.map((animationName) => ({ animationName, playState: 'running' })),
    })
  }
  const end = (el: Element, animationName: string, type = 'animationend') =>
    el.dispatchEvent(Object.assign(new Event(type, { bubbles: true }), { animationName }))

  it('el atributo de la animación se quita cuando acaba la más larga, no la primera', () => {
    stop = startSouls(view.island)
    click(stage('2'))
    tick(500)
    const row = $<HTMLElement>('[data-sl-view="stage"] [data-soul="500"]')
    running(row, ['sl-just-on', 'sl-just-flash'])
    end(row.querySelector('[data-sl-own]')!, 'sl-just-tick')
    expect(row.getAttribute('data-just')).toBe('on')
    running(row, [])
    end(row.querySelector('.sl-soul__img')!, 'sl-just-on')
    expect(row.hasAttribute('data-just')).toBe(false)
  })

  it('la etapa que celebra se suelta cuando acaba también el alma que la completó, de dentro', () => {
    stop = startSouls(view.island)
    tick(928)
    const row = $<HTMLElement>('[data-sl-view="stage"] [data-soul="928"]')
    // Las chispas del anillo acaban con las del alma aún en marcha: la etapa sigue celebrando.
    running(panel('1'), ['sl-cheer-card'])
    end(panel('1').querySelector('[data-sl-ring]')!, 'sl-cheer-sparks')
    expect(panel('1').hasAttribute('data-cheer')).toBe(true)
    // Acaban las del alma: se sueltan las dos.
    running(panel('1'), [])
    running(row, [])
    end(row.querySelector('.sl-soul__b')!, 'sl-cheer-card')
    expect(row.hasAttribute('data-cheer')).toBe(false)
    expect(panel('1').hasAttribute('data-cheer')).toBe(false)
  })

  it('una animación cortada (la vista cambia a mitad) también quita su atributo', () => {
    stop = startSouls(view.island)
    tick(928)
    running(panel('1'), [])
    end(panel('1').querySelector('[data-sl-ring]')!, 'sl-cheer-pop', 'animationcancel')
    expect(panel('1').hasAttribute('data-cheer')).toBe(false)
  })
})

describe('lo que dice el panel vacío, buscar y volver arriba', () => {
  it('una etapa completa con «Ocultar las que tengo» dice que ya están todas', () => {
    vi.useFakeTimers()
    owning(928)
    stop = startSouls(view.island)
    hideOwned()
    vi.advanceTimersByTime(240)
    const empty = $('[data-sl-view="stage"] [data-sl-empty]')
    expect(empty.hidden).toBe(false)
    expect(empty.textContent).toBe('Ya tienes todas las almas de la etapa 1.')
  })

  it('buscando, cada etapa con almas que coinciden sale con las suyas, y sin anterior y siguiente', () => {
    stop = startSouls(view.island)
    search('castillo')
    expect(shownPanels()).toEqual(['1', '2'])
    expect(visible()).toEqual(['Mob Lasponja', 'Arakna Maja'])
    // El título de los resultados va en la columna del panel de la vista que se ve.
    const results = $('[data-sl-view="stage"] .sl-panels [data-sl-results]')
    expect(results.hidden).toBe(false)
    expect($('[data-sl-view="region"] [data-sl-results]').hidden).toBe(true)
    expect(results.querySelector('[data-sl-rq]')!.textContent).toBe('Resultados de «castillo»')
    expect(results.querySelector('[data-sl-rc]')!.textContent).toBe('2 almas')
    expect($('[data-sl-view="stage"] [data-sl-pager]').hidden).toBe(true)
    search('')
    expect(shownPanels()).toEqual(['1'])
    expect($$('[data-sl-results]').every((el) => el.hidden)).toBe(true)
  })

  it('elegir una etapa mientras se busca deja de buscar', () => {
    stop = startSouls(view.island)
    search('castillo')
    click(stage('2'))
    expect($<HTMLInputElement>('[data-sl-q]').value).toBe('')
    expect(shownPanels()).toEqual(['2'])
  })

  it('una búsqueda sin almas dice que nada coincide', () => {
    stop = startSouls(view.island)
    search('zzz')
    expect($('[data-sl-view="stage"] [data-sl-empty]').textContent).toBe(
      'Ningún alma coincide con la búsqueda.',
    )
  })

  it('al elegir una etapa vuelve arriba si su principio queda bajo la cabecera fija', () => {
    stop = startSouls(view.island)
    const rect =
      (top: number, bottom = top) =>
      () =>
        ({ top, bottom }) as DOMRect
    const header = document.createElement('header')
    header.className = 'site-hdr'
    document.body.prepend(header)
    header.getBoundingClientRect = rect(0, 64)
    const tools = $('.sl-tools')
    let scrolled = 0
    tools.scrollIntoView = () => void scrolled++
    $('[data-sl-view="stage"] [data-sl-panel="2"]').getBoundingClientRect = rect(40)
    click(stage('2'))
    expect(scrolled).toBe(1)
    $('[data-sl-view="stage"] [data-sl-panel="1"]').getBoundingClientRect = rect(200)
    click(stage('1'))
    expect(scrolled).toBe(1)
  })
})

describe('la isla del Ocre', () => {
  it('por región no mueve las filas: cada vista pinta las suyas, con ids que no se repiten', () => {
    const parents = $$('.sl-soul').map((row) => row.parentElement)
    stop = startSouls(view.island)
    click('[data-sl-by="region"]')
    expect($$('.sl-soul').map((row) => row.parentElement)).toEqual(parents)
    expect(visible()).toEqual(['Mob Lasponja', 'Arakna Maja'])
    const ids = $$('[id]').map((el) => el.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('al volver a arrancar sigue como estaba: la vista, el tipo y lo que se ve', () => {
    stop = startSouls(view.island)
    click('[data-sl-by="region"]')
    click('[data-sl-type="archi"]')
    click('[data-sl-view="region"] [data-sl-at="Amakna"]')
    stop()
    window.history.replaceState(null, '', '/lista-ocre')
    stop = startSouls(view.island)
    expect($('[data-sl-by="region"]').getAttribute('aria-pressed')).toBe('true')
    expect($('[data-sl-by="stage"]').getAttribute('aria-pressed')).toBe('false')
    expect($('[data-sl-type="archi"]').getAttribute('aria-pressed')).toBe('true')
    expect(visible()).toEqual(['Pikopi'])
  })

  it('el aviso para lectores de pantalla cambia con lo que se ve, no al marcar', () => {
    stop = startSouls(view.island)
    const status = $('[data-sl-status]')
    expect(status.textContent).toBe('')
    tick(928)
    expect(status.textContent).toBe('')
    click(stage('2'))
    expect(status.textContent).toBe('2 almas')
    const announced = status.textContent
    tick(501)
    expect(status.textContent).toBe(announced)
  })

  it('lo que se escribió en el buscador y la casilla de ocultar antes de cargar cuenta', () => {
    owning(928)
    $<HTMLInputElement>('[data-sl-q]').value = 'a'
    $<HTMLInputElement>('[data-sl-hide]').checked = true
    stop = startSouls(view.island)
    // «a» está en las tres; Mob Lasponja se tiene y se oculta.
    expect(visible()).toEqual(['Pikopi', 'Arakna Maja'])
  })

  it('sin JavaScript no salen los controles que no hacen nada', () => {
    expect($('[data-sl-q]').closest('.ck-js')).not.toBeNull()
    expect($('[data-sl-hide]').closest('.ck-js')).not.toBeNull()
    expect($('.sl-nav').closest('.ck-js')).not.toBeNull()
    expect($('[data-sl-pager]').closest('.ck-js')).not.toBeNull()
    expect($('.sl-soul__copy').closest('.ck-js')).not.toBeNull()
  })
})

describe('las cartas', () => {
  it('la casilla dice el nombre entero, dónde se lucha y el nivel; sin etiqueta de tipo', () => {
    const box = $('[data-sl-view="stage"] [data-sl-own="928"]')
    expect(box.getAttribute('aria-label')).toBe('Mob Lasponja, Castillo de Arena · Nv. 20')
    expect($('[data-sl-view="stage"] [data-soul="928"] .sl-soul__m').textContent).toBe(
      'Castillo de Arena · Nv. 20',
    )
    // Ni «Jefe» ni «Archi» en la carta: el filtro por tipo y los grupos ya lo dicen.
    expect($$('.sl-soul').some((row) => /\b(Jefe|Archi)\b/.test(row.textContent ?? ''))).toBe(false)
    expect($$('[data-sl-type]')).toHaveLength(3)
    expect($('[data-sl-view="stage"] [data-soul="928"] .sl-soul__n').getAttribute('title')).toBe(
      'Mob Lasponja',
    )
  })

  it('copiar copia el nombre, lo dice y no marca el alma', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    stop = startSouls(view.island)
    click(stage('2'))
    click('[data-sl-view="stage"] [data-soul="500"] [data-sl-copy]')
    await Promise.resolve()
    expect(writeText).toHaveBeenCalledWith('Pikopi')
    await vi.waitFor(() => expect($('[data-ck-toast]').textContent).toBe('Copiado: Pikopi'))
    expect($<HTMLInputElement>('[data-sl-view="stage"] [data-sl-own="500"]').checked).toBe(false)
    expect(localStorage.getItem('ta-web:progress')).toBeNull()
  })

  it('si no se puede copiar, dice cómo buscarla', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('no')) },
    })
    stop = startSouls(view.island)
    click('[data-sl-view="stage"] [data-soul="928"] [data-sl-copy]')
    await vi.waitFor(() =>
      expect($('[data-ck-toast]').textContent).toBe(
        'No se pudo copiar. Busca «Mob Lasponja» en el juego.',
      ),
    )
  })
})
