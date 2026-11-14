'use client'

import { useEffect, useEffectEvent } from 'react'

import type { PosterProgressModel } from '@/lib/checklists/poster-progress'

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
 * La isla del índice /checklists: la inclinación hacia el ratón (posters-ui.ts) y, si el
 * navegador tiene progreso, el porcentaje de cada cartel (poster-progress-ui.ts, con import()).
 * Sin ella los carteles se ven igual, sin porcentaje ni inclinación.
 */
export function ChecklistPostersIsland({ models }: { models: PosterProgressModel[] }) {
  const latest = useEffectEvent(() => models)
  // El DOM que pinta el servidor, los eventos del puntero y localStorage.
  useEffect(() => {
    const stop = startTilt(document, window.matchMedia('(prefers-reduced-motion: reduce)'))
    const storage = browserStorage()
    let cancelled = false
    if (storage && hasProgress(storage)) {
      import('./poster-progress-ui')
        .then(({ paintProgress }) => {
          if (!cancelled) paintProgress(document, latest(), storage)
        })
        .catch((error: unknown) => console.error(error))
    }
    return () => {
      cancelled = true
      stop()
    }
  }, [])
  return null
}
