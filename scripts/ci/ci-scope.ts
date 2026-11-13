// Qué jobs de CI (.github/workflows/ci.yml) corre un cambio, según los archivos que toca.
// El job `changes` pasa por la entrada estándar los archivos del diff del PR, uno por
// línea, y este script escribe `scope` y `jobs` (JSON) en GITHUB_OUTPUT. Con
// CI_SCOPE_FULL=1 (push a main) lo corre todo sin mirar la entrada.
//
// Tres niveles; gana el más alto de los archivos tocados:
// - docs: documentación. Lint y formato (Prettier también revisa el Markdown).
// - offline: lo que no entra en el build ni en los servidores de las E2E y de Lighthouse
//   (importadores, hooks, pruebas unitarias y de integración). Sin build, E2E ni presupuestos.
// - full: todo lo demás, incluido lo que no se reconoce. Ante la duda, todo.
// La auditoría corre en los tres: un aviso crítico nuevo bloquea todos los PR.
//
// El diff va con --no-renames: un archivo movido debe salir con su origen y su destino.
import { appendFileSync, readFileSync } from 'node:fs'

export type CiScope = 'docs' | 'offline' | 'full'

const DOCS: RegExp[] = [
  /^docs\//,
  /^openwiki\//,
  // Markdown de cualquier sitio salvo de lo que compila Next (src/ y public/).
  /^(?!src\/|public\/).*\.md$/,
]

// Nada de aquí lo importa src/, ni scripts/seed-e2e.ts, ni scripts/lhci.ts, ni los
// servidores de tests/e2e/app-server.ts. Un script nuevo de scripts/ cae en full hasta
// que se añada aquí.
const OFFLINE: RegExp[] = [
  /^scripts\/import\//,
  /^scripts\/hooks\//,
  /^scripts\/(review-release|review-release-plan|backfill-guides|refresh-quests|media-sizes)\.ts$/,
  /^scripts\/build-[\w-]+\.ts$/,
  /^tests\/(unit|integration|fixtures)\//,
  /^vitest(\.integration)?\.config\.mts$/,
  /^(eslint\.config\.mjs|lefthook\.yml|\.gga|\.prettierrc\.json|\.prettierignore)$/,
  /^(\.mcp\.json|skills-lock\.json|\.env\.example)$/,
  /^\.claude\//,
  /^\.railway\//,
]

const RANK: Record<CiScope, number> = { docs: 0, offline: 1, full: 2 }

function fileScope(file: string): CiScope {
  if (DOCS.some((pattern) => pattern.test(file))) return 'docs'
  if (OFFLINE.some((pattern) => pattern.test(file))) return 'offline'
  return 'full'
}

export function ciScope(files: string[]): CiScope {
  const paths = files.map((file) => file.trim()).filter(Boolean)
  // Sin diff (o sin poder calcularlo) no se sabe qué cambia: todo.
  if (paths.length === 0) return 'full'
  return paths.map(fileScope).reduce((a, b) => (RANK[b] > RANK[a] ? b : a))
}

const JOBS: Record<CiScope, string[]> = {
  docs: ['install', 'lint', 'audit'],
  offline: ['install', 'lint', 'typecheck', 'unit', 'integration', 'audit'],
  full: [
    'install',
    'lint',
    'typecheck',
    'unit',
    'integration',
    'build',
    'e2e',
    'lighthouse',
    'audit',
  ],
}

export function jobsFor(scope: CiScope): string[] {
  return JOBS[scope]
}

if (import.meta.main) {
  const scope =
    process.env.CI_SCOPE_FULL === '1' ? 'full' : ciScope(readFileSync(0, 'utf8').split('\n'))
  const output = `scope=${scope}\njobs=${JSON.stringify(jobsFor(scope))}\n`
  process.stdout.write(output)
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, output)
  } else if (process.env.GITHUB_ACTIONS === 'true') {
    // Sin salidas, los jobs leerían un `jobs` vacío: mejor fallar aquí.
    console.error('ci-scope: falta GITHUB_OUTPUT; no se puede pasar el alcance a los jobs.')
    process.exit(1)
  }
}
