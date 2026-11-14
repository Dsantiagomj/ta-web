// Un campo de una fila que se escribe al crearla y luego queda fijo, como la clave de un
// prerrequisito de checklist (docs/research/backlog.md, A-23). Sin dependencias de Payload.

/** Lo que hay en `data` en ese camino, con cualquier número de fila en cada lista. */
function valuesAt(data: unknown, segments: string[]): unknown[] {
  let nodes: unknown[] = [data]
  for (const segment of segments) {
    const next: unknown[] = []
    for (const node of nodes) {
      if (/^\d+$/.test(segment)) {
        if (Array.isArray(node)) next.push(...node)
      } else if (node && typeof node === 'object' && !Array.isArray(node)) {
        next.push((node as Record<string, unknown>)[segment])
      }
    }
    nodes = next
  }
  return nodes
}

/**
 * Si la fila `rowId` ya estaba guardada con un valor en ese campo. `path` es el del campo en
 * el formulario («prerequisites.groups.0.rows.1.key»); la fila se busca por su id en todas
 * las filas guardadas, porque arrastrarla a otro sitio no la hace nueva.
 */
export function isSavedRowValue(saved: unknown, path: string, rowId: unknown): boolean {
  if (typeof rowId !== 'string' || !rowId) return false
  const segments = path.split('.')
  const field = segments.pop()!
  return valuesAt(saved, segments).some((row) => {
    if (!row || typeof row !== 'object') return false
    const { id, [field]: value } = row as Record<string, unknown>
    return id === rowId && typeof value === 'string' && value.trim() !== ''
  })
}

/** La fila en ese camino exacto, con sus números de fila. */
function rowAt(data: unknown, segments: string[]): Record<string, unknown> | undefined {
  let node: unknown = data
  for (const segment of segments) {
    if (!node || typeof node !== 'object') return undefined
    node = Array.isArray(node) ? node[Number(segment)] : (node as Record<string, unknown>)[segment]
  }
  return node && typeof node === 'object' ? (node as Record<string, unknown>) : undefined
}

const filled = (value: unknown): value is string => typeof value === 'string' && value.trim() !== ''

interface LockedRowArgs {
  /** El documento guardado. */
  saved: unknown
  /** El documento que llega, con todas sus filas. */
  incoming: unknown
  /** El camino del campo en el documento: ['prerequisites', 'groups', 0, 'rows', 1, 'key']. */
  path: (number | string)[]
  /** El id de la fila que llega, si lo trae. */
  rowId: unknown
  /** El valor que llega. */
  value: unknown
}

/**
 * El valor con el que se queda el campo de una fila al guardar, en el servidor. Igual que el
 * panel (isSavedRowValue), una fila guardada se busca por su id en todas las filas guardadas,
 * así que moverla a otro grupo no la hace nueva. Una fila con un id que nunca se guardó es
 * nueva y lleva el suyo. Una fila sin id (solo por la API) no le cambia el valor a ninguna:
 * si trae uno que ya estaba guardado, es esa fila; si no, y la fila guardada de su mismo sitio
 * tenía uno que ya no lleva ninguna fila, se queda con ese; si no, es una fila nueva.
 */
export function lockedRowValue({ saved, incoming, path, rowId, value }: LockedRowArgs): unknown {
  const segments = path.map(String)
  const field = segments.pop()!
  const rowsIn = (data: unknown) =>
    valuesAt(data, segments).filter(
      (row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object',
    )
  const savedRows = rowsIn(saved)

  if (typeof rowId === 'string' && rowId) {
    const row = savedRows.find((candidate) => candidate.id === rowId)
    return row && filled(row[field]) ? row[field] : value
  }

  if (filled(value) && savedRows.some((row) => row[field] === value)) return value
  const inPlace = rowAt(saved, segments)
  const kept = inPlace?.[field]
  if (!filled(kept)) return value
  // La fila guardada de este sitio sigue si llega con su id (en cualquier grupo, y con su
  // clave, sea cual sea la que traiga) o si otra fila trae su clave.
  const stillThere = rowsIn(incoming).some(
    (row) => row[field] === kept || (filled(row.id) && row.id === inPlace?.id),
  )
  return stillThere ? value : kept
}
