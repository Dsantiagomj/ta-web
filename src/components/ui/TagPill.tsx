import type { ReactNode } from 'react'

import { cx } from './cx'
import './ui.css'

const TAG =
  'inline-flex h-6 items-center rounded-pill border border-accent-2 px-2.5 text-xs leading-none font-semibold whitespace-nowrap text-accent-2 no-underline'

/** Etiqueta con contorno en --color-accent-2; con href es un enlace. */
export function TagPill({ href, children }: { href?: string; children: ReactNode }) {
  if (!href) return <span className={TAG}>{children}</span>
  return (
    <a
      href={href}
      className={cx(
        TAG,
        'hit-target relative transition-colors duration-(--duration-fast) ease-standard hover:bg-raised',
      )}
    >
      {children}
    </a>
  )
}
