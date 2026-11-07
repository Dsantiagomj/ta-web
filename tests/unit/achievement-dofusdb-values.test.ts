import { describe, expect, it } from 'vitest'

import {
  type AchievementValues,
  dofusDbNote,
  fillFromValues,
  type GroupValues,
  groupSection,
} from '@/lib/achievements/dofusdb-values'
import { achievementStrings } from '@/lib/achievements/strings'
import { guideStrings } from '@/lib/guides/strings'

const { admin } = guideStrings
const own = achievementStrings.admin

const ocasion: AchievementValues = {
  name: 'La ocasión hace al ladrón',
  group: { id: 7, name: 'Astrub' },
  order: 9,
  points: 10,
  experience: 102_128,
  kamas: 1_105,
  items: [{ item: { id: 31, name: 'Piel pachucha' }, quantity: 1 }],
  quests: [
    { name: 'Esto hace aguas', quests: [{ id: 1, name: 'Esto hace aguas' }] },
    {
      name: 'Misión de clase',
      quests: [
        { id: 2, name: 'Yopuka' },
        { id: 3, name: 'Ocra' },
      ],
    },
  ],
}

const astrub: GroupValues = {
  name: 'Astrub',
  order: 13,
  section: 'zones',
  representative: { relationTo: 'npcs', id: 40, name: 'Hupe Esse' },
}

describe('groupSection', () => {
  it('Eventos son eventos de temporada', () => {
    expect(groupSection({ order: 0, parentDofusId: 9 })).toBe('seasonal')
  })

  it('una categoría que cuelga de un evento también es de temporada, a cualquier profundidad', () => {
    expect(groupSection({ order: 0, parentDofusId: 60, rootDofusId: 9 })).toBe('seasonal')
  })

  it('una que cuelga de una zona es una zona', () => {
    expect(groupSection({ order: 1, parentDofusId: 45, rootDofusId: 8 })).toBe('zones')
  })

  it('en Misiones, las primeras del juego son historias y el resto, zonas', () => {
    expect(groupSection({ order: 2, parentDofusId: 8 })).toBe('stories') // Misiones de mundo
    expect(groupSection({ order: 10, parentDofusId: 8 })).toBe('stories') // Dimensiones divinas
    expect(groupSection({ order: 11, parentDofusId: 8 })).toBe('zones') // Archipiélago de las escamas
    expect(groupSection({ order: 13, parentDofusId: 8 })).toBe('zones') // Astrub
  })
})

describe('fillFromValues', () => {
  it('rellena lo vacío de una página de logro y nunca lo escrito', () => {
    const fill = fillFromValues('achievement', ocasion, {
      name: 'Mi nombre',
      points: null,
      group: undefined,
      quests: [],
      items: [{ item: 99, quantity: 2 }],
    })
    expect(fill).toEqual({
      group: 7,
      order: 9,
      points: 10,
      experience: 102_128,
      kamas: 1_105,
      quests: [
        { name: 'Esto hace aguas', quests: [1] },
        { name: 'Misión de clase', quests: [2, 3] },
      ],
    })
  })

  it('el 0 escrito es un valor, no un hueco', () => {
    expect(fillFromValues('group', astrub, { order: 0 })).not.toHaveProperty('order')
  })

  it('rellena un metalogro: nombre, orden, sección y representante', () => {
    expect(fillFromValues('group', astrub, {})).toEqual({
      name: 'Astrub',
      order: 13,
      section: 'zones',
      representative: { relationTo: 'npcs', value: 40 },
    })
  })

  it('sin valor de DofusDB no rellena nada', () => {
    expect(fillFromValues('group', { ...astrub, representative: null }, {})).not.toHaveProperty(
      'representative',
    )
  })
})

describe('dofusDbNote', () => {
  const ready = { status: 'ready' as const, values: ocasion }

  it('dice si el valor viene de DofusDB, si Torre lo cambió o si se rellenará', () => {
    expect(dofusDbNote('achievement', ready, 'points', 10)).toBe(admin.fromDofusDb)
    expect(dofusDbNote('achievement', ready, 'points', 12)).toBe(admin.changed('10'))
    expect(dofusDbNote('achievement', ready, 'points', null)).toBe(admin.emptyWillFill('10'))
  })

  it('compara una relación por su ID y enseña el nombre', () => {
    expect(dofusDbNote('achievement', ready, 'group', 7)).toBe(admin.fromDofusDb)
    expect(dofusDbNote('achievement', ready, 'group', { id: 8 })).toBe(admin.changed('Astrub'))
  })

  it('compara la lista de misiones en orden, con las alternativas juntas', () => {
    const rows = [
      { name: 'Esto hace aguas', quests: [1] },
      { name: 'Misión de clase', quests: [2, 3] },
    ]
    expect(dofusDbNote('achievement', ready, 'quests', rows)).toBe(admin.fromDofusDb)
    // Un nombre de fila cambiado también es un cambio de Torre.
    const renamed = [rows[0]!, { ...rows[1]!, name: 'Tu misión de clase' }]
    expect(dofusDbNote('achievement', ready, 'quests', renamed)).toBe(
      admin.changed('Esto hace aguas → Misión de clase (una de 2)'),
    )
    expect(dofusDbNote('achievement', ready, 'quests', [...rows].reverse())).toBe(
      admin.changed('Esto hace aguas → Misión de clase (una de 2)'),
    )
  })

  it('compara los objetos de la recompensa como conjunto', () => {
    expect(dofusDbNote('achievement', ready, 'items', [{ item: 31, quantity: 1 }])).toBe(
      admin.fromDofusDb,
    )
    expect(dofusDbNote('achievement', ready, 'items', [])).toBe(
      admin.emptyWillFill('1 x Piel pachucha'),
    )
  })

  it('sin logro enlazado, cargando o con error, lo dice', () => {
    expect(dofusDbNote('achievement', { status: 'none' }, 'points', 1)).toBe(own.noAchievement)
    expect(dofusDbNote('group', { status: 'none' }, 'name', 'X')).toBe(own.noCategory)
    expect(dofusDbNote('achievement', { status: 'loading' }, 'points', 1)).toBe(
      admin.dofusDbLoading,
    )
    expect(dofusDbNote('achievement', { status: 'error' }, 'points', 1)).toBe(
      admin.dofusDbUnavailable,
    )
  })

  it('cuando DofusDB no da nada, lo dice', () => {
    const empty = { status: 'ready' as const, values: { ...astrub, representative: null } }
    expect(dofusDbNote('group', empty, 'representative', null)).toBe(admin.dofusDbEmpty)
    const monster = { relationTo: 'monsters', value: 5 }
    expect(dofusDbNote('group', empty, 'representative', monster)).toBe(admin.dofusDbEmptyChanged)
  })

  it('el representante puede ser un PNJ o un monstruo: cuenta la colección y el ID', () => {
    const ready = { status: 'ready' as const, values: astrub }
    expect(dofusDbNote('group', ready, 'representative', { relationTo: 'npcs', value: 40 })).toBe(
      admin.fromDofusDb,
    )
    expect(
      dofusDbNote('group', ready, 'representative', { relationTo: 'monsters', value: 40 }),
    ).toBe(admin.changed('Hupe Esse'))
  })

  it('la sección se enseña con su nombre del panel', () => {
    const ready = { status: 'ready' as const, values: astrub }
    expect(dofusDbNote('group', ready, 'section', 'stories')).toBe(admin.changed('Zonas'))
  })
})
