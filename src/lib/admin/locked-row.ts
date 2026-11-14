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
