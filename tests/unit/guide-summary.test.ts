import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { mapItem, mapMonster } from '@/lib/dofusdb/map-items-monsters'
import { indexLookups, mapQuest } from '@/lib/dofusdb/map-quest'
import type { QuantityByDofusId, RawQuest } from '@/lib/dofusdb/types'
import {
  formatThousands,
  needsText,
  prerequisitesText,
  requiredLevel,
  rewardsText,
} from '@/lib/guides/format'
import { guideStrings } from '@/lib/guides/strings'
import { inheritedHint, summaryFromQuest, type LinkedQuest } from '@/lib/guides/summary'

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
    return { item: found ? mapItem(found) : id, quantity }
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

describe('needsText', () => {
  it('quita los objetos de misión, que da el propio juego: El cazador cazado (1977) no pide nada', () => {
    // Solo pide entregar la Bolsa de Kerubim, un objeto de misión
    expect(linkedQuest(1977).needs?.items).toHaveLength(1)
    expect(needsText(linkedQuest(1977).needs)).toBeNull()
  })

  it('Intoxicación profunda (1433): el ron marino se consigue en la misión', () => {
    expect(needsText(linkedQuest(1433).needs)).toBeNull()
  })

  it('lista los objetos, los monstruos y si hay que caminar mapas', () => {
    expect(needsText(linkedQuest(2420).needs)).toBe(
      [
        '1 x Dofus Esmeralda.',
        '1 x Dofus Púrpura.',
        '1 x Dofus Turquesa.',
        '1 x Dofus Ocre.',
        '1 x Dofus Marfil.',
        '1 x Dofus Ébano.',
        'Caminar mapas.',
      ].join('\n'),
    )
    expect(
      needsText({
        items: [],
        monsters: [{ monster: { name: 'Tufo de las llanuras' }, quantity: 3 }],
        walksMaps: false,
      }),
    ).toBe('3 x Tufo de las llanuras.')
  })
})

describe('summaryFromQuest', () => {
  it('saca de DofusDB todo el resumen de El cazador cazado (1977)', () => {
    expect(summaryFromQuest(linkedQuest(1977))).toEqual({
      prerequisites: 'Seis pies bajo tierra.',
      needs: null,
      rewards: '24 316 XP.\n552 kamas.\n2 x Cuero de miserata strubiense.\n2 x Colmillos de ratas.',
      startNpc: 'Kerubim Crepin',
      startX: 3,
      startY: -17,
    })
  })

  it('sin misión, todo vacío', () => {
    expect(summaryFromQuest(null)).toEqual({
      prerequisites: null,
      needs: null,
      rewards: null,
      startNpc: null,
      startX: null,
      startY: null,
    })
  })
})

describe('inheritedHint', () => {
  it('muestra en el panel lo que DofusDB da para el campo', () => {
    const ready = { status: 'ready', quest: linkedQuest(1977) } as const
    expect(inheritedHint(ready, 'prerequisites')).toBe('De DofusDB: Seis pies bajo tierra.')
    expect(inheritedHint(ready, 'rewards')).toBe(
      'De DofusDB: 24 316 XP.\n552 kamas.\n2 x Cuero de miserata strubiense.\n2 x Colmillos de ratas.',
    )
    expect(inheritedHint(ready, 'startY')).toBe('De DofusDB: -17')
  })

  it('avisa cuando DofusDB no da nada, no hay misión, carga o falla', () => {
    const ready = { status: 'ready', quest: linkedQuest(1977) } as const
    expect(inheritedHint(ready, 'needs')).toBe(guideStrings.admin.inheritedEmpty)
    expect(inheritedHint({ status: 'none' }, 'needs')).toBe(guideStrings.admin.noQuest)
    expect(inheritedHint({ status: 'loading' }, 'needs')).toBe(guideStrings.admin.inheritedLoading)
    expect(inheritedHint({ status: 'error' }, 'needs')).toBe(
      guideStrings.admin.inheritedUnavailable,
    )
  })
})
