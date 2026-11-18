// «Actualizado el 18 de noviembre de 2026» y las fechas del JSON-LD (backlog D-03). Código puro.

import { TORRE_TIME_ZONE } from '@/lib/admin/strings'

const asDate = (value: unknown): Date | null => {
  if (typeof value !== 'string' && !(value instanceof Date)) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const text = new Intl.DateTimeFormat('es', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: TORRE_TIME_ZONE,
})

// en-CA da AAAA-MM-DD, el formato de <time datetime>.
const isoDay = new Intl.DateTimeFormat('en-CA', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: TORRE_TIME_ZONE,
})

/**
 * La fecha escrita en español y el día para <time datetime>, en la hora de Torre (Madrid),
 * la misma del panel. Null sin fecha o con una que no se lee.
 */
export function formatContentDate(value: unknown): { text: string; dateTime: string } | null {
  const date = asDate(value)
  if (!date) return null
  return { text: text.format(date), dateTime: isoDay.format(date) }
}

interface Dated {
  contentUpdatedAt?: string | Date | null
  createdAt?: string | Date | null
}

const iso = (value: unknown): string | null =>
  value instanceof Date ? value.toISOString() : typeof value === 'string' && value ? value : null

/**
 * Las fechas de una página: se publicó al crearse y cambió cuando Torre cambió el contenido
 * (contentUpdatedAt). Sin esa fecha, lo que publicó un script sin que nadie lo tocara después,
 * la de creación. Un cambio anterior a la creación (una semilla que escribe la fecha) adelanta
 * la publicación: el JSON-LD nunca dice que cambió antes de publicarse.
 */
export function contentDate(doc: Dated): { published: string | null; modified: string | null } {
  const created = iso(doc.createdAt)
  const changed = iso(doc.contentUpdatedAt)
  if (!changed) return { published: created, modified: created }
  if (created && new Date(changed).getTime() < new Date(created).getTime()) {
    return { published: changed, modified: changed }
  }
  return { published: created, modified: changed }
}
