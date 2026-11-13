import { spawnSync } from 'node:child_process'
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const script = path.resolve('scripts/hooks/gga-review.sh')

// Un gga falso en el PATH que dice con qué modelo lo llamarían.
function runHook(env: Record<string, string>) {
  const bin = mkdtempSync(path.join(tmpdir(), 'gga-falso-'))
  const gga = path.join(bin, 'gga')
  writeFileSync(gga, '#!/bin/sh\necho "modelo=${ANTHROPIC_MODEL:-ninguno} args=$*"\n')
  chmodSync(gga, 0o755)
  const base = { ...process.env }
  delete base.GGA_CLAUDE_MODEL
  delete base.ANTHROPIC_MODEL
  const result = spawnSync('sh', [script], {
    encoding: 'utf8',
    env: { ...base, PATH: `${bin}:${process.env.PATH}`, ...env },
  })
  return { status: result.status, output: result.stdout + result.stderr }
}

describe('gga-review.sh', () => {
  it('revisa el commit con Sonnet aunque el modelo de Claude Code sea otro', () => {
    expect(runHook({})).toEqual({ status: 0, output: 'modelo=claude-sonnet-5-5 args=run\n' })
  })

  it('GGA_CLAUDE_MODEL cambia el modelo de la revisión', () => {
    expect(runHook({ GGA_CLAUDE_MODEL: 'haiku' }).output).toBe('modelo=haiku args=run\n')
  })

  it('un ANTHROPIC_MODEL del shell no cambia el de la revisión', () => {
    expect(runHook({ ANTHROPIC_MODEL: 'fable' }).output).toBe('modelo=claude-sonnet-5-5 args=run\n')
  })
})
