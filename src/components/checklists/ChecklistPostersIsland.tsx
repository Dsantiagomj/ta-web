'use client'

import { useEffect } from 'react'

import { hasProgress, startTilt } from './posters-ui'

/** localStorage, o null si el navegador no deja tocarlo (modo privado estricto). */
function browserStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * La isla del índice /checklists: la inclinación hacia el ratón (posters-ui.ts) y, cuando el
 * navegador tiene progreso, el porcentaje de cada cartel (poster-progress-ui.ts, con import():
 * el motor y lo que pide no viajan a quien no ha marcado nada). Si el progreso aparece después,
 * en otra pestaña o al volver con atrás, arranca entonces. Sin ella los carteles se ven igual,
 * sin porcentaje ni inclinación.
 */
export function ChecklistPostersIsland() {
  // El DOM que pinta el servidor, los eventos del puntero y de la ventana, y localStorage.
  useEffect(() => {
    const stopTilt = startTilt(document, window.matchMedia('(prefers-reduced-motion: reduce)'))
    const storage = browserStorage()
    let stopProgress: (() => void) | undefined
    let starting = false
    let cancelled = false
    const start = () => {
      if (starting || !storage || !hasProgress(storage)) return
      starting = true
      window.removeEventListener('storage', start)
      window.removeEventListener('pageshow', start)
      import('./poster-progress-ui')
        .then(({ fetchPosterModels, startProgress }) => {
          if (cancelled) return
          stopProgress = startProgress(document, {
            storage,
            loadModels: fetchPosterModels,
            events: window,
          })
        })
        .catch((error: unknown) => console.error(error))
    }
    window.addEventListener('storage', start)
    window.addEventListener('pageshow', start)
    start()
    return () => {
      cancelled = true
      window.removeEventListener('storage', start)
      window.removeEventListener('pageshow', start)
      stopTilt()
      stopProgress?.()
    }
  }, [])
  return null
}
