// La salida de un conversor como JSON estable: las claves en orden alfabético a cualquier
// profundidad, los arrays en su orden (el de lectura de la página), sin los campos undefined y
// con salto de línea final. Dos conversiones iguales dan el mismo texto, y un diff de dos
// salidas enseña solo lo que cambió. Código puro.

function normalized(value: unknown, path: string): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`${path}: ${value} no se guarda en JSON`)
    return value
  }
  if (Array.isArray(value)) return value.map((item, index) => normalized(item, `${path}[${index}]`))
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort()) {
      const item = (value as Record<string, unknown>)[key]
      if (item !== undefined) sorted[key] = normalized(item, path ? `${path}.${key}` : key)
    }
    return sorted
  }
  throw new Error(`${path || 'la raíz'}: un ${typeof value} que JSON no guarda igual`)
}

export function stableJson(value: unknown): string {
  return `${JSON.stringify(normalized(value, ''), null, 2)}\n`
}
