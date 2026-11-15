// La inclinación hacia el ratón sobre el HTML del servidor: cada elemento con data-tilt se
// inclina hacia el puntero hasta 9° por lado y el brillo que lleva dentro lo sigue (--fx, --fy),
// como la carta de silvestre-checklist (src/lib/tilt.js). La usan los carteles de /checklists
// (ChecklistPostersIsland) y las tarjetas de /guias-dofus (DofusIndexIsland). Solo con ratón y
// sin movimiento reducido; al salir vuelve a su sitio. El resto (el brillo, la sombra, el
// regreso de 150ms) es CSS, que se agarra a la clase is-tilted.

const MAX_TILT = 9
const DEPTH = 800

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

/** Inclina cada elemento con data-tilt dentro de root; devuelve con qué pararlo. */
export function startTilt(root: ParentNode, motion: Pick<MediaQueryList, 'matches'>): () => void {
  const stops = [...root.querySelectorAll<HTMLElement>('[data-tilt]')].map((card) =>
    tilt(card, motion),
  )
  return () => stops.forEach((stop) => stop())
}
