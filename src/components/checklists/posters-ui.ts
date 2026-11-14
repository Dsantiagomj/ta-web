// La isla del índice /checklists sobre el HTML del servidor (ChecklistsIndex.tsx): con el
// ratón, el cartel se inclina hacia él hasta 9° por lado y el brillo holográfico lo sigue
// (--fx, --fy), como la carta de silvestre-checklist (src/lib/tilt.js). Solo con ratón y sin
// movimiento reducido; al salir vuelve a su sitio. El porcentaje de cada cartel lo pinta
// poster-progress-ui.ts, que la isla carga con import() solo si el navegador tiene progreso:
// el motor no viaja en la página de quien no ha marcado nada.
import { PROGRESS_KEY, type ProgressStorage } from '@/lib/checklists/progress/store'

const MAX_TILT = 9
const DEPTH = 800

/** Si el navegador guarda algún progreso de checklists; sin localStorage, no. */
export function hasProgress(storage: ProgressStorage | null): boolean {
  try {
    return storage?.getItem(PROGRESS_KEY) != null
  } catch {
    return false
  }
}

function tilt(card: HTMLElement, motion: Pick<MediaQueryList, 'matches'>): () => void {
  const move = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || motion.matches) return
    const box = card.getBoundingClientRect()
    const x = (event.clientX - box.left) / box.width
    const y = (event.clientY - box.top) / box.height
    const turnY = ((x - 0.5) * 2 * MAX_TILT).toFixed(2)
    const turnX = ((0.5 - y) * 2 * MAX_TILT).toFixed(2)
    card.style.transform = `perspective(${DEPTH}px) rotateY(${turnY}deg) rotateX(${turnX}deg)`
    card.style.setProperty('--fx', `${(x * 100).toFixed(1)}%`)
    card.style.setProperty('--fy', `${(y * 100).toFixed(1)}%`)
    card.classList.add('is-tilted')
  }
  const leave = () => {
    card.style.transform = ''
    card.classList.remove('is-tilted')
  }
  card.addEventListener('pointermove', move)
  card.addEventListener('pointerleave', leave)
  return () => {
    card.removeEventListener('pointermove', move)
    card.removeEventListener('pointerleave', leave)
    leave()
  }
}

/** Inclina cada cartel con data-tilt; devuelve con qué pararlo. */
export function startTilt(root: ParentNode, motion: Pick<MediaQueryList, 'matches'>): () => void {
  const stops = [...root.querySelectorAll<HTMLElement>('[data-tilt]')].map((card) =>
    tilt(card, motion),
  )
  return () => stops.forEach((stop) => stop())
}
