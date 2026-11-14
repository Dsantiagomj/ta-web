import { checklistStrings } from '../checklists/strings'
import { panelStrings, rowLabelText } from './strings'

// Las etiquetas de las filas del panel (los componentes en src/components/admin/RowLabels.tsx).
// Payload numera las filas desde 0 («Paso 01»); Torre las busca por su texto.

const r = panelStrings.rowLabels

type Row = Record<string, unknown> | undefined

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value : undefined

/** Un paso de una checklist: el texto de su primer tramo con texto, o su zona. */
export function stepRowLabel(data: Row, rowIndex?: number): string {
  const segments = Array.isArray(data?.segments) ? (data.segments as Row[]) : []
  const first = segments.map((segment) => text(segment?.text)).find(Boolean)
  return rowLabelText(r.step, rowIndex, first ?? text(data?.zone))
}

const SPECIAL_KINDS = ['stop', 'resolve'] as const
type SpecialKind = (typeof SPECIAL_KINDS)[number]

/** Un tramo del texto de un paso: su texto y, si no es normal, su tipo. */
export function segmentRowLabel(data: Row, rowIndex?: number): string {
  const kind = data?.kind as SpecialKind
  const qualifier = SPECIAL_KINDS.includes(kind) ? checklistStrings.segmentKinds[kind] : undefined
  return rowLabelText(r.segment, rowIndex, text(data?.text), { qualifier })
}

/** Una fila que se llama por uno de sus campos de texto: «Grupo 1: Recursos». */
export function textRowLabel(singular: string, field: string) {
  return (data: Row, rowIndex?: number): string =>
    rowLabelText(singular, rowIndex, text(data?.[field]))
}

/** El id de una relación como la guarda el formulario: un número, `{ id }` o `{ value }`. */
export function relationId(value: unknown): number | null {
  if (Array.isArray(value)) return value.length ? relationId(value[0]) : null
  if (value && typeof value === 'object') {
    const object = value as { id?: unknown; value?: unknown }
    return relationId(object.value ?? object.id)
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

/** Todos los ids de una relación, también de una con varias (hasMany). */
export function relationIds(value: unknown): number[] {
  const values = Array.isArray(value) ? value : [value]
  return values.map(relationId).filter((id): id is number => id !== null)
}

/**
 * La fila de una relación: el nombre del primer documento y, si enlaza varios (las misiones
 * alternativas de un logro), cuántos más hay: «Misión 3: La forja (o 17 más)».
 */
export function relationRowLabel(
  singular: string,
  rowIndex: number | undefined,
  title: string | undefined,
  count: number,
): string {
  const suffix = count > 1 ? r.alternatives(count - 1) : ''
  return rowLabelText(singular, rowIndex, title, { suffix })
}

// El panel lee los nombres por la API REST, en el navegador. Las filas que piden en el mismo
// momento se juntan: una petición por colección (`where[id][in]`), no una por fila, que en
// una checklist de 40 pasos eran unas 150. Un nombre vale un minuto: si Torre cambia uno
// en otra pestaña, la fila lo vuelve a leer.
export const RELATION_TITLE_TTL_MS = 60_000
/** Ids por petición: la URL se queda corta de sobra. */
const BATCH_SIZE = 100

type Cached = { title: Promise<string | null>; at: number }
type Waiting = { id: number; resolve: (title: string | null) => void }

const titles = new Map<string, Cached>()
const queues = new Map<string, Waiting[]>()

async function loadBatch(apiUrl: string, relationTo: string, ids: number[]) {
  const url =
    `${apiUrl}/${relationTo}?where[id][in]=${ids.join(',')}` +
    '&depth=0&limit=0&pagination=false&select[name]=true'
  try {
    const response = await fetch(url, { credentials: 'include' })
    if (!response.ok) return new Map<number, string>()
    const { docs } = (await response.json()) as { docs?: { id?: unknown; name?: unknown }[] }
    return new Map(
      (docs ?? []).flatMap((doc) => {
        const name = text(doc.name)
        return typeof doc.id === 'number' && name ? [[doc.id, name] as const] : []
      }),
    )
  } catch {
    return new Map<number, string>()
  }
}

function flush(apiUrl: string, relationTo: string) {
  const queueKey = `${apiUrl} ${relationTo}`
  const waiting = queues.get(queueKey) ?? []
  queues.delete(queueKey)
  const ids = [...new Set(waiting.map((entry) => entry.id))]
  for (let start = 0; start < ids.length; start += BATCH_SIZE) {
    const batch = ids.slice(start, start + BATCH_SIZE)
    void loadBatch(apiUrl, relationTo, batch).then((names) => {
      for (const entry of waiting) {
        if (batch.includes(entry.id)) entry.resolve(names.get(entry.id) ?? null)
      }
    })
  }
}

/** El nombre de un documento enlazado (una misión, un objeto), o null si no llega. */
export function fetchRelationTitle(
  apiUrl: string,
  relationTo: string,
  id: number,
): Promise<string | null> {
  const key = `${apiUrl} ${relationTo} ${id}`
  const cached = titles.get(key)
  if (cached && Date.now() - cached.at < RELATION_TITLE_TTL_MS) return cached.title

  const queueKey = `${apiUrl} ${relationTo}`
  const title = new Promise<string | null>((resolve) => {
    const queue = queues.get(queueKey)
    if (queue) queue.push({ id, resolve })
    else {
      queues.set(queueKey, [{ id, resolve }])
      // Las filas se montan juntas: todo lo pedido en esta vuelta va en el mismo lote.
      setTimeout(() => flush(apiUrl, relationTo), 0)
    }
  }).then((name) => {
    // Sin nombre (un fallo, o un documento que no llegó), la próxima fila lo reintenta.
    if (!name) titles.delete(key)
    return name
  })
  titles.set(key, { title, at: Date.now() })
  return title
}
