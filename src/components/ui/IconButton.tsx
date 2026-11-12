import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { cx } from './cx'

/** Botón redondo con solo un icono; el nombre accesible es obligatorio. */
export function IconButton({
  label,
  icon,
  className,
  type = 'button',
  ...props
}: { label: string; icon: ReactNode } & Omit<ComponentPropsWithoutRef<'button'>, 'children'>) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cx(
        'inline-grid size-10 shrink-0 cursor-pointer place-items-center rounded-pill bg-raised text-ink pointer-coarse:size-11 [&>svg]:size-4.5',
        'transition-[background-color,transform] duration-(--duration-fast) ease-standard hover:bg-line active:scale-96',
        'disabled:pointer-events-none disabled:opacity-40',
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  )
}
