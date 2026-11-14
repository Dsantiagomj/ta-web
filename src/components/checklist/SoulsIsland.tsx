'use client'

import { useEffect, useEffectEvent } from 'react'

import type { SoulsIslandData } from '@/lib/checklists/souls'

/**
 * La isla de una checklist de almas. Solo carga souls-ui.ts con import(): la ruta /<slug> lleva
 * sus islas a las guías de misión, de logro y de Dofus, que van justas de presupuesto. Sin ella
 * se ven todas las almas por etapa, sin casillas.
 */
export function SoulsIsland({ data }: { data: SoulsIslandData }) {
  const latest = useEffectEvent(() => data)
  // El DOM que pinta el servidor y localStorage: souls-ui marca, agrupa, filtra y guarda.
  useEffect(() => {
    let stop: (() => void) | undefined
    let cancelled = false
    import('./souls-ui')
      .then(({ startSouls }) => {
        if (!cancelled) stop = startSouls(latest())
      })
      .catch((error: unknown) => console.error(error))
    return () => {
      cancelled = true
      stop?.()
    }
  }, [data.version])
  return null
}
