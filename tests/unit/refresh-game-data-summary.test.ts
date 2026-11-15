import { describe, expect, it } from 'vitest'

import {
  GAME_DATA_COLLECTIONS,
  rowFailures,
  summaryLines,
  type GameDataSummary,
} from '@/lib/dofusdb/refresh-game-data'

// El resumen del refresco de los datos del juego: una línea por colección, con lo creado,
// actualizado, sin cambios y fallido, que imprime el script y guarda el panel.

function summary(failedItems = 0): GameDataSummary {
  const zero = { created: 0, updated: 0, unchanged: 0, failed: 0 }
  const collections = Object.fromEntries(
    GAME_DATA_COLLECTIONS.map((collection) => [collection, { ...zero }]),
  ) as GameDataSummary['collections']
  collections.quests = { created: 2, updated: 5, unchanged: 1990, failed: 0 }
  collections.items = { created: 0, updated: 3, unchanged: 21_500, failed: failedItems }
  return {
    collections,
    images: { imported: 4, reused: 1, failed: 2 },
    newPages: { groups: 1, pages: 3 },
    missing: { prerequisites: 0, items: 1, monsters: 0, bosses: 2, quests: 0 },
  }
}

describe('summaryLines', () => {
  it('da una línea por colección, en el orden del refresco', () => {
    const lines = summaryLines(summary())

    expect(lines[0]).toBe('Misiones: 2 creadas, 5 actualizadas, 1990 sin cambios, 0 fallidas.')
    expect(lines[1]).toBe('Objetos: 0 creados, 3 actualizados, 21500 sin cambios, 0 fallidos.')
    expect(lines.filter((line) => /sin cambios/.test(line))).toHaveLength(
      GAME_DATA_COLLECTIONS.length,
    )
  })

  it('añade las imágenes y lo nuevo en el panel', () => {
    const text = summaryLines(summary()).join('\n')

    expect(text).toMatch('Imágenes: 4 importadas, 1 recuperadas de Media y 2 sin imagen.')
    expect(text).toMatch('Nuevos en el panel, en preparación: 1 metalogros y 3 páginas de logro.')
  })
})

describe('rowFailures', () => {
  it('suma las filas fallidas de todas las colecciones', () => {
    expect(rowFailures(summary())).toBe(0)
    expect(rowFailures(summary(4))).toBe(4)
  })

  it('una imagen que DofusDB no sirve no cuenta como fallo', () => {
    expect(summary().images.failed).toBeGreaterThan(0)
    expect(rowFailures(summary())).toBe(0)
  })
})
