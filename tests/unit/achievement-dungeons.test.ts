import { describe, expect, it } from 'vitest'

import { dungeonMatcher, matchDungeon, type DungeonNames } from '@/lib/achievements/dungeons'

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
  // Para los contraejemplos: un nombre que acaba en «Mazmorra» y un jefe de una palabra
  // corriente al final de su nombre.
  { name: 'Sala de la Mazmorra', bosses: ['Guardián'] },
  { name: 'Palacio del Gran Rey', bosses: ['Gran Rey'] },
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
    // Lo genérico no cuenta: «Mazmorra de» no es la «Sala de la Mazmorra».
    ['Mazmorra de los Herreros con ídolo', 'Mazmorra de los Herreros'],
    ['Llave de la mazmorra del Kimbo', 'Canopea del Kimbo'],
    // Lo de fuera del paréntesis vale para varias; el paréntesis, para una.
    ['Mazmorra Real (Corte del Jalató Real)', 'Corte del Jalató Real'],
    // Lo de fuera no casa con ninguna y el paréntesis no se contradice.
    ['Mazmorra de Nawidad (Mazmorra de Nawidad)', 'Mazmorra de Nawidad'],
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
    // Nada más que palabras genéricas.
    'Mazmorra',
    'Llave de la mazmorra',
    // Un jefe que tienen dos mazmorras: puede ser cualquiera de ellas.
    'Mazmorra Guerra',
    // Una sola palabra que es el final de un nombre, quitando lo que sigue: «Rey» no basta.
    'Mazmorra del Rey Gelatina',
    'Mazmorra de Grunob con ídolo',
    // Dentro y fuera del paréntesis, dos mazmorras distintas: hay duda.
    'Mazmorra Kumijo (Trono de Sangre)',
  ])('«%s» no se casa con ninguna', (label) => {
    expect(match(label)).toBeNull()
  })

  it('dungeonMatcher prepara las mazmorras una vez y casa cada nota igual que matchDungeon', () => {
    const match = dungeonMatcher(DUNGEONS)
    for (const label of ['Mazmorra Kumijo', 'Mazmorra de Grunob', 'Mazmorras nivel 200']) {
      expect(match(label)).toBe(matchDungeon(label, DUNGEONS))
    }
  })

  it('sin mazmorras no casa nada', () => {
    expect(matchDungeon('Mazmorra Kumijo', [])).toBeNull()
  })
})
