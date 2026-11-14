// La isla del índice /checklists sobre el HTML del servidor (ChecklistsIndex.tsx):
// - el porcentaje de cada cartel, del progreso del navegador (ta-web:progress), con el mismo
//   motor que la página de la checklist (src/lib/checklists/poster-progress.ts). Sin nada
//   marcado no se enseña nada;
// - con el ratón, el cartel se inclina hacia él hasta 9° por lado y el brillo holográfico lo
//   sigue (--fx, --fy), como la carta de silvestre-checklist (src/lib/tilt.js). Solo con ratón
//   y sin movimiento reducido; al salir vuelve a su sitio.
import { posterPct, type PosterProgressModel } from '@/lib/checklists/poster-progress'
import { readProgress, type ProgressStorage } from '@/lib/checklists/progress/store'

import { posterStrings as s } from './poster-strings'

const MAX_TILT = 9
const DEPTH = 800

export interface PostersEnv {
  /** localStorage, o null si el navegador no deja tocarlo. */
  storage: ProgressStorage | null
  /** prefers-reduced-motion: reduce. */
  motion: Pick<MediaQueryList, 'matches'>
}

function paintProgress(root: ParentNode, models: PosterProgressModel[], env: PostersEnv) {
  if (!env.storage) return
  const progress = readProgress(env.storage)
  for (const model of models) {
    const ring = root.querySelector<HTMLElement>(`[data-poster-progress="${model.slug}"]`)
    if (!ring) continue
    const pct = posterPct(progress, model)
    if (!pct) continue
    const label = ring.querySelector('[data-poster-pct]')
    if (label) label.textContent = s.pct(pct)
    ring.style.setProperty('--ratio', String(pct / 100))
    ring.classList.toggle('poster__ring--done', pct === 100)
    ring.hidden = false
  }
}

function tilt(card: HTMLElement, env: PostersEnv): () => void {
  const move = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || env.motion.matches) return
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

/** Arranca la isla; devuelve con qué pararla. */
export function startPosters(
  root: ParentNode,
  models: PosterProgressModel[],
  env: PostersEnv,
): () => void {
  paintProgress(root, models, env)
  const stops = [...root.querySelectorAll<HTMLElement>('[data-tilt]')].map((card) =>
    tilt(card, env),
  )
  return () => stops.forEach((stop) => stop())
}
