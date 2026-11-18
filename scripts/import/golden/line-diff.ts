// Un diff de líneas como el de git, para enseñar en qué cambia la salida de una página de oro:
// «-» se va, «+» llega, « » es contexto, y cada trozo empieza por «@@ -línea,n +línea,n @@».
// Código puro. Las salidas tienen unos pocos miles de líneas: la tabla de la subsecuencia
// común más larga cabe de sobra.

type Op = { kind: ' ' | '-' | '+'; line: string; before: number; after: number }

function split(text: string): string[] {
  if (text === '') return []
  const lines = text.split('\n')
  if (lines.at(-1) === '') lines.pop()
  return lines
}

function operations(before: string[], after: string[]): Op[] {
  const rows = before.length + 1
  const cols = after.length + 1
  // common[i][j]: la subsecuencia común más larga de before[i..] y after[j..].
  const common = new Uint32Array(rows * cols)
  for (let i = before.length - 1; i >= 0; i--) {
    for (let j = after.length - 1; j >= 0; j--) {
      common[i * cols + j] =
        before[i] === after[j]
          ? common[(i + 1) * cols + j + 1]! + 1
          : Math.max(common[(i + 1) * cols + j]!, common[i * cols + j + 1]!)
    }
  }
  const ops: Op[] = []
  let i = 0
  let j = 0
  while (i < before.length || j < after.length) {
    if (i < before.length && j < after.length && before[i] === after[j]) {
      ops.push({ kind: ' ', line: before[i]!, before: i++, after: j++ })
    } else if (
      j < after.length &&
      (i === before.length || common[i * cols + j + 1]! >= common[(i + 1) * cols + j]!)
    ) {
      ops.push({ kind: '+', line: after[j]!, before: i, after: j++ })
    } else {
      ops.push({ kind: '-', line: before[i]!, before: i++, after: j })
    }
  }
  // Dentro de cada tramo de cambios, lo que se va antes de lo que llega, como git.
  const ordered: Op[] = []
  for (let start = 0; start < ops.length;) {
    let end = start
    while (end < ops.length && ops[end]!.kind !== ' ') end++
    const run = ops.slice(start, end)
    ordered.push(...run.filter((op) => op.kind === '-'), ...run.filter((op) => op.kind === '+'))
    if (end < ops.length) ordered.push(ops[end]!)
    start = end + 1
  }
  return ordered
}

/** Las líneas del diff de before a after, con context líneas de contexto por trozo. */
export function lineDiff(before: string, after: string, context = 3): string[] {
  const ops = operations(split(before), split(after))
  const changed = ops.flatMap((op, index) => (op.kind === ' ' ? [] : [index]))
  if (changed.length === 0) return []

  // Los trozos: cada cambio con su contexto; dos trozos cuyo contexto se toca van juntos.
  const hunks: [number, number][] = []
  for (const index of changed) {
    const from = Math.max(0, index - context)
    const to = Math.min(ops.length - 1, index + context)
    const last = hunks.at(-1)
    if (last && from <= last[1] + 1) last[1] = Math.max(last[1], to)
    else hunks.push([from, to])
  }

  return hunks.flatMap(([from, to]) => {
    const slice = ops.slice(from, to + 1)
    const beforeCount = slice.filter((op) => op.kind !== '+').length
    const afterCount = slice.filter((op) => op.kind !== '-').length
    // Como git: un lado sin líneas lleva la línea anterior al trozo (0 al principio).
    const firstBefore = Math.min(...slice.map((op) => op.before))
    const firstAfter = Math.min(...slice.map((op) => op.after))
    const beforeStart = beforeCount ? firstBefore + 1 : firstBefore
    const afterStart = afterCount ? firstAfter + 1 : firstAfter
    return [
      `@@ -${beforeStart},${beforeCount} +${afterStart},${afterCount} @@`,
      ...slice.map((op) => `${op.kind}${op.line}`),
    ]
  })
}
