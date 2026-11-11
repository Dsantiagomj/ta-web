// pnpm review:release [--since <ref>] [--dry-run]: revisa con IA todo lo que entra en la
// próxima release antes de lanzar release.yml. Toma lo que hay entre el último tag de
// release alcanzable desde origin/main (o --since) y origin/main, lo filtra con los
// patrones de .gga y lo parte en tandas que caben en un prompt. Cada tanda la revisa
// `claude --print` (Fable salvo RELEASE_REVIEW_MODEL) sobre un worktree de origin/main, con
// herramientas de solo lectura. El informe va fuera del repo, junto a los worktrees.
//
// Variables: RELEASE_REVIEW_MODEL (fable), RELEASE_REVIEW_JOBS (3 tandas a la vez),
// RELEASE_REVIEW_TIMEOUT_MINUTES (20 por tanda), RELEASE_REVIEW_BATCH_CHARS (120000
// caracteres de diff por tanda).
import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { mapWithConcurrency } from '../src/lib/concurrency.ts'
import {
  buildReviewPrompt,
  parseGgaPatterns,
  parseReviewArgs,
  parseReviewStatus,
  planBatches,
  releasePaths,
  renderReport,
  selectReviewFiles,
  splitDiffByFile,
  summarize,
  truncateDiff,
  type Batch,
  type BatchResult,
} from './review-release-plan.ts'

// Lo que el revisor puede usar: leer y buscar. Lo demás se niega dos veces, por si
// --tools dejara pasar algo; sin MCP (--strict-mcp-config) no llega a servicios externos.
const REVIEW_TOOLS = 'Read,Grep,Glob'
const DENIED_TOOLS = 'Bash,Edit,Write,NotebookEdit,WebFetch,WebSearch,Agent,Task'

function positiveInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim()
  if (!raw) return fallback
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} debe ser un entero mayor que 0, no «${raw}»`)
  }
  return value
}

function git(args: string[], cwd?: string): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

// Diffs comparables entre máquinas: sin color, sin diff externo y con los prefijos a/ y b/
// aunque la configuración de git del usuario diga otra cosa.
const DIFF_FLAGS = [
  'diff',
  '--no-color',
  '--no-ext-diff',
  '--no-textconv',
  '--src-prefix=a/',
  '--dst-prefix=b/',
]

let args: ReturnType<typeof parseReviewArgs>
let model: string
let jobs: number
let timeoutMs: number
let maxChars: number
try {
  args = parseReviewArgs(process.argv.slice(2))
  model = process.env.RELEASE_REVIEW_MODEL?.trim() || 'fable'
  jobs = positiveInt('RELEASE_REVIEW_JOBS', 3)
  timeoutMs = positiveInt('RELEASE_REVIEW_TIMEOUT_MINUTES', 20) * 60_000
  maxChars = positiveInt('RELEASE_REVIEW_BATCH_CHARS', 120_000)
} catch (error) {
  console.error((error as Error).message)
  process.exit(2)
}

// La raíz del clon principal, también cuando se lanza desde otro worktree.
const repoRoot = path.dirname(
  git(['rev-parse', '--path-format=absolute', '--git-common-dir']).trim(),
)

console.log('Trayendo origin/main y los tags…')
git(['fetch', 'origin', 'main', '--tags'])

const sha = git(['rev-parse', 'origin/main^{commit}']).trim()
const shortSha = git(['rev-parse', '--short', sha]).trim()

let since = args.since
if (!since) {
  try {
    since = git(['describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*', sha]).trim()
  } catch {
    console.error(
      'No hay ningún tag de release (v*) en origin/main. Indica el inicio con --since <ref>.',
    )
    process.exit(2)
  }
}

let sinceSha: string
try {
  sinceSha = git(['rev-parse', `${since}^{commit}`]).trim()
} catch {
  console.error(`No encuentro la ref «${since}».`)
  process.exit(2)
}

const range = `${since}...${shortSha}`
if (sinceSha === sha) {
  console.log(`origin/main (${shortSha}) es ${since}: no hay nada que revisar.`)
  process.exit(0)
}

// Los patrones y las reglas, tal como están en lo que se va a publicar.
const patterns = parseGgaPatterns(git(['show', `${sha}:.gga`]))
const changed = git([
  '-c',
  'core.quotePath=false',
  'diff',
  '--name-only',
  '-z',
  '--diff-filter=ACMR',
  `${since}...${sha}`,
])
  .split('\0')
  .filter(Boolean)
const files = selectReviewFiles(changed, patterns)

console.log(`Rango: ${since}...origin/main (${range})`)
console.log(`Archivos cambiados: ${changed.length}; a revisar según .gga: ${files.length}`)
if (files.length === 0) {
  console.log('Nada que revisar.')
  process.exit(0)
}

// Un solo `git diff` para todos los archivos, partido luego por archivo.
const diffArgs = (paths: string[]) => [
  '-c',
  'core.quotePath=false',
  '--literal-pathspecs',
  ...DIFF_FLAGS,
  '--diff-filter=ACMR',
  `${since}...${sha}`,
  '--',
  ...paths,
]
const chunks = splitDiffByFile(git(diffArgs(files)))
for (const file of files) {
  // Una ruta que el reparto no reconoció: se pide su diff aparte.
  if (!chunks.has(file)) chunks.set(file, git(diffArgs([file])))
}

const batches = planBatches(
  files.map((file) => ({ path: file, chars: chunks.get(file)?.length ?? 0 })),
  maxChars,
)

const kb = (chars: number) => `${Math.round(chars / 1000)}k`
console.log(`Tandas: ${batches.length} (hasta ${kb(maxChars)} caracteres de diff cada una)`)

if (args.dryRun) {
  batches.forEach((batch, index) => {
    const cut = batch.oversized ? ', se recorta' : ''
    console.log(
      `\nTanda ${index + 1}: ${batch.files.length} archivos, ${kb(batch.chars)} caracteres${cut}`,
    )
    for (const file of batch.files) console.log(`  ${file} (${kb(chunks.get(file)?.length ?? 0)})`)
  })
  console.log(`\nSin --dry-run, cada tanda va a claude --model ${model}.`)
  process.exit(0)
}

const paths = releasePaths(repoRoot, since, shortSha)
const running = new Set<ChildProcess>()

function removeWorktree() {
  if (existsSync(paths.worktree)) {
    try {
      git(['worktree', 'remove', '--force', paths.worktree], repoRoot)
    } catch {
      rmSync(paths.worktree, { recursive: true, force: true })
    }
  }
  git(['worktree', 'prune'], repoRoot)
}

// Ctrl-C o un kill: se paran los revisores y se quita el worktree antes de salir.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    console.error(`\n${signal}: paro las revisiones y quito el worktree.`)
    for (const child of running) child.kill('SIGTERM')
    removeWorktree()
    process.exit(130)
  })
}

function runClaude(
  prompt: string,
): Promise<{ code: number | null; output: string; timedOut: boolean }> {
  return new Promise((resolve) => {
    const child = spawn(
      'claude',
      [
        '--print',
        '--model',
        model,
        '--tools',
        REVIEW_TOOLS,
        '--disallowedTools',
        DENIED_TOOLS,
        '--strict-mcp-config',
        '--no-session-persistence',
      ],
      { cwd: paths.worktree, stdio: ['pipe', 'pipe', 'pipe'] },
    )
    running.add(child)
    let stdout = ''
    let stderr = ''
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
      setTimeout(() => child.kill('SIGKILL'), 10_000).unref()
    }, timeoutMs)
    child.stdout.on('data', (data: Buffer) => (stdout += data.toString()))
    child.stderr.on('data', (data: Buffer) => (stderr += data.toString()))
    child.on('error', (error) => {
      stderr += `\n${error.message}`
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      running.delete(child)
      resolve({ code, output: stdout + (stderr ? `\n[stderr]\n${stderr}` : ''), timedOut })
    })
    child.stdin.on('error', () => {})
    child.stdin.end(prompt)
  })
}

async function reviewBatch(batch: Batch, index: number): Promise<BatchResult> {
  const number = index + 1
  const diff = truncateDiff(batch.files.map((file) => chunks.get(file) ?? '').join(''), maxChars)
  const prompt = buildReviewPrompt({
    rules,
    range,
    batch: number,
    total: batches.length,
    files: batch.files,
    diff,
  })
  const { code, output, timedOut } = await runClaude(prompt)
  let result: BatchResult
  if (timedOut) {
    result = { ...batch, batch: number, outcome: 'errored', output: `Tiempo agotado.\n${output}` }
  } else if (code !== 0) {
    result = {
      ...batch,
      batch: number,
      outcome: 'errored',
      output: `claude salió con ${code}.\n${output}`,
    }
  } else {
    const status = parseReviewStatus(output)
    result = {
      ...batch,
      batch: number,
      outcome: status ?? 'errored',
      output: status ? output : `Respuesta sin línea STATUS:\n${output}`,
    }
  }
  console.log(`Tanda ${number}/${batches.length}: ${result.outcome}`)
  return result
}

let rules = ''
let results: BatchResult[] = []
try {
  mkdirSync(path.dirname(paths.worktree), { recursive: true })
  removeWorktree()
  git(['worktree', 'add', '--detach', paths.worktree, sha], repoRoot)
  rules = git(['show', `${sha}:AGENTS.md`])
  console.log(`Revisando ${batches.length} tandas con ${model}, ${jobs} a la vez…`)
  results = await mapWithConcurrency(batches, jobs, reviewBatch)
} finally {
  removeWorktree()
}

writeFileSync(paths.report, renderReport({ range, model, results }))
const { passed, failed, errored } = summarize(results)
console.log(`\nInforme: ${paths.report}`)
console.log(`Tandas: ${passed} aprobadas, ${failed} con fallos, ${errored} con error.`)
process.exit(failed + errored > 0 ? 1 : 0)
