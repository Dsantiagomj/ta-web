import { Fragment } from 'react'

/**
 * Unas cifras seguidas («Misión de Astrub - Nivel 20 - Misión 2 de 3»). Cada una va en un
 * bloque en línea, así que la línea se parte entre cifras y no dentro de una mientras quepa
 * entera, y el separador va al final de la anterior: una línea partida nunca empieza por él.
 * Con la clase de Tailwind, que va en la hoja global: /guias-dofus no carga otra hoja.
 */
export function MetaParts({ parts, separator }: { parts: string[]; separator: string }) {
  const trailing = separator.trimEnd()
  return parts.map((part, index) => (
    <Fragment key={index}>
      {index > 0 && ' '}
      <span className="inline-block">{index < parts.length - 1 ? `${part}${trailing}` : part}</span>
    </Fragment>
  ))
}
