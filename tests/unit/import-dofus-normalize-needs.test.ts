import { describe, expect, it } from 'vitest'

import {
  achievementName,
  needClassifiers,
  normalizeNeeds,
  type NeedEntry,
} from '../../scripts/import/dofus-guides/normalize-needs'

// El reparto de las filas de Necesitarás en los grupos fijos, con datos y sin adivinar: los
// objetos por su tipo en DofusDB, las mazmorras por el emparejador de mazmorras, los combates
// por la palabra «combate» o un monstruo, los logros y los oficios por su nombre. Lo que no
// se puede clasificar con certeza va a «Otros». Las filas son de las guías de dev.

const classify = needClassifiers({
  dungeons: [
    { name: 'Guarida del Wey Wabbit', bosses: ['Wey Wabbit'] },
    { name: 'Ring del Capitán Eskarlata', bosses: ['Capitán Eskarlata'] },
    { name: 'Antro del Dragocerdo', bosses: ['Dragocerdo'] },
  ],
  monsters: ['Jalató', 'Tofu'],
  achievements: ['Cazamonturas', 'La primera monta'],
  jobs: ['Minero', 'Campesino', 'Alquimista', 'Ganadero'],
})

const note = (text: string, headings: (string | null)[] = []): NeedEntry => ({
  text,
  headings,
  block: { blockType: 'needNote', text },
})
const item = (text: string, superTypeId: number | null, headings: (string | null)[] = []) => ({
  text,
  headings,
  superTypeId,
  block: { blockType: 'needItem', text },
})

const groupsOf = (entries: NeedEntry[]) =>
  normalizeNeeds(entries, classify).groups.map((group) => [
    group.name,
    group.rows.map((row) => row.text),
  ])

describe('normalizeNeeds', () => {
  it('los objetos van por su tipo en DofusDB, aunque Torre los pusiera en Recursos', () => {
    // Domakuro: el Pandasahi es un consumible; Esmeralda: los dragopavos, equipables.
    expect(
      groupsOf([
        item('100 x Arroz.', 9, ['Recursos']),
        item('2 x Pandasahi.', 6, ['Recursos']),
        item('1 x Dragopavo dorado.', 12),
        item('1 x Piedra de alma mediana.', 70, ['Recursos']),
      ]),
    ).toEqual([
      ['recursos', ['100 x Arroz.']],
      ['equipables', ['1 x Dragopavo dorado.']],
      ['consumibles', ['2 x Pandasahi.', '1 x Piedra de alma mediana.']],
    ])
  })

  it('un título de Torre que ya es un grupo manda sobre las notas que lleva debajo', () => {
    expect(
      groupsOf([
        note('Algunas luchas contra monstruos para drops.', ['Combates']),
        note('30 x Recursos recolectables del reino de tinta o papel.', ['Recursos']),
        note('Ser fabricante nivel 10 o más.', ['Oficios']),
        note('Dar un beso.', ['Emotes']),
      ]),
    ).toEqual([
      ['combates', ['Algunas luchas contra monstruos para drops.']],
      ['recursos', ['30 x Recursos recolectables del reino de tinta o papel.']],
      ['oficios', ['Ser fabricante nivel 10 o más.']],
      ['emotes', ['Dar un beso.']],
    ])
  })

  it('las notas sueltas se clasifican con datos (Marfil, Esmeralda, Ébano)', () => {
    expect(
      groupsOf([
        note('14 x combates.'),
        note('1 x Mazmorra del Miauvizor.'),
        note('1 x Guarida del Wey Wabbit.'),
        note('Logro: “Cazamonturas”.'),
        note('Ser minero nivel 20 mínimo.'),
        note('Cualquier oficio subido mínimo al nivel 50.'),
        note('2 x Jalató.'),
      ]),
    ).toEqual([
      ['combates', ['14 x combates.', '2 x Jalató.']],
      ['mazmorras', ['1 x Mazmorra del Miauvizor.', '1 x Guarida del Wey Wabbit.']],
      ['oficios', ['Ser minero nivel 20 mínimo.', 'Cualquier oficio subido mínimo al nivel 50.']],
      ['logros', ['Logro: “Cazamonturas”.']],
    ])
  })

  it('lo que no se puede clasificar con certeza va a Otros', () => {
    expect(
      groupsOf([
        // Una llave no es una mazmorra, aunque nombre una.
        note('1 x Llave del Ring Eskarlata.'),
        // Habla de mazmorras, pero no es una mazmorra que hacer.
        note('Piedras de alma de jefes de mazmorra y archimonstruos.'),
        note('Ayuda de otras 2 personas para baldosas ZzZzZz…'),
        note('Sueños infinitos.', ['Otros detalles y oficios']),
      ]),
    ).toEqual([
      [
        'otros',
        [
          '1 x Llave del Ring Eskarlata.',
          'Piedras de alma de jefes de mazmorra y archimonstruos.',
          'Ayuda de otras 2 personas para baldosas ZzZzZz…',
          'Sueños infinitos.',
        ],
      ],
    ])
  })

  it('bajo «Otros» de Torre, lo que se puede clasificar sale de Otros', () => {
    expect(groupsOf([note('Muchos muchos combates xD.', ['Otros'])])).toEqual([
      ['combates', ['Muchos muchos combates xD.']],
    ])
  })

  it('un subtítulo que no es grupo va delante de sus filas, en su grupo (Cacao)', () => {
    expect(
      groupsOf([
        { ...note('Dependiendo de tu nivel:', ['Mazmorras']), leads: true },
        note('Nivel 20 a 119: Fundición de los waddictos.', [
          'Dependiendo de tu nivel',
          'Mazmorras',
        ]),
        note('Un par de combates por allí y por allá.'),
      ]),
    ).toEqual([
      ['combates', ['Un par de combates por allí y por allá.']],
      ['mazmorras', ['Dependiendo de tu nivel:', 'Nivel 20 a 119: Fundición de los waddictos.']],
    ])
  })

  it('dice de dónde viene cada fila, a dónde va y por qué', () => {
    const { placements } = normalizeNeeds(
      [
        item('2 x Pandasahi.', 6, ['Recursos']),
        note('1 x Mazmorra Kutulú.'),
        note('Ayuda de otras 2 personas.', ['Recursos y otras movidas']),
      ],
      classify,
    )
    expect(placements).toEqual([
      { text: '2 x Pandasahi.', from: 'Recursos', to: 'consumibles', reason: 'tipo de objeto' },
      { text: '1 x Mazmorra Kutulú.', from: null, to: 'mazmorras', reason: 'mazmorra' },
      {
        text: 'Ayuda de otras 2 personas.',
        from: 'Recursos y otras movidas',
        to: 'otros',
        reason: 'sin clasificar',
      },
    ])
  })
})

describe('needClassifiers', () => {
  it('una mazmorra: la palabra al principio o el emparejador, nunca una llave', () => {
    expect(classify.dungeon('1 x Mazmorra Le chuko.')).toBe(true)
    expect(classify.dungeon('1 x Antro del Dragocerdo.')).toBe(true)
    expect(classify.dungeon('1 x Llave del Ring Eskarlata.')).toBe(false)
    expect(classify.dungeon('Capturar jefes de mazmorra.')).toBe(false)
  })

  it('un combate: la palabra «combate» o el nombre exacto de un monstruo', () => {
    expect(classify.fight('6 x combate (realizable en grupo).')).toBe('combate')
    expect(classify.fight('3 x Jalato.')).toBe('monstruo')
    expect(classify.fight('Jalatín negro.')).toBeNull()
  })

  it('un logro por su nombre exacto, con o sin «Logro:» y comillas', () => {
    expect(classify.achievement('Logro: “La primera monta”.')).toBe(true)
    expect(classify.achievement('La primera monta.')).toBe(true)
    expect(classify.achievement('La primera montura.')).toBe(false)
  })

  it('un oficio: la palabra «oficio» o el nombre de un oficio de DofusDB', () => {
    expect(classify.job('Ser alquimista y/o campesino 200.')).toBe(true)
    expect(classify.job('Algún oficio nivel 200 (sea cual sea).')).toBe(true)
    expect(classify.job('Tener el Dofus vigilante.')).toBe(false)
  })
})

describe('achievementName', () => {
  it('el nombre del logro de una fila «Logro:», sin comillas ni punto, para buscarlo', () => {
    expect(achievementName('Logro: “Cazamonturas”.')).toBe('Cazamonturas')
    expect(achievementName('Logro: «La primera monta»')).toBe('La primera monta')
    expect(achievementName('Cazamonturas.')).toBeNull()
  })
})
