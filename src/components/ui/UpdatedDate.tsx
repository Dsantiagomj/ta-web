import { formatContentDate } from '@/lib/content-date/format'

import { uiStrings } from './strings'

/**
 * «Actualizado el 18 de noviembre de 2026» en la cabecera de una página (DESIGN.md, Updated
 * date): la fecha en que Torre cambió el contenido (src/lib/content-date/), con <time>. Sin
 * fecha, nada.
 */
export function UpdatedDate({
  value,
  className = 'qhead__updated',
}: {
  value: string | null | undefined
  className?: string
}) {
  const date = formatContentDate(value)
  if (!date) return null
  return (
    <p className={className}>
      {uiStrings.updated} <time dateTime={date.dateTime}>{date.text}</time>
    </p>
  )
}
