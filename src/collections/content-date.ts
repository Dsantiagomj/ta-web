import type { CollectionBeforeChangeHook, DateField, PayloadRequest, TypedLocale } from 'payload'

import { contentDateOnSave } from '../lib/content-date/rule'
import { clearOnDuplicate } from './editorial-access'

/** Las colecciones con «Actualizado el» (backlog D-03): las que tienen página en /<slug>. */
export type ContentDateCollection =
  'quest-guides' | 'achievement-pages' | 'dofus-guides' | 'pages' | 'checklists'

export const CONTENT_DATE_COLLECTIONS: readonly ContentDateCollection[] = [
  'quest-guides',
  'achievement-pages',
  'dofus-guides',
  'pages',
  'checklists',
]

/**
 * La fecha en que una persona del panel publicó por última vez un cambio del contenido
 * (src/lib/content-date/rule.ts). Oculta: la pone el hook, nunca Torre. La copia empieza sin
 * ella y toma la suya al publicarse.
 */
export const contentDateField: DateField = {
  name: 'contentUpdatedAt',
  type: 'date',
  hooks: { beforeDuplicate: [clearOnDuplicate] },
  admin: { hidden: true },
}

// Los hooks de trackContentDate: las pruebas comprueban que cada colección lleva el suyo.
const contentDateHooks = new WeakSet<object>()

/** Si un hook beforeChange es el que pone la fecha del contenido (trackContentDate). */
export const isContentDateHook = (hook: object): boolean => contentDateHooks.has(hook)

/** El idioma en que se guarda; la API local sin idioma usa el de por defecto. */
function savedLocale(req: PayloadRequest): TypedLocale | undefined {
  if (req.locale && req.locale !== 'all') return req.locale as TypedLocale
  const { localization } = req.payload.config
  return localization ? (localization.defaultLocale as TypedLocale) : undefined
}

/**
 * Antes de guardar, la fecha del contenido. Lo publicado es la fila de la colección, no la
 * última versión: un borrador solo escribe versiones (como en trackSlugMove). Un guardado sin
 * persona (un script, una importación, la semilla) nunca la mueve.
 */
export function trackContentDate(collection: ContentDateCollection): CollectionBeforeChangeHook {
  const hook: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
    const status = data?._status ?? originalDoc?._status
    if (status !== 'published') return data
    // findByID y no db.findOne: el adaptador trae los campos traducidos como { es: … }.
    const stored = originalDoc?.id
      ? ((await req.payload.findByID({
          collection,
          id: originalDoc.id,
          draft: false,
          depth: 0,
          locale: savedLocale(req),
          overrideAccess: true,
          disableErrors: true,
          req,
        })) as Record<string, unknown> | null)
      : null
    const decision = contentDateOnSave({
      status,
      byPerson: Boolean(req.user),
      stored: stored ?? null,
      next: { ...originalDoc, ...data },
      now: new Date(),
    })
    if (!decision.change) return data
    return { ...data, contentUpdatedAt: decision.value }
  }
  contentDateHooks.add(hook)
  return hook
}
