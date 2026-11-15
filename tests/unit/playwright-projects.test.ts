import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import config from '../../playwright.config'

// Payload bloquea el documento que una cuenta tiene abierto. Dos archivos de pruebas que
// abren el mismo documento del panel con cuentas distintas, a la vez en dos workers, se
// encuentran «Documento bloqueado» y fallan por tiempo (panel.spec.ts y panel-papeles.spec.ts
// abren la misma checklist y la misma guía). Los que abren documentos del panel van en un
// proyecto que corre uno detrás de otro.

const e2e = 'tests/e2e'
const opensPanelDocuments = readdirSync(e2e)
  .filter((file) => file.endsWith('.spec.ts'))
  .filter((file) => readFileSync(join(e2e, file), 'utf8').includes('/admin/collections/'))

const projectsOf = (file: string) =>
  (config.projects ?? []).filter((project) => {
    const matches = (pattern: unknown) =>
      [pattern ?? []].flat().some((p) => (p instanceof RegExp ? p.test(file) : p === file))
    return (
      (project.testMatch === undefined || matches(project.testMatch)) &&
      !matches(project.testIgnore)
    )
  })

describe('proyectos de Playwright', () => {
  it('hay archivos que abren documentos del panel', () => {
    expect(opensPanelDocuments).toContain('panel.spec.ts')
    expect(opensPanelDocuments).toContain('panel-papeles.spec.ts')
  })

  it.each(opensPanelDocuments)('%s corre en un solo proyecto, de uno en uno', (file) => {
    const projects = projectsOf(file)
    expect(projects.map((project) => project.name)).toHaveLength(1)
    expect(projects[0]!.workers).toBe(1)
  })

  it('el resto sigue en paralelo', () => {
    expect(projectsOf('movimiento.spec.ts').map((project) => project.workers)).toEqual([undefined])
  })
})
