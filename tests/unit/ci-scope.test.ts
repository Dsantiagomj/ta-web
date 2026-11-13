import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

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
    [['scripts/hooks/gga-review.sh', 'tests/unit/gga-review-hook.test.ts']],
    [['scripts/review-release.ts', 'scripts/review-release-plan.ts']],
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

  it('sin archivos (diff vacío o desconocido) lo corre todo', () => {
    expect(ciScope([])).toBe('full')
  })

  it('ignora las líneas vacías', () => {
    expect(ciScope(['', 'AGENTS.md', '  '])).toBe('docs')
  })
})

describe('jobsFor', () => {
  it('documentación: solo lint y formato', () => {
    expect(jobsFor('docs')).toEqual(['install', 'lint'])
  })

  it('fuera del sitio: sin build, E2E, presupuestos ni auditoría', () => {
    expect(jobsFor('offline')).toEqual(['install', 'lint', 'typecheck', 'unit', 'integration'])
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
  function run(stdin: string, extraEnv: Record<string, string> = {}) {
    const output = path.join(mkdtempSync(path.join(tmpdir(), 'ci-scope-')), 'out')
    writeFileSync(output, '')
    const result = spawnSync('node', ['scripts/ci/ci-scope.ts'], {
      input: stdin,
      encoding: 'utf8',
      env: { ...process.env, GITHUB_OUTPUT: output, ...extraEnv },
    })
    return { status: result.status, output: readFileSync(output, 'utf8') }
  }

  it('lee los archivos de la entrada y escribe scope y jobs en GITHUB_OUTPUT', () => {
    const { status, output } = run('AGENTS.md\ndocs/x.md\n')

    expect(status).toBe(0)
    expect(output).toContain('scope=docs\n')
    expect(output).toContain('jobs=["install","lint"]\n')
  })

  it('CI_SCOPE_FULL=1 (push a main) lo corre todo sin mirar la entrada', () => {
    const { status, output } = run('AGENTS.md\n', { CI_SCOPE_FULL: '1' })

    expect(status).toBe(0)
    expect(output).toContain('scope=full\n')
  })
})
