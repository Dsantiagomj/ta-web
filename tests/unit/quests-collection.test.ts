import type { ArrayField, Field } from 'payload'
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
