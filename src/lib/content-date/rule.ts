// Cuándo cambió el contenido de una página (backlog D-03, AGENTS.md, Content date). updatedAt
// cambia con cualquier escritura, también las de los scripts (pnpm guides:rewards, las
// importaciones, los rellenos), así que «Actualizado el» lee contentUpdatedAt, que solo se mueve
// cuando una persona del panel publica un cambio de lo que la página enseña. Código puro.

/** Lo que no es contenido: fechas, estado, la dirección, el SEO y lo que guarda la importación. */
const NOT_CONTENT = new Set([
  'id',
  'createdAt',
  'updatedAt',
  '_status',
  'contentUpdatedAt',
  'importSnapshot',
  'slug',
  'seo',
])

type Doc = Record<string, unknown>

const isRecord = (value: unknown): value is Doc =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Un documento poblado (tiene ID y fecha de creación) cuenta como su ID. */
const isPopulatedDoc = (value: Doc) => 'id' in value && 'createdAt' in value

const isEmpty = (value: unknown) =>
  value === null ||
  value === undefined ||
  value === '' ||
  (Array.isArray(value) && value.length === 0) ||
  (isRecord(value) && Object.keys(value).length === 0)

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(normalize)
  if (!isRecord(value)) return value
  if (isPopulatedDoc(value)) return value.id
  const out: Doc = {}
  for (const key of Object.keys(value).sort()) {
    const item = normalize(value[key])
    // Vacío o ausente es lo mismo: el panel manda null o [] donde la base no tiene nada.
    if (isEmpty(item)) continue
    out[key] = item
  }
  return out
}

/** Lo que la página enseña, en un texto comparable: sin fechas, estado, slug ni SEO. */
export function editorialFingerprint(doc: Doc | null | undefined): string {
  if (!doc) return ''
  const content: Doc = {}
  for (const [key, value] of Object.entries(doc)) {
    if (!NOT_CONTENT.has(key)) content[key] = value
  }
  return JSON.stringify(normalize(content))
}

export interface ContentDateSave {
  /** El estado con el que se guarda: un borrador no cambia lo que ve la web. */
  status: unknown
  /** Lo guarda una persona del panel (req.user); un script o una importación no tienen. */
  byPerson: boolean
  /** La fila publicada antes de guardar, lo que ve la web; null si no existía. */
  stored: Doc | null
  /** El documento que queda al guardar (lo guardado más lo que llega). */
  next: Doc
  now: Date
}

export type ContentDateDecision = { change: false } | { change: true; value: string | null }

const dateValue = (value: unknown): string | null => {
  if (value instanceof Date) return value.toISOString()
  return typeof value === 'string' && value ? value : null
}

/**
 * La fecha del contenido al guardar. Solo al publicar: un borrador no cambia lo que ve la web.
 * Una persona del panel la pone a ahora cuando lo publicado cambia (o es la primera vez que se
 * publica); si no, se queda la de lo publicado. Un script nunca la mueve, salvo que la escriba
 * a propósito (la semilla de las pruebas).
 */
export function contentDateOnSave({
  status,
  byPerson,
  stored,
  next,
  now,
}: ContentDateSave): ContentDateDecision {
  if (status !== 'published') return { change: false }
  const kept = dateValue(stored?.contentUpdatedAt)
  if (!byPerson) {
    const written = next.contentUpdatedAt
    if (stored === null && written !== undefined) return { change: true, value: dateValue(written) }
    return { change: true, value: kept }
  }
  const firstPublish = stored?._status !== 'published'
  if (firstPublish || editorialFingerprint(next) !== editorialFingerprint(stored)) {
    return { change: true, value: now.toISOString() }
  }
  return { change: true, value: kept }
}
