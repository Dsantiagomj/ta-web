import { describe, expect, it } from 'vitest'

import { matchDungeon, type DungeonNames } from '@/lib/achievements/dungeons'

// Mazmorras de DofusDB con sus jefes, tal como las devuelve la API en español.
const DUNGEONS: DungeonNames[] = [
  { name: 'Corte del Jalató Real', bosses: ['Jalató Real'] },
  { name: 'Mazmorra de los Herreros', bosses: ['Cofrerrero'] },
  { name: "Gruta Grut'Hesqua", bosses: ['Coralador Magistral'] },
  { name: 'Canopea del Kimbo', bosses: ['Kimbo'] },
  { name: 'Mazmorra de Nawidad', bosses: ['Pikabeto'] },
  { name: 'Cueva de Nawidad', bosses: ['Chanta Klaus'] },
  { name: 'Tofullinero Real', bosses: ['Tofu Real'] },
  { name: 'Antro del Cil', bosses: ['Cil'] },
  { name: 'Guarida de Lasoberaña', bosses: ['Lasoberaña'] },
  { name: 'Trono de Sangre', bosses: ['Guerra'] },
  { name: 'Tormenta del Selocalipsis', bosses: ['Guerra', 'Servidumbre', 'Miseria', 'Corrupción'] },
  { name: 'Bambusería de Kodámade', bosses: ['Kodámade'] },
  { name: 'Casa de los Espíritus', bosses: ['Kumijo'] },
  { name: 'Akademia de los Goblins', bosses: ['Director Grunob'] },
  { name: 'Raratonera de la Rata Negra', bosses: ['Rata Negra'] },
  // Las expediciones no tienen jefe: nunca se casan.
  { name: 'Expedición - Tofullinero Real', bosses: [] },
]

const match = (label: string) => matchDungeon(label, DUNGEONS)?.name ?? null

describe('matchDungeon', () => {
  it.each([
    // El nombre de la mazmorra, tras «Mazmorra».
    ['Mazmorra Corte del Jalató Real', 'Corte del Jalató Real'],
    ['Mazmorra: Guarida de Lasoberaña', 'Guarida de Lasoberaña'],
    ['Mazmorra Gruta Grut’Hesqua', "Gruta Grut'Hesqua"],
    // Una mazmorra que ya se llama «Mazmorra …» gana a otra con el mismo final.
    ['Mazmorra de los Herreros', 'Mazmorra de los Herreros'],
    ['Mazmorra de Nawidad', 'Mazmorra de Nawidad'],
    // El nombre de su jefe.
    ['Mazmorra del Coralador Magistral', "Gruta Grut'Hesqua"],
    ['Mazmorra Kumijo', 'Casa de los Espíritus'],
    ['Mazmorra Jalató Real XD', 'Corte del Jalató Real'],
    // El final del nombre de la mazmorra o del jefe.
    ['Mazmorra Kodámade', 'Bambusería de Kodámade'],
    ['Mazmorra de Lasoberaña', 'Guarida de Lasoberaña'],
    ['Mazmorra de Grunob', 'Akademia de los Goblins'],
    // Con lo que Torre añade detrás, o dentro de una frase.
    ['Mazmorra Kimbo con ídolo', 'Canopea del Kimbo'],
    ['Hacer las 4 salas de la mazmorra del Cil', 'Antro del Cil'],
    ['Mazmorra de los 4 Jinetes (Tormenta del Selocalipsis)', 'Tormenta del Selocalipsis'],
    // Un jefe compartido: la mazmorra con su nombre, no la que reúne a cuatro jefes.
    ['Mazmorra Trono de Sangre', 'Trono de Sangre'],
    ['Mazmorra Guerra', 'Trono de Sangre'],
  ])('«%s» es %s', (label, dungeon) => {
    expect(match(label)).toBe(dungeon)
  })

  it.each([
    // Ninguna mazmorra en concreto.
    'Mazmorras nivel 200',
    'Mazmorras de Frigost I y II',
    // Mal escrita: no se adivina.
    'Mazmorra Ratonera de la Rata Negra',
    // Vale para varias: tampoco se adivina.
    'Mazmorra Real',
    // Solo una expedición se llama así, y no tiene jefe.
    'Mazmorra Expedición - Tofullinero Real',
  ])('«%s» no se casa con ninguna', (label) => {
    expect(match(label)).toBeNull()
  })

  it('sin mazmorras no casa nada', () => {
    expect(matchDungeon('Mazmorra Kumijo', [])).toBeNull()
  })
})
