'use client'

import { useEffect, type ReactNode } from 'react'

import { applyPanelA11yFixes } from '@/lib/admin/a11y-fixes'

/** Si un cambio del DOM pasó dentro de un editor de texto: escribir no cambia ningún nombre. */
const insideEditor = (mutation: MutationRecord) => {
  const target =
    mutation.target.nodeType === Node.ELEMENT_NODE
      ? (mutation.target as Element)
      : mutation.target.parentElement
  return Boolean(target?.closest('[contenteditable="true"]'))
}

/**
 * Envuelve el panel (admin.components.providers) y da nombre a los controles de Payload que
 * no lo traen (A-21, src/lib/admin/a11y-fixes.ts). No pinta nada propio.
 */
export function PanelA11y({ children }: { children?: ReactNode }) {
  // Sincroniza con el HTML que pinta Payload: los cambios del DOM se revisan una vez por
  // fotograma, y la primera vez un fotograma después de montar, cuando React ya hidrató.
  useEffect(() => {
    let frame = 0
    const run = () => {
      frame = 0
      applyPanelA11yFixes(document.body)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(run)
    }
    const observer = new MutationObserver((mutations) => {
      if (mutations.every(insideEditor)) return
      schedule()
    })
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['aria-label', 'aria-hidden'],
    })
    schedule()
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [])

  return children
}
