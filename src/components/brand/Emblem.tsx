import type { CSSProperties } from 'react'

import { cx } from '@/components/ui/cx'

import { EMBLEM_ART, EMBLEM_VIEWBOX, type EmblemVariant } from './emblem-art'

/**
 * El emblema de Torrente Arcano (DESIGN.md, Brand): sombrero en --color-accent, glifo en
 * --color-bg y cara en --color-ink, así que sigue el tema y el modo de donde se pinte.
 * Decorativo: el nombre lo da el texto que lo acompaña. `simple` es la versión de 16 px.
 * width y height reservan el hueco; el CSS lo pinta a `size` en rem (--emblem), así que
 * crece con la fuente raíz.
 */
export function Emblem({
  variant = 'full',
  size = 32,
  className,
}: {
  variant?: EmblemVariant
  size?: number
  className?: string
}) {
  const simple = variant === 'simple'
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={EMBLEM_VIEWBOX}
      width={size}
      height={size}
      overflow="visible"
      data-variant={variant}
      className={cx('size-(--emblem) shrink-0', className)}
      style={{ '--emblem': `${size / 16}rem` } as CSSProperties}
    >
      <path
        data-part="hat"
        className="fill-accent"
        d={simple ? EMBLEM_ART.simpleHat : EMBLEM_ART.hat}
      />
      {!simple && (
        <>
          <g
            data-part="glyph"
            className="stroke-bg"
            fill="none"
            strokeWidth={EMBLEM_ART.glyphWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {EMBLEM_ART.glyph.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
          <g
            data-part="eyes"
            className="stroke-ink"
            fill="none"
            strokeWidth={EMBLEM_ART.eyesWidth}
            strokeLinecap="round"
          >
            {EMBLEM_ART.eyes.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
        </>
      )}
      <path
        data-part="grin"
        className="fill-ink"
        d={simple ? EMBLEM_ART.simpleGrin : EMBLEM_ART.grin}
      />
    </svg>
  )
}
