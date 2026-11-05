import type { ReactNode } from 'react'

import { cx } from './cx'

const PANEL = 'block rounded-card bg-surface text-ink'

/**
 * Panel en --color-surface. Con href, la tarjeta entera es un único enlace (DESIGN.md:
 * nunca un enlace dentro de otro), con el borde en el color de la sección al pasar.
 */
export function Card({
  href,
  className,
  children,
}: {
  href?: string
  className?: string
  children: ReactNode
}) {
  if (!href) return <div className={cx(PANEL, className)}>{children}</div>
  return (
    <a
      href={href}
      className={cx(
        PANEL,
        'group overflow-hidden border border-line no-underline focus-visible:outline-3 focus-visible:outline-offset-4',
        'transition-[border-color,transform] duration-(--duration-fast) ease-out hover:-translate-y-0.5 hover:border-section',
        className,
      )}
    >
      {children}
    </a>
  )
}
