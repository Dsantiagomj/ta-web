import { describe, expect, it } from 'vitest'

import { rewardTypos, rewardTyposReport, type GuideTypos } from '@/lib/guides/reward-typos'
import type { LinkedQuest } from '@/lib/guides/summary'

const reward = (id: number, name: string, quantity: number, typeId = 15) => ({
  item: { id, name, typeId },
  quantity,
})
const quest = (...items: ReturnType<typeof reward>[]): LinkedQuest => ({ rewards: { items } })

describe('rewardTypos', () => {
  it('corrige solo el nombre mal escrito y enlaza su fila: Vuelta venenosa', () => {
    const text = '1 000 XP.\n1 x Fragmento de Ugahruleta.\n1 x Kama de hielo.'
    const result = rewardTypos(
      text,
      quest(reward(7, 'Kama de hielo', 1), reward(9, 'Fragmento de Ugahlureta', 1)),
      [{ item: 7, quantity: 1 }],
    )
    expect(result.fixes).toEqual([
      { before: '1 x Fragmento de Ugahruleta.', after: '1 x Fragmento de Ugahlureta.', item: 9 },
    ])
    expect(result.text).toBe('1 000 XP.\n1 x Fragmento de Ugahlureta.\n1 x Kama de hielo.')
    expect(result.rewardItems).toEqual([
      { item: 7, quantity: 1 },
      { item: 9, quantity: 1 },
    ])
    expect(result.skipped).toEqual([])
  })

  it('casa sin tildes ni mayúsculas, con una letra de más o de menos y el plural', () => {
    const cases: [string, string][] = [
      ['Pelos de Minotauroro', 'Pelos del Minotauroro'],
      ['Valva de sumergico', 'Valva de sumergido'],
      ['Muñeco bodú fipi', 'Muñeca bodú Fipi'],
      ['Kama plateada de chocolate', 'Kama plateado de chocolate'],
      ['Cascos de martóguiz', 'Casco de martóguiz'],
      ['Pico de devastadores', 'Pico de devastador'],
      ['Trampa desactivada de machacasesino', 'Trampa desactivada de machasesino'],
    ]
    for (const [torre, dofusDb] of cases) {
      const result = rewardTypos(`3 x ${torre}.`, quest(reward(1, dofusDb, 3)), [])
      expect(result.fixes).toEqual([{ before: `3 x ${torre}.`, after: `3 x ${dofusDb}.`, item: 1 }])
    }
  })

  it('quita la cantidad repetida delante del nombre: «5 x 5 x Honda de jalahondero.»', () => {
    const result = rewardTypos(
      '5 x 5 x Honda de jalahondero.',
      quest(reward(1, 'Honda de jalahondero', 5)),
      [],
    )
    expect(result.text).toBe('5 x Honda de jalahondero.')
  })

  it('el resto del texto queda tal cual lo escribió Torre', () => {
    const text = 'Emote: Saludar.\n\n3 x Valva de sumergico.\n'
    expect(rewardTypos(text, quest(reward(1, 'Valva de sumergido', 3)), []).text).toBe(
      'Emote: Saludar.\n\n3 x Valva de sumergido.\n',
    )
  })

  it('no toca lo que no es una errata, y dice por qué', () => {
    const text = [
      '1 x La Aurora Púrpura (1.º Parte) - Fragmentos Encontrados IX',
      '1 x Tótem de equilibrio (arma de misión).',
      '5 x Garra de bubotente.',
      '2 x Piel de tritón.',
      '5 x Lana de jalamut.',
    ].join('\n')
    const result = rewardTypos(
      text,
      quest(
        reward(1, 'La Aurora Púrpura (1.ª Parte) - Fragmentos Encontrados IX', 1, 25),
        reward(2, 'Tótem de equilibrio', 1),
        reward(3, 'Zarpa de bubotente', 5),
        reward(4, 'Piel de trithón', 1),
        reward(5, 'Oreja de jalamutín', 5),
      ),
      [],
    )
    expect(result.fixes).toEqual([])
    expect(result.text).toBe(text)
    expect(result.skipped).toEqual([
      { line: '1 x La Aurora Púrpura (1.º Parte) - Fragmentos Encontrados IX', reason: 'book' },
      { line: '1 x Tótem de equilibrio (arma de misión).', reason: 'noMatch' },
      { line: '5 x Garra de bubotente.', reason: 'noMatch' },
      { line: '2 x Piel de tritón.', reason: 'quantity', name: 'Piel de trithón', dofusDb: 1 },
      { line: '5 x Lana de jalamut.', reason: 'noMatch' },
    ])
  })

  it('dos objetos igual de parecidos no se adivinan', () => {
    const result = rewardTypos(
      '3 x Muñeco bodú.',
      quest(reward(1, 'Muñeca bodú', 3), reward(2, 'Muñeco budú', 3)),
      [],
    )
    expect(result.fixes).toEqual([])
    expect(result.skipped).toEqual([
      { line: '3 x Muñeco bodú.', reason: 'ambiguous', names: ['Muñeca bodú', 'Muñeco budú'] },
    ])
  })

  it('un nombre corregido por Torre en el objeto es el que se escribe', () => {
    const item = {
      id: 1,
      name: 'Corazón pulío',
      typeId: 15,
      correction: { name: 'Corazón pulido' },
    }
    const result = rewardTypos(
      '1 x Corazón pulid.',
      { rewards: { items: [{ item, quantity: 1 }] } },
      [],
    )
    expect(result.text).toBe('1 x Corazón pulido.')
  })

  it('un texto ya corregido no propone nada: repetirla no cambia nada', () => {
    const result = rewardTypos(
      '3 x Valva de sumergido.',
      quest(reward(1, 'Valva de sumergido', 3)),
      [{ item: 1, quantity: 3 }],
    )
    expect(result).toMatchObject({ fixes: [], skipped: [] })
  })

  it('con la fila del objeto ya en su lista, no la repite; sin lista, no la crea', () => {
    const given = quest(reward(1, 'Valva de sumergido', 3), reward(2, 'Kama de hielo', 1))
    expect(
      rewardTypos('3 x Valva de sumergico.', given, [{ item: { id: 1 }, quantity: 3 }]).rewardItems,
    ).toBeUndefined()
    // Vacía, la web ya enseña los objetos de DofusDB: añadir uno escondería los demás.
    expect(rewardTypos('3 x Valva de sumergico.', given, []).rewardItems).toBeUndefined()
  })
})

describe('rewardTyposReport', () => {
  it('lista cada cambio como «slug: antes → después» y lo que se queda, con el motivo', () => {
    const guides: GuideTypos[] = [
      {
        slug: 'vuelta-venenosa',
        status: 'published',
        fixes: [
          {
            before: '1 x Fragmento de Ugahruleta.',
            after: '1 x Fragmento de Ugahlureta.',
            item: 9,
          },
        ],
        skipped: [],
      },
      {
        slug: 'restauracion-rapida',
        status: 'draft',
        fixes: [],
        skipped: [
          { line: '1 x La Aurora Púrpura', reason: 'book' },
          { line: '2 x Piel de tritón.', reason: 'quantity', name: 'Piel de trithón', dofusDb: 1 },
          { line: '3 x Muñeco bodú.', reason: 'ambiguous', names: ['Muñeca bodú', 'Muñeco budú'] },
          { line: '5 x Lana de jalamut.', reason: 'noMatch' },
        ],
      },
    ]
    expect(rewardTyposReport({ guides: 5, typos: guides, published: 0, drafts: 0 }, false)).toEqual(
      [
        'vuelta-venenosa: 1 x Fragmento de Ugahruleta. → 1 x Fragmento de Ugahlureta.',
        'Se quedan como están:',
        'restauracion-rapida (borrador): «1 x La Aurora Púrpura»: es un libro; su título no se corrige.',
        'restauracion-rapida (borrador): «2 x Piel de tritón.»: se parece a «Piel de trithón», pero DofusDB da 1.',
        'restauracion-rapida (borrador): «3 x Muñeco bodú.»: se parece igual a «Muñeca bodú» y «Muñeco budú».',
        'restauracion-rapida (borrador): «5 x Lana de jalamut.»: ningún objeto de la misión se le parece.',
        'Guías leídas: 5. Erratas por corregir: 1, en 1 guías (publicadas: 1, borradores: 0). Líneas que se quedan: 4.',
        'En seco: sin --apply no se escribe nada.',
      ],
    )
  })
})
