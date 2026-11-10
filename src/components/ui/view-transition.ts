// Cambia la página dentro de una transición de vista con su tipo (DESIGN.md, Motion): el CSS
// de cada página decide qué se mueve con `:active-view-transition-type(<tipo>)`. Sin
// transiciones de vista o con movimiento reducido, cambia en el acto. Solo para islas.

interface Env {
  document: Document
  matchMedia: typeof window.matchMedia
}

export function smoothUpdate(update: () => void, type: string, env?: Env) {
  const { document: doc, matchMedia: media } = env ?? { document, matchMedia }
  const start = doc.startViewTransition?.bind(doc)
  if (!start || media('(prefers-reduced-motion: reduce)').matches) return update()
  try {
    start({ update, types: [type] })
  } catch {
    // Safari 18.0 y Chrome < 125 solo aceptan la función: sin tipo, el CSS no nombra nada
    // y la página entera se funde.
    start(update)
  }
}
