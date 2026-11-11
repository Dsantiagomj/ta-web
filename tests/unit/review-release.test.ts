import { describe, expect, it } from 'vitest'

import {
  buildReviewPrompt,
  matchesGgaPattern,
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
} from '../../scripts/review-release-plan.ts'

// `pnpm review:release`: la revisión con Fable de todo lo que entra en una release, por
// tandas que caben en un prompt. Aquí, la parte sin git ni claude.

describe('parseGgaPatterns', () => {
  it('lee FILE_PATTERNS y EXCLUDE_PATTERNS de .gga, sin espacios ni entradas vacías', () => {
    const gga = [
      '# comentario con FILE_PATTERNS="*.no"',
      'PROVIDER="claude"',
      'FILE_PATTERNS="*.ts, *.md,"',
      "EXCLUDE_PATTERNS='src/migrations/*,*.d.ts'",
    ].join('\n')
    expect(parseGgaPatterns(gga)).toEqual({
      include: ['*.ts', '*.md'],
      exclude: ['src/migrations/*', '*.d.ts'],
    })
  })

  it('sin FILE_PATTERNS revisa todo, como gga', () => {
    expect(parseGgaPatterns('PROVIDER="claude"')).toEqual({ include: ['*'], exclude: [] })
  })
})

describe('matchesGgaPattern', () => {
  it('un patrón que empieza por * compara el final de la ruta', () => {
    expect(matchesGgaPattern('src/app/page.tsx', '*.tsx')).toBe(true)
    expect(matchesGgaPattern('src/types/x.d.ts', '*.d.ts')).toBe(true)
    expect(matchesGgaPattern('src/app/page.tsx', '*.ts')).toBe(false)
  })

  it('los demás comparan la ruta entera o el nombre del archivo', () => {
    expect(matchesGgaPattern('pnpm-lock.yaml', 'pnpm-lock.yaml')).toBe(true)
    expect(matchesGgaPattern('src/payload-types.ts', 'payload-types.ts')).toBe(true)
    expect(matchesGgaPattern('src/migrations/2026_01_01.ts', 'src/migrations/*')).toBe(true)
    expect(matchesGgaPattern('src/migrations/sub/a.json', 'src/migrations/*')).toBe(true)
    expect(matchesGgaPattern('otra/src/migrations/a.ts', 'src/migrations/*')).toBe(false)
    expect(matchesGgaPattern('.claude/skills/x/SKILL.md', '.claude/skills/*')).toBe(true)
    expect(matchesGgaPattern('srcXmigrations/a.ts', 'src.migrations/*')).toBe(false)
  })
})

describe('selectReviewFiles', () => {
  it('se queda con lo que entra en FILE_PATTERNS y no en EXCLUDE_PATTERNS', () => {
    const patterns = {
      include: ['*.ts', '*.md', '*.css'],
      exclude: ['src/migrations/*', '*.d.ts', 'payload-types.ts'],
    }
    const files = [
      'src/lib/a.ts',
      'src/migrations/2026.ts',
      'next-env.d.ts',
      'src/payload-types.ts',
      'public/logo.png',
      'AGENTS.md',
      'src/app/globals.css',
    ]
    expect(selectReviewFiles(files, patterns)).toEqual([
      'src/lib/a.ts',
      'AGENTS.md',
      'src/app/globals.css',
    ])
  })
})

describe('splitDiffByFile', () => {
  it('parte la salida de git diff en un trozo por archivo, con el destino de los renombrados', () => {
    const a =
      'diff --git a/src/a.ts b/src/a.ts\nindex 1..2 100644\n--- a/src/a.ts\n+++ b/src/a.ts\n@@ -1 +1 @@\n-x\n+y\n'
    const b =
      'diff --git a/src/nuevo.ts b/src/nuevo.ts\nnew file mode 100644\n--- /dev/null\n+++ b/src/nuevo.ts\n@@ -0,0 +1 @@\n+z\n'
    const c =
      'diff --git a/viejo.md b/docs/nuevo.md\nsimilarity index 100%\nrename from viejo.md\nrename to docs/nuevo.md\n'
    expect(splitDiffByFile(a + b + c)).toEqual(
      new Map([
        ['src/a.ts', a],
        ['src/nuevo.ts', b],
        ['docs/nuevo.md', c],
      ]),
    )
  })

  it('sin diff no hay trozos', () => {
    expect(splitDiffByFile('')).toEqual(new Map())
  })
})

describe('planBatches', () => {
  it('junta archivos en orden hasta el límite de caracteres de diff por tanda', () => {
    const files = [
      { path: 'a.ts', chars: 40 },
      { path: 'b.ts', chars: 50 },
      { path: 'c.ts', chars: 30 },
      { path: 'd.ts', chars: 100 },
      { path: 'e.ts', chars: 1 },
    ]
    expect(planBatches(files, 100)).toEqual([
      { files: ['a.ts', 'b.ts'], chars: 90, oversized: false },
      { files: ['c.ts'], chars: 30, oversized: false },
      { files: ['d.ts'], chars: 100, oversized: false },
      { files: ['e.ts'], chars: 1, oversized: false },
    ])
  })

  it('un archivo que pasa del límite va solo en su tanda, marcada como recortada', () => {
    const files = [
      { path: 'a.ts', chars: 10 },
      { path: 'enorme.ts', chars: 500 },
      { path: 'b.ts', chars: 10 },
    ]
    expect(planBatches(files, 100)).toEqual([
      { files: ['a.ts'], chars: 10, oversized: false },
      { files: ['enorme.ts'], chars: 500, oversized: true },
      { files: ['b.ts'], chars: 10, oversized: false },
    ])
  })

  it('sin archivos no hay tandas', () => {
    expect(planBatches([], 100)).toEqual([])
  })
})

describe('truncateDiff', () => {
  it('deja el diff que cabe tal cual', () => {
    expect(truncateDiff('abc', 3)).toBe('abc')
  })

  it('recorta el que no cabe y lo dice', () => {
    const cut = truncateDiff('a'.repeat(250), 100)
    expect(cut.startsWith('a'.repeat(100))).toBe(true)
    expect(cut).not.toContain('a'.repeat(101))
    expect(cut).toMatch(/DIFF TRUNCATED: showing 100 of 250 characters/)
  })
})

describe('parseReviewStatus', () => {
  it('lee el veredicto de la primera línea con texto', () => {
    expect(parseReviewStatus('STATUS: PASSED\nNada que señalar.')).toBe('passed')
    expect(parseReviewStatus('\n  STATUS: FAILED  \n- a.ts:3 alta')).toBe('failed')
  })

  it('sin una línea STATUS exacta al principio, la tanda cuenta como error', () => {
    expect(parseReviewStatus('')).toBeNull()
    expect(parseReviewStatus('Revisé el diff.\nSTATUS: PASSED')).toBeNull()
    expect(parseReviewStatus('STATUS: PASSED?')).toBeNull()
    expect(parseReviewStatus('status: passed')).toBeNull()
  })
})

describe('parseReviewArgs', () => {
  it('sin argumentos, desde la última release y de verdad', () => {
    expect(parseReviewArgs([])).toEqual({ since: undefined, dryRun: false })
  })

  it('acepta --since <ref>, --since=<ref> y --dry-run', () => {
    expect(parseReviewArgs(['--since', 'v0.1.0', '--dry-run'])).toEqual({
      since: 'v0.1.0',
      dryRun: true,
    })
    expect(parseReviewArgs(['--since=origin/main~3'])).toEqual({
      since: 'origin/main~3',
      dryRun: false,
    })
  })

  it('ignora el -- que pnpm puede dejar delante', () => {
    expect(parseReviewArgs(['--', '--dry-run'])).toEqual({ since: undefined, dryRun: true })
  })

  it('rechaza lo que no conoce y un --since sin valor', () => {
    expect(() => parseReviewArgs(['--desde', 'v1'])).toThrow(/--desde/)
    expect(() => parseReviewArgs(['--since'])).toThrow(/--since/)
    expect(() => parseReviewArgs(['--since', '--dry-run'])).toThrow(/--since/)
  })
})

describe('releasePaths', () => {
  it('el worktree y el informe van junto al repo, en <repo>-worktrees', () => {
    expect(releasePaths('/código/ta-web', 'v0.1.1', 'abc1234')).toEqual({
      worktree: '/código/ta-web-worktrees/revision-release',
      report: '/código/ta-web-worktrees/revision-release-v0.1.1..abc1234.md',
    })
  })

  it('una ref con barras o virgulillas no crea carpetas en el nombre del informe', () => {
    expect(releasePaths('/r/ta-web', 'origin/main~3', 'abc1234').report).toBe(
      '/r/ta-web-worktrees/revision-release-origin-main-3..abc1234.md',
    )
  })
})

describe('buildReviewPrompt', () => {
  it('da las reglas, el diff de la tanda y el formato de la respuesta', () => {
    const prompt = buildReviewPrompt({
      rules: '# Reglas\nNada de any.',
      range: 'v0.1.1...abc1234',
      batch: 2,
      total: 5,
      files: ['src/a.ts', 'src/b.ts'],
      diff: 'diff --git a/src/a.ts b/src/a.ts\n+const x: any = 1\n',
    })
    expect(prompt).toContain('# Reglas\nNada de any.')
    expect(prompt).toContain('batch 2 of 5')
    expect(prompt).toContain('v0.1.1...abc1234')
    expect(prompt).toContain('- src/a.ts\n- src/b.ts')
    expect(prompt).toContain('+const x: any = 1')
    expect(prompt).toMatch(/first line.*exactly `STATUS: PASSED` or `STATUS: FAILED`/)
    expect(prompt).toMatch(/Read, Grep and Glob/)
  })
})

describe('summarize y renderReport', () => {
  const results = [
    {
      batch: 1,
      files: ['a.ts'],
      chars: 10,
      oversized: false,
      outcome: 'passed' as const,
      output: 'STATUS: PASSED',
    },
    {
      batch: 2,
      files: ['b.ts', 'c.ts'],
      chars: 20,
      oversized: true,
      outcome: 'failed' as const,
      output: 'STATUS: FAILED\n- b.ts:1 alta: rompe el login',
    },
    {
      batch: 3,
      files: ['d.ts'],
      chars: 5,
      oversized: false,
      outcome: 'errored' as const,
      output: 'se agotó el tiempo',
    },
  ]

  it('cuenta las tandas por resultado', () => {
    expect(summarize(results)).toEqual({ passed: 1, failed: 1, errored: 1 })
  })

  it('el informe lleva el rango, el resumen y cada tanda con sus archivos y la respuesta', () => {
    const report = renderReport({ range: 'v0.1.1...abc1234', model: 'fable', results })
    expect(report).toMatch(/^# Revisión de release v0\.1\.1\.\.\.abc1234\n/)
    expect(report).toContain('fable')
    expect(report).toContain('1 aprobadas, 1 con fallos, 1 con error')
    expect(report).toContain('## Tanda 2 de 3: con fallos')
    expect(report).toContain('- `b.ts`\n- `c.ts`')
    expect(report).toContain('recortado')
    expect(report).toContain('- b.ts:1 alta: rompe el login')
    expect(report).toContain('## Tanda 3 de 3: error')
    expect(report).toContain('se agotó el tiempo')
  })
})
