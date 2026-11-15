// El camino de Dofus del rush sobre el HTML del servidor (ChecklistHeader y la franja de
// ChecklistParts.tsx): enciende en la franja los Dofus cuyo paso está hecho y enseña en la
// cabecera el siguiente. Al hacer su paso, el de la cabecera se enciende y, después, llega el
// siguiente; con movimiento reducido el cambio es inmediato. Lo usa progress-ui.ts.
import { roadState } from '@/lib/checklists/road'

/** Lo que tarda el Dofus conseguido en encenderse antes de dejar paso al siguiente. */
const LIT_MS = 900
/** Lo que dura el destello de un Dofus conseguido en la franja (checklist.css, ck-egg-flash). */
const FLASH_MS = 700

export interface RoadUi {
  /** Pinta el camino; `animate` solo cuando cambia por algo que hace la persona. */
  paint(isDone: (stepId: string) => boolean, animate: boolean): void
  destroy(): void
}

const all = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)]

/** El camino de la página, o null si no tiene (una checklist de un solo Dofus). */
export function startRoad(): RoadUi | null {
  const stops = all('[data-road-stop]')
  const hero = document.querySelector<HTMLElement>('[data-road-hero]')
  if (stops.length === 0 || !hero) return null
  const eggs = all('[data-road-egg]')
  const lines = all('[data-road-line]')
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const timers = new Set<ReturnType<typeof setTimeout>>()
  let before: boolean[] | null = null
  let shown: number | null = null

  const later = (ms: number, run: () => void) => {
    const timer = setTimeout(() => {
      timers.delete(timer)
      run()
    }, ms)
    timers.add(timer)
  }

  const flash = (el: Element) => {
    el.setAttribute('data-flash', '')
    later(FLASH_MS, () => el.removeAttribute('data-flash'))
  }

  /** Enseña en la cabecera el Dofus `index` y su línea (o la del final). */
  function show(index: number, finished: boolean, enter: boolean) {
    eggs.forEach((egg, at) => {
      egg.hidden = at !== index
      egg.toggleAttribute('data-lit', at === index && finished)
      egg.toggleAttribute('data-enter', at === index && enter)
      egg.removeAttribute('data-flash')
    })
    const line = finished ? 'end' : String(index)
    for (const el of lines) el.hidden = el.dataset.roadLine !== line
    shown = index
  }

  return {
    paint(isDone, animate) {
      for (const timer of timers) clearTimeout(timer)
      timers.clear()
      // Un destello a medias se quita: si no, el siguiente en ese mismo Dofus no se vería.
      for (const el of [...stops, ...eggs]) el.removeAttribute('data-flash')
      const done = stops.map((el) => isDone(el.dataset.roadStep ?? ''))
      const state = roadState(done)!
      const motion = animate && !reduced.matches
      stops.forEach((el, index) => {
        el.toggleAttribute('data-done', done[index])
        el.toggleAttribute('data-next', !state.finished && index === state.current)
        if (motion && done[index] && before && !before[index]) flash(el)
      })
      before = done
      hero.setAttribute('data-road-ready', '')

      const from = shown
      // El de la cabecera se acaba de conseguir y viene otro: primero se enciende.
      if (motion && from !== null && from !== state.current && done[from]) {
        const egg = eggs[from]
        egg.setAttribute('data-lit', '')
        flash(egg)
        later(LIT_MS, () => show(state.current, state.finished, true))
        return
      }
      show(state.current, state.finished, motion && from !== state.current)
    },
    destroy() {
      for (const timer of timers) clearTimeout(timer)
      timers.clear()
    },
  }
}
