import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const script = path.resolve('scripts/hooks/commit-msg.sh')

function check(message: string) {
  const file = path.join(mkdtempSync(path.join(tmpdir(), 'commit-msg-')), 'COMMIT_EDITMSG')
  writeFileSync(file, message)
  const result = spawnSync('sh', [script, file], { encoding: 'utf8' })
  return { ok: result.status === 0, output: result.stdout + result.stderr }
}

describe('commit-msg', () => {
  it.each([
    'feat(guias): añade la guía de Aprendizaje escudero',
    'fix: corrige el orden de los pasos',
    'docs(diseño): aplica las respuestas a las preguntas abiertas',
    'refactor(progreso)!: cambia la clave de los pasos',
    'chore(deps): sube Payload a 3.91.0\n\nCuerpo del mensaje.',
    'ci: añade el job Pruebas',
  ])('acepta un commit convencional: %s', (message) => {
    expect(check(message).ok).toBe(true)
  })

  it.each([
    'añade la guía',
    'Feat: mayúscula en el tipo',
    'feat(guias):sin espacio',
    'feat: ',
    'wip(guias): tipo desconocido',
  ])('rechaza lo que no es convencional: %s', (message) => {
    const result = check(message)
    expect(result.ok).toBe(false)
    expect(result.output).toMatch(/commits convencionales/)
  })

  it('ignora las líneas de comentario que añade git', () => {
    expect(check('# Escribe el mensaje\nfeat: algo\n# más comentarios').ok).toBe(true)
  })

  it('deja pasar los mensajes que genera git: merge, revert, fixup y squash', () => {
    expect(check("Merge branch 'main' into chore/setup-proyecto").ok).toBe(true)
    expect(check('Revert "feat: algo"').ok).toBe(true)
    expect(check('fixup! feat: algo').ok).toBe(true)
    expect(check('squash! feat: algo').ok).toBe(true)
  })

  it('rechaza las líneas Co-Authored-By', () => {
    const result = check('feat: algo\n\nCo-Authored-By: Alguien <alguien@example.com>')
    expect(result.ok).toBe(false)
    expect(result.output).toMatch(/Co-Authored-By/)
  })
})
