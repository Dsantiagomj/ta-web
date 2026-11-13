import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { readAchievementPages } from '../../scripts/import/achievements/read-pages'

// Lee la página de Squarespace de cada página de logro y suelta lo que retiene happy-dom tras
// cada una, para que 223 páginas no acumulen unos 8 MB cada una.

const fixture = (slug: string) =>
  readFileSync(path.join(__dirname, '../fixtures/squarespace/logros', `${slug}.html`), 'utf8')

describe('readAchievementPages', () => {
  it('lee cada página, se salta las que no están y suelta el DOM después de cada una', async () => {
    const events: string[] = []
    const pages = await readAchievementPages(
      ['verde-esmeralda', 'no-existe', 'el-cazador-que-lo-cace'],
      async (slug) => {
        events.push(`lee ${slug}`)
        return slug === 'no-existe' ? null : fixture(slug)
      },
      async () => {
        events.push('suelta')
      },
    )
    expect([...pages.keys()]).toEqual(['verde-esmeralda', 'el-cazador-que-lo-cace'])
    expect(pages.get('verde-esmeralda')?.outro).toHaveLength(3)
    expect(events).toEqual([
      'lee verde-esmeralda',
      'suelta',
      'lee no-existe',
      'lee el-cazador-que-lo-cace',
      'suelta',
    ])
  })
})
