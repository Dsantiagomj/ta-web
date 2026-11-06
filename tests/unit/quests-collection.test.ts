import type { ArrayField, Field, GroupField } from 'payload'
import { describe, expect, it } from 'vitest'

import { Quests, questsAccess } from '@/collections/Quests'

function field(name: string, fields: Field[] = Quests.fields): Field {
  const found = fields.find((candidate) => 'name' in candidate && candidate.name === name)
  if (!found) throw new Error(`Falta el campo ${name}`)
  return found
}

describe('colección quests', () => {
  it('usa el slug quests y el nombre como título en el panel', () => {
    expect(Quests.slug).toBe('quests')
    expect(Quests.admin?.useAsTitle).toBe('name')
  })

  it('identifica cada misión por su ID de DofusDB, único e indexado', () => {
    expect(field('dofusId')).toMatchObject({
      type: 'number',
      required: true,
      unique: true,
      index: true,
    })
  })

  it('guarda el nombre traducible', () => {
    expect(field('name')).toMatchObject({ type: 'text', required: true, localized: true })
  })

  it('guarda niveles, categoría, criterio de inicio y fecha de refresco opcionales', () => {
    for (const name of ['levelMin', 'levelMax', 'categoryId']) {
      const number = field(name)
      expect(number).toMatchObject({ type: 'number' })
      expect(number).not.toHaveProperty('required', true)
    }
    expect(field('startCriterion')).toMatchObject({ type: 'text' })
    expect(field('startCriterion')).not.toHaveProperty('required', true)
    expect(field('refreshedAt')).toMatchObject({ type: 'date' })
    expect(field('refreshedAt')).not.toHaveProperty('required', true)
  })

  it('relaciona los prerrequisitos con otras misiones', () => {
    expect(field('prerequisites')).toMatchObject({
      type: 'relationship',
      relationTo: 'quests',
      hasMany: true,
    })
  })

  it('guarda varias posiciones de inicio con PNJ, mapa y coordenadas', () => {
    const startPositions = field('startPositions') as ArrayField
    expect(startPositions.type).toBe('array')
    expect(field('npcId', startPositions.fields)).toMatchObject({ type: 'number' })
    expect(field('npcName', startPositions.fields)).toMatchObject({
      type: 'text',
      localized: true,
    })
    for (const name of ['mapId', 'x', 'y']) {
      expect(field(name, startPositions.fields)).toMatchObject({ type: 'number' })
    }
  })
})

describe('recompensas y requisitos de quests', () => {
  function group(name: string): GroupField {
    const found = field(name)
    expect(found.type).toBe('group')
    return found as GroupField
  }

  function quantities(list: Field, relation: string, to: string) {
    const array = list as ArrayField
    expect(array.type).toBe('array')
    expect(field(relation, array.fields)).toMatchObject({
      type: 'relationship',
      relationTo: to,
      required: true,
    })
    expect(field('quantity', array.fields)).toMatchObject({ type: 'number', required: true })
  }

  it('guarda experiencia, kamas y objetos de recompensa', () => {
    const rewards = group('rewards')
    expect(field('experience', rewards.fields)).toMatchObject({ type: 'number' })
    expect(field('kamas', rewards.fields)).toMatchObject({ type: 'number' })
    quantities(field('items', rewards.fields), 'item', 'items')
  })

  it('guarda la XP en el nivel óptimo, el principio del rango de la guía', () => {
    expect(field('experienceMin', group('rewards').fields)).toMatchObject({ type: 'number' })
  })

  it('guarda la zona traducible y el logro con la posición de la misión en él', () => {
    expect(field('zone')).toMatchObject({ type: 'text', localized: true })
    const achievement = group('achievement')
    expect(field('dofusId', achievement.fields)).toMatchObject({ type: 'number' })
    expect(field('name', achievement.fields)).toMatchObject({ type: 'text', localized: true })
    expect(field('slug', achievement.fields)).toMatchObject({ type: 'text' })
    expect(field('position', achievement.fields)).toMatchObject({ type: 'number' })
    expect(field('total', achievement.fields)).toMatchObject({ type: 'number' })
  })

  it('guarda los IDs de DofusDB de emotes, hechizos, títulos y oficios como listas de números', () => {
    const rewards = group('rewards')
    for (const name of ['emoteIds', 'spellIds', 'titleIds', 'jobIds']) {
      expect(field(name, rewards.fields)).toMatchObject({ type: 'number', hasMany: true })
    }
  })

  it('guarda los objetos y monstruos que pide y si hay que caminar mapas', () => {
    const needs = group('needs')
    quantities(field('items', needs.fields), 'item', 'items')
    quantities(field('monsters', needs.fields), 'monster', 'monsters')
    expect(field('walksMaps', needs.fields)).toMatchObject({ type: 'checkbox' })
  })
})

describe('permisos de quests', () => {
  it('cualquiera lee las misiones, porque son datos públicos del juego', () => {
    expect(questsAccess.read()).toBe(true)
    expect(Quests.access?.read).toBe(questsAccess.read)
  })

  it('nadie crea, edita ni borra misiones por la API ni el panel', () => {
    expect(questsAccess.create()).toBe(false)
    expect(questsAccess.update()).toBe(false)
    expect(questsAccess.delete()).toBe(false)
    expect(Quests.access).toBe(questsAccess)
  })
})
