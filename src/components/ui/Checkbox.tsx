import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import './ui.css'

/** Casilla nativa con el estilo de DESIGN.md, dentro de su etiqueta. */
export function Checkbox({
  label,
  ...props
}: { label: ReactNode } & Omit<ComponentPropsWithoutRef<'input'>, 'type'>) {
  return (
    <label className="hit-target relative inline-flex min-h-10 cursor-pointer items-center gap-2.5 text-sm text-ink has-checked:text-muted">
      <input type="checkbox" className="checkbox" {...props} />
      {label}
    </label>
  )
}
