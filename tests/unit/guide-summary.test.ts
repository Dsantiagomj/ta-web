import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { mapItem, mapMonster } from '@/lib/dofusdb/map-items-monsters'
import { indexLookups, mapQuest } from '@/lib/dofusdb/map-quest'
import type { QuantityByDofusId, RawQuest } from '@/lib/dofusdb/types'
import {
  formatThousands,
  itemsText,
  neededItems,
  prerequisitesText,
  requiredLevel,
  rewardsText,
} from '@/lib/guides/format'
import { guideStrings } from '@/lib/guides/strings'
import {
  applySummaryFill,
  summaryFromQuest,
  summaryNote,
  summaryToFill,
  type LinkedQuest,
} from '@/lib/guides/summary'

import { parsePage } from '../../scripts/import/squarespace/parse-page'
import { toQuestGuide } from '../../scripts/import/squarespace/to-quest-guide'
import items from '../fixtures/dofusdb/items.json'
import mapPositions from '../fixtures/dofusdb/map-positions.json'
import monsters from '../fixtures/dofusdb/monsters.json'
import npcs from '../fixtures/dofusdb/npcs.json'
import questsWithSteps from '../fixtures/dofusdb/quests-steps.json'

// Los fixtures no traen el PNJ ni el mapa de inicio de El cazador cazado (1977): estos
// son los de la guía de Torre, Kerubim Crepin en [3,-17].
const lookups = indexLookups(
  [...npcs, { id: 1901, name: { es: 'Kerubim Crepin' } }],
  [...mapPositions, { id: 103548416, posX: 3, posY: -17 }],
)
const rawQuests = questsWithSteps as RawQuest[]

/**
 * La misión tal como la lee el panel: de la colección quests, con objetos, monstruos y
 * prerrequisitos poblados (depth 1). Las misiones que no están en los fixtures quedan como ID.
 */
function linkedQuest(dofusId: number): LinkedQuest {
  const raw = rawQuests.find((candidate) => candidate.id === dofusId)
  if (!raw) throw new Error(`Falta la misión ${dofusId} en los fixtures`)
  const mapped = mapQuest(structuredClone(raw), lookups)
  const item = ({ dofusId: id, quantity }: QuantityByDofusId) => {
    const found = items.find((candidate) => candidate.id === id)
    // Como ID de Payload, el de DofusDB: basta para comparar filas
    return { item: found ? { id, ...mapItem(found) } : id, quantity }
  }
  const monster = ({ dofusId: id, quantity }: QuantityByDofusId) => {
    const found = monsters.find((candidate) => candidate.id === id)
    return { monster: found ? mapMonster(found) : id, quantity }
  }
  return {
    name: mapped.name,
    levelMin: mapped.levelMin,
    startCriterion: mapped.startCriterion,
    prerequisites: mapped.prerequisiteDofusIds.map((id) => {
      const found = rawQuests.find((candidate) => candidate.id === id)
      return found ? { name: found.name.es } : id
    }),
    startPositions: mapped.startPositions,
    rewards: { ...mapped.rewards, items: mapped.rewards.items.map(item) },
    needs: {
      items: mapped.needs.items.map(item),
      monsters: mapped.needs.monsters.map(monster),
      walksMaps: mapped.needs.walksMaps,
    },
  }
}

/** El resumen que la importación sacó de la página de Torre en Squarespace. */
function torreSummary(slug: string) {
  const html = readFileSync(path.join(__dirname, '../fixtures/squarespace', `${slug}.html`), 'utf8')
  return toQuestGuide(parsePage(html), { slug, questDofusIds: [1] }).guide.summary
}

describe('formatThousands', () => {
  it('separa los miles con un espacio normal, como Torre', () => {
    expect(formatThousands(552)).toBe('552')
    expect(formatThousands(24_316)).toBe('24 316')
    expect(formatThousands(3_000_000)).toBe('3 000 000')
  })
})

describe('rewardsText', () => {
  it('El cazador cazado (1977) da las mismas líneas que la guía de Torre', () => {
    expect(rewardsText(linkedQuest(1977).rewards)).toBe(
      '24 316 XP.\n552 kamas.\n2 x Cuero de miserata strubiense.\n2 x Colmillos de ratas.',
    )
    expect(rewardsText(linkedQuest(1977).rewards)).toBe(torreSummary('el-cazador-cazado').rewards)
  })

  it('Seis pies bajo tierra (1976) da las mismas líneas que la guía de Torre', () => {
    expect(rewardsText(linkedQuest(1976).rewards)).toBe(
      '16 380 XP.\n390 kamas.\n1 x Pico de tofu.\n1 x Intestino de araknáusea.\n' +
        '1 x Pelos de arakna enferma.\n1 x Ojo de arakmutada.',
    )
    expect(rewardsText(linkedQuest(1976).rewards)).toBe(
      torreSummary('seis-pies-bajo-tierra').rewards,
    )
  })

  it('omite la experiencia y los kamas a cero y los objetos sin poblar', () => {
    expect(
      rewardsText({
        experience: 0,
        kamas: 0,
        items: [
          { item: 99, quantity: 1 },
          { item: { name: 'Pico de tofu' }, quantity: 3 },
        ],
      }),
    ).toBe('3 x Pico de tofu.')
  })

  it('sin nada que dar, no hay texto', () => {
    expect(rewardsText({ experience: 0, kamas: 0, items: [] })).toBeNull()
    expect(rewardsText(null)).toBeNull()
  })
})

describe('requiredLevel', () => {
  it('lee el nivel mínimo del criterio PL>N de DofusDB', () => {
    expect(requiredLevel('PL>179')).toBe(180)
    expect(requiredLevel('Ps=2&Pa=79&PL>169&Qf=331')).toBe(170)
  })

  it('sin criterio de nivel, no hay nivel mínimo', () => {
    expect(requiredLevel('Qf=1976')).toBeNull()
    expect(requiredLevel(null)).toBeNull()
  })
})

describe('prerequisitesText', () => {
  it('El cazador cazado (1977): la misión anterior, como la escribe Torre', () => {
    expect(prerequisitesText(linkedQuest(1977))).toBe('Seis pies bajo tierra.')
    expect(prerequisitesText(linkedQuest(1977))).toBe(
      torreSummary('el-cazador-cazado').prerequisites,
    )
  })

  it('Intoxicación profunda (1433): el nivel mínimo, como lo escribe Torre', () => {
    expect(prerequisitesText(linkedQuest(1433))).toBe(
      torreSummary('intoxicacion-profunda').prerequisites,
    )
  })

  it('pone el nivel delante de las misiones y salta las que no están pobladas', () => {
    expect(
      prerequisitesText({
        startCriterion: 'PL>189&Qf=2409',
        prerequisites: [{ name: 'Toma de conciencia' }, 2138],
      }),
    ).toBe('Nivel mínimo 190.\nToma de conciencia.')
  })

  it('no añade un punto a un nombre que ya cierra con signo', () => {
    expect(prerequisitesText({ prerequisites: [{ name: '¡M.O. Pardy!' }] })).toBe('¡M.O. Pardy!')
  })

  it('sin nivel ni misiones, no hay texto', () => {
    expect(prerequisitesText({ startCriterion: null, prerequisites: [] })).toBeNull()
  })
})

// Los Dofus Primordiales que pide Entretanto, un renacer (2420), en el orden de DofusDB.
const PRIMORDIAL_DOFUS = [737, 694, 739, 7754, 7115, 7114]
const PRIMORDIAL_DOFUS_TEXT = [
  '1 x Dofus Esmeralda.',
  '1 x Dofus Púrpura.',
  '1 x Dofus Turquesa.',
  '1 x Dofus Ocre.',
  '1 x Dofus Marfil.',
  '1 x Dofus Ébano.',
].join('\n')

describe('neededItems', () => {
  it('quita los objetos de misión, que da el propio juego: El cazador cazado (1977) no pide nada', () => {
    // Solo pide entregar la Bolsa de Kerubim, un objeto de misión
    expect(linkedQuest(1977).needs?.items).toHaveLength(1)
    expect(neededItems(linkedQuest(1977).needs)).toEqual([])
  })

  it('Intoxicación profunda (1433): el ron marino se consigue en la misión', () => {
    expect(neededItems(linkedQuest(1433).needs)).toEqual([])
  })

  it('lista los objetos con su cantidad, en el orden de DofusDB, sin monstruos ni mapas', () => {
    const needed = neededItems(linkedQuest(2420).needs)
    expect(needed.map(({ item, quantity }) => [item.id, quantity])).toEqual(
      PRIMORDIAL_DOFUS.map((id) => [id, 1]),
    )
    expect(needed[0]!.item.name).toBe('Dofus Esmeralda')
  })

  it('salta los objetos sin poblar', () => {
    expect(neededItems({ items: [{ item: 7, quantity: 1 }] })).toEqual([])
  })
})

describe('itemsText', () => {
  it('una línea por objeto, como Torre', () => {
    expect(itemsText(neededItems(linkedQuest(2420).needs))).toBe(PRIMORDIAL_DOFUS_TEXT)
    expect(itemsText([])).toBeNull()
  })
})

describe('summaryFromQuest', () => {
  it('saca de DofusDB todo el resumen de El cazador cazado (1977)', () => {
    expect(summaryFromQuest(linkedQuest(1977))).toEqual({
      prerequisites: 'Seis pies bajo tierra.',
      needs: [],
      rewards: '24 316 XP.\n552 kamas.\n2 x Cuero de miserata strubiense.\n2 x Colmillos de ratas.',
      startNpc: 'Kerubim Crepin',
      startX: 3,
      startY: -17,
    })
  })

  it('sin misión, todo vacío', () => {
    expect(summaryFromQuest(null)).toEqual({
      prerequisites: null,
      needs: [],
      rewards: null,
      startNpc: null,
      startX: null,
      startY: null,
    })
  })
})

describe('summaryToFill', () => {
  it('rellena con DofusDB los campos vacíos de El cazador cazado (1977)', () => {
    expect(summaryToFill({}, linkedQuest(1977))).toEqual({
      prerequisites: 'Seis pies bajo tierra.',
      rewards: '24 316 XP.\n552 kamas.\n2 x Cuero de miserata strubiense.\n2 x Colmillos de ratas.',
      startNpc: 'Kerubim Crepin',
      startX: 3,
      startY: -17,
    })
  })

  it('nunca toca un campo escrito; el 0 es una coordenada, y solo espacios cuenta como vacío', () => {
    expect(
      summaryToFill(
        {
          prerequisites: '  ',
          rewards: 'Lo que diga Torre.',
          startNpc: null,
          startX: 0,
          startY: -17,
        },
        linkedQuest(1977),
      ),
    ).toEqual({ prerequisites: 'Seis pies bajo tierra.', startNpc: 'Kerubim Crepin' })
  })

  it('rellena la lista vacía de Necesitarás con los objetos de DofusDB y sus cantidades', () => {
    expect(summaryToFill({ needs: { items: [] } }, linkedQuest(2420)).needs).toEqual({
      items: PRIMORDIAL_DOFUS.map((item) => ({ item, quantity: 1 })),
    })
  })

  it('nunca toca una lista de Necesitarás con objetos', () => {
    const fill = summaryToFill({ needs: { items: [{ item: 1, quantity: 2 }] } }, linkedQuest(2420))
    expect(fill).not.toHaveProperty('needs')
  })

  it('lo que DofusDB no da se queda vacío, y sin misión no rellena nada', () => {
    expect(summaryToFill({}, { name: 'Sin datos' })).toEqual({})
    expect(summaryToFill({}, null)).toEqual({})
  })
})

describe('applySummaryFill', () => {
  it('añade lo rellenado y conserva las notas de Necesitarás', () => {
    const summary = { rewards: 'De Torre.', needs: { notes: '1 x Combate (solo).', items: [] } }
    expect(
      applySummaryFill(summary, {
        startNpc: 'Draconiros',
        needs: { items: [{ item: 737, quantity: 1 }] },
      }),
    ).toEqual({
      rewards: 'De Torre.',
      startNpc: 'Draconiros',
      needs: { notes: '1 x Combate (solo).', items: [{ item: 737, quantity: 1 }] },
    })
  })
})

describe('summaryNote', () => {
  const ready = { status: 'ready', quest: linkedQuest(1977) } as const
  const { admin } = guideStrings

  it('si el campo tiene lo que da DofusDB, avisa de dónde viene y de que se puede cambiar', () => {
    expect(summaryNote(ready, 'prerequisites', 'Seis pies bajo tierra.')).toBe(admin.fromDofusDb)
    expect(summaryNote(ready, 'startY', -17)).toBe(admin.fromDofusDb)
    expect(admin.fromDofusDb).toBe('Viene de DofusDB. Puedes cambiarlo.')
  })

  it('si Torre lo cambió, muestra también lo que da DofusDB', () => {
    expect(summaryNote(ready, 'rewards', 'Lo que diga Torre.')).toBe(
      'Cambiado. DofusDB da: 24 316 XP.\n552 kamas.\n2 x Cuero de miserata strubiense.\n' +
        '2 x Colmillos de ratas.',
    )
    expect(summaryNote(ready, 'startX', 0)).toBe('Cambiado. DofusDB da: 3')
  })

  it('vacío, avisa de que se rellena al guardar', () => {
    expect(summaryNote(ready, 'startNpc', '')).toBe(
      'Vacío: al guardar se rellena con lo que da DofusDB: Kerubim Crepin',
    )
  })

  it('cuando DofusDB no da nada, pide escribirlo', () => {
    const empty = { status: 'ready', quest: { name: 'Sin datos' } } as const
    expect(summaryNote(empty, 'startNpc', null)).toBe('DofusDB no da nada aquí; escríbelo tú.')
    expect(summaryNote(empty, 'startNpc', 'Oto Mustam')).toBe(admin.dofusDbEmptyChanged)
  })

  it('avisa cuando no hay misión, carga o falla', () => {
    expect(summaryNote({ status: 'none' }, 'startNpc', null)).toBe(admin.noQuest)
    expect(summaryNote({ status: 'loading' }, 'startNpc', null)).toBe(admin.dofusDbLoading)
    expect(summaryNote({ status: 'error' }, 'startNpc', null)).toBe(admin.dofusDbUnavailable)
  })
})

describe('summaryNote para la lista de Necesitarás', () => {
  const ready = { status: 'ready', quest: linkedQuest(2420) } as const
  const rows = PRIMORDIAL_DOFUS.map((item) => ({ item, quantity: 1 }))
  const { admin } = guideStrings

  it('la misma lista que DofusDB, en cualquier orden y con objetos poblados, viene de DofusDB', () => {
    const shuffled = [...rows]
      .reverse()
      .map((row, index) => (index === 0 ? { ...row, item: { id: row.item } } : row))
    expect(summaryNote(ready, 'needs', shuffled)).toBe(admin.fromDofusDb)
  })

  it('con otra cantidad u otro objeto, está cambiada y muestra lo que da DofusDB', () => {
    expect(summaryNote(ready, 'needs', [{ ...rows[0]!, quantity: 2 }, ...rows.slice(1)])).toBe(
      admin.changed(PRIMORDIAL_DOFUS_TEXT),
    )
  })

  it('vacía, avisa de que se rellena al guardar', () => {
    expect(summaryNote(ready, 'needs', [])).toBe(admin.emptyWillFill(PRIMORDIAL_DOFUS_TEXT))
  })

  it('cuando DofusDB no pide objetos, pide escribirlos', () => {
    const hunter = { status: 'ready', quest: linkedQuest(1977) } as const
    expect(summaryNote(hunter, 'needs', [])).toBe(admin.dofusDbEmpty)
    expect(summaryNote(hunter, 'needs', [{ item: 1, quantity: 1 }])).toBe(admin.dofusDbEmptyChanged)
  })
})
