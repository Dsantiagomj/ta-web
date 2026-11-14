import { describe, expect, it } from 'vitest'

import {
  dungeonChooser,
  dungeonIndex,
  dungeonMatches,
  type DungeonNames,
} from '@/lib/achievements/dungeons'

import DEV_DUNGEONS from '../fixtures/dofusdb/dungeons.json'

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
  // Para las variantes: un nombre largo, y un templo sin jefe que se parece a otro con jefe.
  { name: 'Cueva del Gran Dragón Negro de la Montaña Helada', bosses: ['Dragón Negro'] },
  { name: 'Templo de Araknas Real', bosses: ['Araknas Real'] },
  { name: 'Templo Maldito de Araknas', bosses: [] },
  // Las expediciones no tienen jefe: nunca se casan.
  { name: 'Expedición - Tofullinero Real', bosses: [] },
]

const match = (label: string) => dungeonMatches(DUNGEONS)(label).dungeon?.name ?? null

describe('dungeonMatches: qué mazmorra', () => {
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
    // «con ídolo» no nombra nada: lo que queda es todo el final del nombre.
    ['Mazmorra de Grunob con ídolo', 'Akademia de los Goblins'],
    // Mal escrita, pero sin duda: solo una mazmorra lleva esas palabras.
    ['Mazmorra Ratonera de la Rata Negra', 'Raratonera de la Rata Negra'],
  ])('«%s» es %s', (label, dungeon) => {
    expect(match(label)).toBe(dungeon)
  })

  it.each([
    // Ninguna mazmorra en concreto.
    'Mazmorras nivel 200',
    'Mazmorras de Frigost I y II',
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
    // Dentro y fuera del paréntesis, dos mazmorras distintas: hay duda.
    'Mazmorra Kumijo (Trono de Sangre)',
  ])('«%s» no se casa con ninguna', (label) => {
    expect(match(label)).toBeNull()
  })

  it('sin mazmorras no casa nada', () => {
    expect(dungeonMatches([])('Mazmorra Kumijo').dungeon).toBeNull()
  })
})

// Las 187 mazmorras de dev (DofusDB en español, 2026-11-14), para las notas reales que hoy
// llevan el icono genérico: la duda se mide contra todas, no contra unas pocas.
describe('dungeonMatches con las mazmorras de dev', () => {
  const explain = dungeonMatches(DEV_DUNGEONS as DungeonNames[])
  const summary = (label: string) => {
    const found = explain(label)
    return found.dungeon
      ? {
          dungeon: found.dungeon.name,
          how: found.how,
          ...(found.boss && { boss: found.boss }),
          approximate: found.approximate,
        }
      : null
  }

  it.each([
    // El jefe sin las palabras de relleno: «Ben Ripata» es Ben el Ripata.
    ['Mazmorra Ben Ripata', 'Restos del Roca Negra', 'boss', 'Ben el Ripata', false],
    ['Mazmorra Ben Ripata con ídolo', 'Restos del Roca Negra', 'boss', 'Ben el Ripata', false],
    [
      'Mazmorra Reina de Ladrones',
      'Trono de la Corte Tenebrosa',
      'boss',
      'Reina de los Ladrones',
      false,
    ],
    // El nombre sin las palabras de relleno.
    ['Mazmorra de la Cripta del Chadalid', 'Cripta de Chadalid', 'name', undefined, false],
    ['Mazmorra Tynril con ídolo', 'Laboratorio del Tynril', 'name', undefined, false],
    // Un nombre al que le falta una palabra, o mal escrito.
    ['Mazmorra Ring Eskarlata', 'Ring del Capitán Eskarlata', 'name', undefined, true],
    ['Mazmorra del Ring Eskarlata', 'Ring del Capitán Eskarlata', 'name', undefined, true],
    [
      'Llave de la mazmorra del Ring Eskarlata',
      'Ring del Capitán Eskarlata',
      'name',
      undefined,
      true,
    ],
    // Al nombre de la mazmorra le sobran dos palabras; al de su jefe, una.
    [
      'Mazmorra Blop Multicolor',
      'Antro del Blop Multicolor Real',
      'boss',
      'Blop Multicolor Real',
      true,
    ],
    // Rata Negra es el jefe de la Raratonera: «Negro» es una errata de una letra.
    ['Mazmorra Rata Negro', 'Raratonera de la Rata Negra', 'name', undefined, true],
    ['Mazmorra Ratonera de la Rata Negra', 'Raratonera de la Rata Negra', 'name', undefined, true],
    // El nombre de pila del jefe y un mote de Torre.
    [
      'Mazmorra Anerice la bebesita',
      'Mansión de Kuatropatas',
      'boss',
      "Anerice la Fab'huquesa",
      true,
    ],
  ])('«%s» es %s', (label, dungeon, how, boss, approximate) => {
    expect(summary(label)).toEqual({ dungeon, how, ...(boss && { boss }), approximate })
  })

  it.each([
    'Mazmorras de Frigost I y II',
    'jefes de mazmorra para capturarlos o comprar las piedras llenas del mercadillo',
    'Mazmorra dependiendo de tu nivel (explicación más abajo)',
    'Mazmorras (solo una vez y depende de tu nivel)Si eres 109 o menos: Fundición de los ' +
      'Waddictos.Si eres nivel 110 a 179: Crocantería.Si eres nivel 180 o más: Templo del Dios Kao',
    'Mazmorras nivel 200',
    'Mazmorras nivel 200 para dropear parangón',
    'Mazmorra Cire Momore',
    // Un título no es un nombre de pila: el Conde Kontatrás, el Maestro Cuerbok y el Director
    // Grunob no son los únicos condes, maestros o directores del juego.
    'Mazmorra Conde Drácula',
    'Mazmorra Maestro Pandawa',
    'Mazmorra Director Escolar',
    // El nombre de pila de cuatro jefes: tiene que ser el de uno solo.
    'Mazmorra Tynril Loco',
    // Dos erratas en la misma nota ya no son una variante.
    'Mazmorra Ratonera de la Rata Negro',
  ])('«%s» sigue genérica', (label) => {
    expect(summary(label)).toBeNull()
  })

  it('una variante que vale para varias no casa, y dice entre cuáles duda', () => {
    // «Blop … Real» son el Blop Multicolor Real y los cuatro del Enclave.
    expect(explain('Mazmorra Blop Real')).toEqual({
      how: 'none',
      dungeon: null,
      candidates: [
        expect.objectContaining({ name: 'Enclave de los Blops' }),
        expect.objectContaining({ name: 'Antro del Blop Multicolor Real' }),
      ],
    })
    // «Rata» es corto para ser un nombre de pila, y lo llevan dos jefes: nada.
    expect(explain('Mazmorra Rata')).toEqual({ how: 'none', dungeon: null, candidates: [] })
  })
})

describe('dungeonMatches', () => {
  const explain = dungeonMatches(DUNGEONS)

  it('una variante en una parte y otra distinta en el paréntesis: duda entre las dos', () => {
    const both = dungeonMatches(DEV_DUNGEONS as DungeonNames[])(
      'Mazmorra Ring Eskarlata (Mazmorra Anerice la bebesita)',
    )
    expect(both).toMatchObject({ how: 'none', dungeon: null })
    expect(both.how === 'none' && both.candidates.map((d) => d.name)).toEqual([
      'Ring del Capitán Eskarlata',
      'Mansión de Kuatropatas',
    ])
  })

  it('un título compartido no basta como nombre de pila de un jefe', () => {
    expect(explain('Mazmorra Gran Jefe Oscuro').dungeon).toBeNull()
  })

  it('una variante no se salta más de una palabra del nombre', () => {
    expect(explain('Mazmorra Cueva Helada').dungeon).toBeNull()
  })

  it('un nombre sin jefe que también se parece causa duda, no se descarta', () => {
    expect(explain('Mazmorra Templo Araknas')).toEqual({
      how: 'none',
      dungeon: null,
      candidates: [
        expect.objectContaining({ name: 'Templo de Araknas Real' }),
        expect.objectContaining({ name: 'Templo Maldito de Araknas' }),
      ],
    })
  })

  it('prepara cada juego de mazmorras una vez, y las vueltas sueltas solo si hacen falta', () => {
    // Un juego de mazmorras propio: ninguna otra prueba ha preparado ya su índice.
    const copy = [...DUNGEONS, { name: 'Solo para el índice', bosses: ['Nadie'] }]
    const index = dungeonIndex(copy)
    expect(dungeonIndex(copy.map((dungeon) => ({ ...dungeon })))).toBe(index)
    const explainCopy = dungeonMatches(copy)
    expect(explainCopy('Mazmorra Kumijo').dungeon).toBe(copy[12])
    expect(index.looseReady).toBe(false)
    explainCopy('Mazmorra de Grunob con ídolo')
    expect(index.looseReady).toBe(true)
    // Otras mazmorras: otro índice.
    expect(dungeonIndex(copy.slice(1))).not.toBe(index)
  })

  it('dice si casó por el nombre de la mazmorra o por el de su jefe', () => {
    expect(explain('Mazmorra Corte del Jalató Real')).toMatchObject({
      how: 'name',
      approximate: false,
    })
    expect(explain('Mazmorra Kumijo')).toEqual({
      dungeon: expect.objectContaining({ name: 'Casa de los Espíritus' }),
      how: 'boss',
      boss: 'Kumijo',
      approximate: false,
    })
    // El final del nombre del jefe también es por jefe.
    expect(explain('Mazmorra de Grunob')).toMatchObject({ how: 'boss', boss: 'Director Grunob' })
  })

  it('un jefe de dos mazmorras no casa, y dice cuáles son', () => {
    expect(explain('Mazmorra Guerra')).toEqual({
      how: 'none',
      dungeon: null,
      candidates: [
        expect.objectContaining({ name: 'Trono de Sangre' }),
        expect.objectContaining({ name: 'Tormenta del Selocalipsis' }),
      ],
    })
  })

  it('una duda en el nombre exacto no se resuelve con las variantes', () => {
    // «Real» vale para tres; no se busca una variante que elija una.
    expect(explain('Mazmorra Real')).toMatchObject({ dungeon: null })
    expect(explain('Mazmorra Real').dungeon).toBeNull()
  })

  it('sin duda y sin nada que case, no hay candidatas', () => {
    expect(explain('Mazmorras nivel 200')).toEqual({ how: 'none', dungeon: null, candidates: [] })
  })
})

describe('dungeonChooser', () => {
  // Las mismas mazmorras con su ID de Payload, que es lo que guarda la elección del panel.
  const WITH_IDS = DUNGEONS.map((dungeon, index) => ({ ...dungeon, id: index + 1 }))
  const idOf = (name: string) => WITH_IDS.find((dungeon) => dungeon.name === name)!.id
  const choose = (picks: Record<string, string>) =>
    dungeonChooser(WITH_IDS, (label) => (label in picks ? idOf(picks[label]!) : undefined))

  it('la mazmorra elegida a mano gana a la que casa por nombre', () => {
    const chosen = choose({ 'Mazmorra Kumijo': 'Antro del Cil' })('Mazmorra Kumijo')
    expect(chosen).toEqual({
      how: 'manual',
      dungeon: expect.objectContaining({ name: 'Antro del Cil' }),
    })
  })

  it('elige una mazmorra para una nota que no casa sola', () => {
    const chosen = choose({ 'Mazmorra Ben Ripata': 'Casa de los Espíritus' })('Mazmorra Ben Ripata')
    expect(chosen.dungeon?.name).toBe('Casa de los Espíritus')
    expect(chosen.how).toBe('manual')
  })

  it('sin elección, la que casa por nombre o por jefe; sin casar, nada', () => {
    const chooseNone = choose({})
    expect(chooseNone('Mazmorra Kumijo')).toEqual({
      how: 'boss',
      dungeon: expect.objectContaining({ name: 'Casa de los Espíritus' }),
      boss: 'Kumijo',
      approximate: false,
    })
    expect(chooseNone('Mazmorra Corte del Jalató Real')).toMatchObject({ how: 'name' })
    expect(chooseNone('Mazmorra Ben Ripata')).toEqual({
      how: 'none',
      dungeon: null,
      candidates: [],
    })
    // Las genéricas siguen genéricas.
    expect(chooseNone('Mazmorras nivel 200')).toMatchObject({ how: 'none', dungeon: null })
    // Y una duda dice entre cuáles.
    expect(chooseNone('Mazmorra Guerra')).toMatchObject({
      how: 'none',
      candidates: [{ name: 'Trono de Sangre' }, { name: 'Tormenta del Selocalipsis' }],
    })
  })

  it('una elección que apunta a una mazmorra que ya no existe no cuenta', () => {
    const chooser = dungeonChooser(WITH_IDS, () => 9_999)
    expect(chooser('Mazmorra Kumijo')).toMatchObject({ how: 'boss' })
    expect(chooser('Mazmorra Ben Ripata')).toMatchObject({ how: 'none', dungeon: null })
  })
})
