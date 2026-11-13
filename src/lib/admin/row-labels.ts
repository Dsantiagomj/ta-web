import { checklistStrings } from '../checklists/strings'
import { panelStrings, rowLabelText, truncateLabel } from './strings'

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
  const singular = SPECIAL_KINDS.includes(kind)
    ? `${r.segment} ${(rowIndex ?? 0) + 1} (${checklistStrings.segmentKinds[kind]})`
    : `${r.segment} ${(rowIndex ?? 0) + 1}`
  const body = text(data?.text)?.replace(/\s+/g, ' ').trim()
  return body ? `${singular}: ${truncateLabel(body)}` : singular
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

// El panel lee los nombres por la API REST, en el navegador. Una petición por documento
// mientras la página siga abierta; si falla, se reintenta la próxima vez.
const titles = new Map<string, Promise<string | null>>()

/** El nombre de un documento enlazado (una misión, un objeto), o null si no llega. */
export function fetchRelationTitle(
  apiUrl: string,
  relationTo: string,
  id: number,
): Promise<string | null> {
  const url = `${apiUrl}/${relationTo}/${id}?depth=0&select[name]=true`
  const cached = titles.get(url)
  if (cached) return cached
  const request = fetch(url, { credentials: 'include' })
    .then((response) => (response.ok ? (response.json() as Promise<{ name?: unknown }>) : null))
    .catch(() => null)
    .then((doc) => {
      const name = text(doc?.name) ?? null
      if (!name) titles.delete(url)
      return name
    })
  titles.set(url, request)
  return request
}
