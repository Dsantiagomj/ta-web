'use client'

import { useEffect, type ReactNode } from 'react'

import { applyPanelA11yFixes } from '@/lib/admin/a11y-fixes'

/**
 * Envuelve el panel (admin.components.providers) y da nombre a los controles de Payload que
 * no lo traen (A-21, src/lib/admin/a11y-fixes.ts). No pinta nada propio.
 */
export function PanelA11y({ children }: { children?: ReactNode }) {
  // Sincroniza con el HTML que pinta Payload: cada cambio del DOM se revisa una vez por fotograma.
  useEffect(() => {
    let frame = 0
    const run = () => {
      frame = 0
      applyPanelA11yFixes(document.body)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(run)
    }
    run()
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['aria-label'],
    })
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [])

  return children
}
