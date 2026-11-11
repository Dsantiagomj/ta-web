// La parte sin git ni claude de `pnpm review:release` (scripts/review-release.ts): qué
// archivos se revisan, cómo se parten en tandas, el prompt, el veredicto y el informe.
import path from 'node:path'

export type GgaPatterns = { include: string[]; exclude: string[] }
export type Batch = { files: string[]; chars: number; oversized: boolean }
export type Outcome = 'passed' | 'failed' | 'errored'
export type BatchResult = Batch & { batch: number; outcome: Outcome; output: string }

/** Lee una variable de `.gga` (`NOMBRE="valor"` o `NOMBRE='valor'`) y la parte por comas. */
function ggaList(text: string, name: string): string[] | undefined {
  const line = new RegExp(`^\\s*${name}=(["'])(.*)\\1\\s*$`, 'm').exec(text)
  if (!line) return undefined
  return line[2]
    .split(',')
    .map((pattern) => pattern.trim())
    .filter(Boolean)
}

/** Los patrones de `.gga`. Sin FILE_PATTERNS gga revisa todo. */
export function parseGgaPatterns(text: string): GgaPatterns {
  return {
    include: ggaList(text, 'FILE_PATTERNS') ?? ['*'],
    exclude: ggaList(text, 'EXCLUDE_PATTERNS') ?? [],
  }
}

/** Un glob de bash dentro de `[[ == ]]`: `*` cruza barras y `?` es un carácter. */
function globToRegExp(pattern: string): RegExp {
  const body = pattern
    .split('')
    .map((char) => {
      if (char === '*') return '.*'
      if (char === '?') return '.'
      return char.replace(/[.+^${}()|[\]\\]/g, '\\$&')
    })
    .join('')
  return new RegExp(`^${body}$`)
}

/**
 * Lo mismo que hace gga 2.10 con cada patrón: si empieza por `*`, compara el final de la
 * ruta; si no, la ruta entera o el nombre del archivo como glob.
 */
export function matchesGgaPattern(file: string, pattern: string): boolean {
  if (pattern.startsWith('*')) return file.endsWith(pattern.slice(1))
  const glob = globToRegExp(pattern)
  return glob.test(file) || glob.test(path.posix.basename(file))
}

/** Los archivos que gga revisaría, en el mismo orden. */
export function selectReviewFiles(files: readonly string[], patterns: GgaPatterns): string[] {
  return files.filter(
    (file) =>
      patterns.include.some((pattern) => matchesGgaPattern(file, pattern)) &&
      !patterns.exclude.some((pattern) => matchesGgaPattern(file, pattern)),
  )
}

/** La ruta de destino de un trozo de `git diff`: `+++ b/…`, `rename to …` o la cabecera. */
function chunkPath(chunk: string): string | undefined {
  const plus = /^\+\+\+ b\/(.+)$/m.exec(chunk)
  if (plus) return plus[1]
  const renamed = /^rename to (.+)$/m.exec(chunk)
  if (renamed) return renamed[1]
  const header = /^diff --git a\/.* b\/(.+)$/m.exec(chunk)
  return header?.[1]
}

/** Parte la salida de `git diff` en un trozo por archivo, con la ruta de destino como clave. */
export function splitDiffByFile(diff: string): Map<string, string> {
  const chunks = new Map<string, string>()
  for (const chunk of diff.split(/^(?=diff --git )/m)) {
    if (!chunk.startsWith('diff --git ')) continue
    const file = chunkPath(chunk)
    if (file) chunks.set(file, chunk)
  }
  return chunks
}

/**
 * Junta los archivos en orden en tandas de como mucho `maxChars` caracteres de diff. Un
 * archivo que pasa del límite va solo en su tanda, marcada `oversized`: su diff se recorta.
 */
export function planBatches(
  files: readonly { path: string; chars: number }[],
  maxChars: number,
): Batch[] {
  const batches: Batch[] = []
  let current: Batch | undefined
  for (const file of files) {
    if (file.chars > maxChars) {
      current = undefined
      batches.push({ files: [file.path], chars: file.chars, oversized: true })
      continue
    }
    if (!current || current.chars + file.chars > maxChars) {
      current = { files: [], chars: 0, oversized: false }
      batches.push(current)
    }
    current.files.push(file.path)
    current.chars += file.chars
  }
  return batches
}

/** Recorta un diff a `maxChars` caracteres y deja una marca que lo dice. */
export function truncateDiff(diff: string, maxChars: number): string {
  if (diff.length <= maxChars) return diff
  return (
    `${diff.slice(0, maxChars)}\n\n` +
    `[DIFF TRUNCATED: showing ${maxChars} of ${diff.length} characters. ` +
    'Read the file in the worktree for the rest.]\n'
  )
}

/** El veredicto de la primera línea con texto: `STATUS: PASSED` o `STATUS: FAILED`, exacta. */
export function parseReviewStatus(output: string): 'passed' | 'failed' | null {
  const first = output
    .split('\n')
    .find((line) => line.trim() !== '')
    ?.trim()
  if (first === 'STATUS: PASSED') return 'passed'
  if (first === 'STATUS: FAILED') return 'failed'
  return null
}

export type ReviewArgs = { since: string | undefined; dryRun: boolean }

/** `--since <ref>` (o `--since=<ref>`) y `--dry-run`. Lo demás es un error. */
export function parseReviewArgs(argv: readonly string[]): ReviewArgs {
  const args: ReviewArgs = { since: undefined, dryRun: false }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--') continue
    if (arg === '--dry-run') {
      args.dryRun = true
    } else if (arg.startsWith('--since=')) {
      args.since = arg.slice('--since='.length)
      if (!args.since) throw new Error('--since necesita una ref')
    } else if (arg === '--since') {
      const ref = argv[index + 1]
      if (!ref || ref.startsWith('--')) throw new Error('--since necesita una ref')
      args.since = ref
      index += 1
    } else {
      throw new Error(
        `Argumento desconocido: ${arg}. Uso: pnpm review:release [--since <ref>] [--dry-run]`,
      )
    }
  }
  return args
}

/**
 * El worktree de la revisión y el informe, fuera del repo: junto a los demás worktrees, en
 * `<padre>/<repo>-worktrees`. La ref de inicio va en el nombre sin barras ni símbolos.
 */
export function releasePaths(repoRoot: string, since: string, shortSha: string) {
  const dir = path.join(path.dirname(repoRoot), `${path.basename(repoRoot)}-worktrees`)
  const safeSince = since.replace(/[^A-Za-z0-9._-]+/g, '-')
  return {
    worktree: path.join(dir, 'revision-release'),
    report: path.join(dir, `revision-release-${safeSince}..${shortSha}.md`),
  }
}

/** El prompt de una tanda: las reglas de AGENTS.md, qué revisar, el formato y el diff. */
export function buildReviewPrompt(input: {
  rules: string
  range: string
  batch: number
  total: number
  files: readonly string[]
  diff: string
}): string {
  return `You are reviewing a production release of this repository before it ships.
The release is the diff ${input.range}. It is too big for one review, so it is split into
batches; this is batch ${input.batch} of ${input.total}. Review only this batch's diff.

The current working directory is a checkout of exactly what will ship.
You may use Read, Grep and Glob on it to understand context (callers, types, tests, other
files). You cannot change anything.

Report only real defects introduced or exposed by this diff:
- bugs and wrong behavior, including edge cases and error handling
- security problems (auth, access control, injection, secrets, data exposure)
- data loss or corruption (migrations, writes, deletes, imports)
- broken contracts between modules, APIs, the database and the UI
- violations of the coding standards below (AGENTS.md)
Ignore style nits, naming preferences and anything already wrong before this diff unless the
diff makes it worse.

Answer format: the first line must be exactly \`STATUS: PASSED\` or \`STATUS: FAILED\`, with
nothing before it. Use FAILED when there is at least one finding that should block or be
consciously accepted before release. After the status line, list each finding as
\`path:line - severity (critical, high, medium, low) - what is wrong and why\`. Write the
findings in Spanish. With no findings, write one line saying so.

## Coding standards (AGENTS.md)

${input.rules.trim()}

## Files in this batch

${input.files.map((file) => `- ${file}`).join('\n')}

## Diff

\`\`\`diff
${input.diff}
\`\`\`
`
}

export function summarize(results: readonly BatchResult[]) {
  return {
    passed: results.filter((result) => result.outcome === 'passed').length,
    failed: results.filter((result) => result.outcome === 'failed').length,
    errored: results.filter((result) => result.outcome === 'errored').length,
  }
}

const OUTCOME_LABEL: Record<Outcome, string> = {
  passed: 'aprobada',
  failed: 'con fallos',
  errored: 'error',
}

/** El informe en Markdown: rango, modelo, resumen y, por tanda, sus archivos y la respuesta. */
export function renderReport(input: {
  range: string
  model: string
  results: readonly BatchResult[]
}): string {
  const { passed, failed, errored } = summarize(input.results)
  const total = input.results.length
  const sections = input.results.map((result) => {
    const files = result.files.map((file) => `- \`${file}\``).join('\n')
    const cut = result.oversized ? `\n\nDiff recortado: ${result.chars} caracteres en total.` : ''
    // Cuatro tildes: la respuesta del revisor puede traer bloques de código con tres.
    return `## Tanda ${result.batch} de ${total}: ${OUTCOME_LABEL[result.outcome]}

${files}${cut}

~~~~text
${result.output.trim()}
~~~~
`
  })
  return `# Revisión de release ${input.range}

Modelo: ${input.model}. Tandas: ${total}; ${passed} aprobadas, ${failed} con fallos, ${errored} con error.

${sections.join('\n')}`
}
