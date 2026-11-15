import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

import { dofusIndexStrings } from '@/lib/dofus-guides/strings'
import { dofusIndexIslandStrings } from '@/components/dofus/index-island-strings'

// /guias-dofus sale cerca de su presupuesto de 150 KB de JavaScript (DESIGN.md, Performance
// budgets). La isla del índice solo necesita filtrar tarjetas, inclinarlas y unas pocas
// frases: lo que importa, también de forma indirecta, viaja con ella. Importaba los textos de
// todas las guías de Dofus (los del panel incluidos), los de logros y metalogros y la
// configuración de tamaños de imagen de Payload.

const ROOT = process.cwd()

/** Los módulos que el navegador recibe con un archivo: sus import y export … from no de tipo. */
function runtimeImports(file: string): string[] {
  const source = readFileSync(file, 'utf8')
  const specifiers = [
    ...source.matchAll(/^(?:import|export)\s+(?!type\b)[^'"]*?from\s+'([^']+)'/gm),
    ...source.matchAll(/^import\s+'([^']+)'/gm),
  ].map((match) => match[1]!)
  return specifiers.flatMap((specifier) => {
    const base = specifier.startsWith('@/')
      ? join(ROOT, 'src', specifier.slice(2))
      : specifier.startsWith('.')
        ? join(dirname(file), specifier)
        : null
    if (!base) return []
    const found = ['.ts', '.tsx', '/index.ts'].map((ext) => base + ext).find(existsSync)
    return found ? [found] : []
  })
}

function closure(entry: string): string[] {
  const seen = new Set<string>()
  const visit = (file: string) => {
    if (seen.has(file)) return
    seen.add(file)
    runtimeImports(file).forEach(visit)
  }
  visit(join(ROOT, entry))
  return [...seen].map((file) => relative(ROOT, file)).sort()
}

describe('la isla del índice de las guías de Dofus', () => {
  it('solo arrastra el filtro, la inclinación, la transición y sus textos', () => {
    expect(closure('src/components/dofus/DofusIndexIsland.tsx')).toEqual([
      'src/components/dofus/DofusIndexIsland.tsx',
      'src/components/dofus/index-island-strings.ts',
      'src/components/ui/tilt.ts',
      'src/components/ui/view-transition.ts',
      'src/lib/dofus-guides/index-search.ts',
    ])
  })

  it('sus textos son los del índice: una sola fuente', () => {
    expect(dofusIndexStrings).toMatchObject(dofusIndexIslandStrings)
  })
})
