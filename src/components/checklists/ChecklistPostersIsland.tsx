'use client'

import { useEffect, useEffectEvent } from 'react'

import type { PosterProgressModel } from '@/lib/checklists/poster-progress'

import { startPosters } from './posters-ui'

/** localStorage, o null si el navegador no deja tocarlo (modo privado estricto). */
function browserStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * La isla del índice /checklists: el porcentaje de cada cartel y la inclinación hacia el ratón
 * (posters-ui.ts). Sin ella los carteles se ven igual, sin porcentaje ni inclinación.
 */
export function ChecklistPostersIsland({ models }: { models: PosterProgressModel[] }) {
  const latest = useEffectEvent(() => models)
  // El DOM que pinta el servidor, localStorage y los eventos del puntero.
  useEffect(
    () =>
      startPosters(document, latest(), {
        storage: browserStorage(),
        motion: window.matchMedia('(prefers-reduced-motion: reduce)'),
      }),
    [],
  )
  return null
}
