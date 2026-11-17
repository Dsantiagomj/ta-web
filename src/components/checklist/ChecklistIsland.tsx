'use client'

import { useEffect, useEffectEvent } from 'react'

import type { ChecklistIslandData } from '@/lib/checklists/page'

/**
 * La isla de la página de una checklist (prototipo A). Recibe solo la estructura de la
 * checklist (plan, sección 3); todo lo demás ya está en el HTML. Cambia de pestaña, abre el
 * paso elegido al lado de la lista (en el móvil, en una hoja abajo), busca pasos por número o
 * texto y, después de pintar, pide los detalles: quién da cada misión y las coordenadas.
 * Sin ella, las pestañas y los pasos son enlaces y todo se ve, una parte detrás de otra.
 * Con ella, también el progreso: marcar pasos, misiones, prerrequisitos y objetos (progress-ui.ts).
 * Solo carga checklist-ui.ts con import(): la ruta /<slug> lleva sus islas a las guías de misión,
 * de logro y de Dofus, que van justas de presupuesto.
 */
export function ChecklistIsland({ data }: { data: ChecklistIslandData }) {
  // Lo último que llegó, sin volver a empezar la isla: una vista previa que se refresca trae un
  // objeto nuevo con lo mismo. Solo otra checklist u otra versión de ella la reinician.
  const latest = useEffectEvent(() => data)
  // Sincroniza con el DOM del servidor, el <dialog>, matchMedia y la API de detalles.
  useEffect(() => {
    let stop: (() => void) | undefined
    let cancelled = false
    import('./checklist-ui')
      .then(({ startChecklist }) => {
        if (!cancelled) stop = startChecklist(latest)
      })
      .catch((error: unknown) => console.error(error))
    return () => {
      cancelled = true
      stop?.()
    }
  }, [data.slug, data.version])

  return null
}
