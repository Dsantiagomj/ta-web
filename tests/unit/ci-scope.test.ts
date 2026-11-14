import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { ciScope, jobsFor } from '../../scripts/ci/ci-scope.ts'

describe('ciScope', () => {
  it.each([
    [['AGENTS.md']],
    [['README.md', 'DESIGN.md']],
    [['docs/legacy/plan.md', 'docs/img/captura.png']],
    [['openwiki/index.md', 'openwiki/assets/x.json']],
    [['.claude/skills/x/SKILL.md']],
  ])('solo documentación: %j', (files) => {
    expect(ciScope(files)).toBe('docs')
  })

  it.each([
    [['scripts/import/import-dofus-guides.ts']],
    [['scripts/import/dofus-guides/catalog.ts', 'tests/unit/import-dofus-guide-parse.test.ts']],
    [['scripts/refresh-quests.ts', 'tests/integration/import-achievements.test.ts']],
    [['scripts/dungeon-notes.ts', 'scripts/payload-script.ts']],
    [['scripts/hooks/gga-review.sh', 'tests/unit/gga-review-hook.test.ts']],
    [['scripts/review-release.ts', 'scripts/review-release-plan.ts']],
    [['scripts/redirects/build-stub-redirects.ts', 'scripts/redirects/stub-map.ts']],
    [['scripts/backfill-guides.ts', 'scripts/media-sizes.ts', 'scripts/build-icons.ts']],
    [['tests/fixtures/dofusdb/quest.json']],
    [['lefthook.yml', '.gga', 'vitest.config.mts', 'eslint.config.mjs']],
    [['scripts/import/x.ts', 'AGENTS.md']],
  ])('no toca el sitio compilado: %j', (files) => {
    expect(ciScope(files)).toBe('offline')
  })

  it.each([
    [['src/app/(frontend)/page.tsx']],
    [['src/collections/DofusGuides.ts', 'AGENTS.md']],
    [['scripts/import/x.ts', 'src/lib/guides/backfill-fights.ts']],
    [['package.json']],
    [['pnpm-lock.yaml']],
    [['.github/workflows/ci.yml']],
    [['.github/actions/setup/action.yml']],
    [['tests/e2e/guia.spec.ts']],
    [['tests/e2e/seed/guides.ts']],
    [['tests/e2e-dev-gate/x.spec.ts']],
    [['scripts/seed-e2e.ts']],
    [['scripts/lhci.ts']],
    [['scripts/lhci-env.ts']],
    [['scripts/clear-data-cache.ts']],
    [['scripts/db-e2e-reset.ts']],
    [['scripts/ci/playwright-chromium.sh']],
    [['scripts/ci/ci-scope.ts']],
    [['lighthouserc.cjs']],
    [['playwright.config.ts']],
    [['next.config.ts']],
    [['tsconfig.json']],
    [['public/img/logo.webp']],
    [['src/README.md']],
    [['un-archivo-nuevo.ts']],
  ])('puede cambiar el sitio, las E2E o los presupuestos: %j', (files) => {
    expect(ciScope(files)).toBe('full')
  })

  // El job Cambios usa git diff --no-renames: un archivo movido sale con su origen y su
  // destino, y el origen manda. Con detección de renombres solo saldría el destino.
  it.each([
    [['src/lib/x.ts', 'tests/fixtures/x.ts']],
    [['scripts/seed-e2e.ts', 'scripts/import/seed-e2e.ts']],
    [['src/README.md', 'docs/README.md']],
  ])('un archivo movido cuenta por su origen y su destino: %j', (files) => {
    expect(ciScope(files)).toBe('full')
  })

  it('sin archivos (diff vacío o desconocido) lo corre todo', () => {
    expect(ciScope([])).toBe('full')
  })

  it('ignora las líneas vacías', () => {
    expect(ciScope(['', 'AGENTS.md', '  '])).toBe('docs')
  })
})

describe('jobsFor', () => {
  // La auditoría corre siempre: un aviso crítico nuevo bloquea todos los PR, también los
  // de documentación, y solo tarda unos 16 s.
  it('documentación: lint, formato y auditoría', () => {
    expect(jobsFor('docs')).toEqual(['install', 'lint', 'audit'])
  })

  it('fuera del sitio: sin build, E2E ni presupuestos', () => {
    expect(jobsFor('offline')).toEqual([
      'install',
      'lint',
      'typecheck',
      'unit',
      'integration',
      'audit',
    ])
  })

  it('todo lo demás: todos los jobs', () => {
    expect(jobsFor('full')).toEqual([
      'install',
      'lint',
      'typecheck',
      'unit',
      'integration',
      'build',
      'e2e',
      'lighthouse',
      'audit',
    ])
  })
})

describe('scripts/ci/ci-scope.ts (CLI)', () => {
  const dirs: string[] = []
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
  })

  function run(stdin: string, extraEnv: Record<string, string | undefined> = {}) {
    const dir = mkdtempSync(path.join(tmpdir(), 'ci-scope-'))
    dirs.push(dir)
    const output = path.join(dir, 'out')
    writeFileSync(output, '')
    const result = spawnSync('node', ['scripts/ci/ci-scope.ts'], {
      input: stdin,
      encoding: 'utf8',
      env: { ...process.env, GITHUB_OUTPUT: output, ...extraEnv },
    })
    return {
      status: result.status,
      output: readFileSync(output, 'utf8'),
      stderr: result.stderr,
    }
  }

  it('lee los archivos de la entrada y escribe scope y jobs en GITHUB_OUTPUT', () => {
    const { status, output } = run('AGENTS.md\ndocs/x.md\n')

    expect(status).toBe(0)
    expect(output).toContain('scope=docs\n')
    expect(output).toContain('jobs=["install","lint","audit"]\n')
  })

  it('en GitHub Actions sin GITHUB_OUTPUT falla en vez de no escribir nada', () => {
    const { status, stderr } = run('AGENTS.md\n', { GITHUB_ACTIONS: 'true', GITHUB_OUTPUT: '' })

    expect(status).not.toBe(0)
    expect(stderr).toMatch(/GITHUB_OUTPUT/)
  })

  it('CI_SCOPE_FULL=1 (push a main) lo corre todo sin mirar la entrada', () => {
    const { status, output } = run('AGENTS.md\n', { CI_SCOPE_FULL: '1' })

    expect(status).toBe(0)
    expect(output).toContain('scope=full\n')
  })
})
