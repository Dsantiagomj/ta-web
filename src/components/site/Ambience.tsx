import type { CSSProperties } from 'react'

import { AMBIENCE_PARTICLES, type ChecklistAmbience } from './ambience-data'

// Los estilos van en ambience.css, que site.css importa: la cabecera los trae a cada página,
// sin una hoja más (AGENTS.md, Three stylesheets per page at most).

/**
 * El ambiente (DESIGN.md, Ambience): partículas que suben hacia la cabecera, detrás del
 * contenido, con el aspecto del tema y el modo. Solo marcado y CSS, sin JavaScript. `fx` lo
 * cambia por el de una checklist (la de la página oculta la del sitio); `demo` lo encierra
 * en su caja, para el catálogo.
 */
export function Ambience({ fx, demo = false }: { fx?: ChecklistAmbience; demo?: boolean }) {
  const className = ['amb', fx && 'amb--page', demo && 'amb--demo'].filter(Boolean).join(' ')
  return (
    <div className={className} aria-hidden="true" data-fx={fx}>
      {AMBIENCE_PARTICLES.map((p, i) => (
        <i
          key={i}
          style={
            {
              '--x': `${p.x}%`,
              '--d': `${p.delay}s`,
              '--t': `${p.duration}s`,
              '--s': `${p.size}rem`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
