import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  inline,
  parseDofusGuide,
  type AchievementPart,
  type DofusGuideSource,
} from '../../scripts/import/dofus-guides/parse'

// Las páginas de Torre recortadas a su <article> (tests/fixtures/dofus-guides). Cada una cubre
// un caso: la más corta (Dofawa), un metalogro (Plateado), una nota y emotes (Cacao), el aviso
// de checklist y las misiones sueltas (Hielos), las misiones numeradas (Nebuloso), una
// guía paso a paso con capturas (Piñata de pino) y una página vacía (Jyfus).
const page = (slug: string) =>
  readFileSync(new URL(`../fixtures/dofus-guides/${slug}.html`, import.meta.url), 'utf8')
const guide = (slug: string) => parseDofusGuide(page(slug)) as DofusGuideSource

const GOLDEN = [
  'dofawa',
  'dofus-plateado',
  'dofus-cacao',
  'dofus-de-los-hielos',
  'misiones-nebuloso',
  'dofus-abisal',
  'piata-de-pino',
  'dofus-vulbis',
]

describe('parseDofusGuide: páginas de referencia', () => {
  it.each(GOLDEN)('%s sale igual que su golden', async (slug) => {
    await expect(JSON.stringify(guide(slug), null, 1)).toMatchFileSnapshot(
      `../fixtures/dofus-guides/${slug}.json`,
    )
  })

  it('una página sin contenido no es una guía: el Dofus queda En preparación', () => {
    expect(parseDofusGuide(page('jyfus'))).toBeNull()
  })
})

describe('parseDofusGuide: lo que Torre escribe', () => {
  it('lee el título, Prerrequisitos y la intro con sus enlaces', () => {
    const dofawa = guide('dofawa')
    expect(dofawa.heading).toBe('DOFAWA')
    expect(dofawa.prerequisites).toEqual([[{ t: 'text', v: 'Nivel mínimo 10.' }]])
    expect(dofawa.intro[0]).toContainEqual({
      t: 'link',
      v: 'Eso va a costar un huevo',
      href: '/eso-va-a-costar-un-huevo',
      b: true,
    })
    expect(dofawa.needs).toBeNull()
    expect(dofawa.parts).toEqual([])
  })

  it('separa en Necesitarás la cantidad, el nombre y la nota, y agrupa las mazmorras', () => {
    const abisal = guide('dofus-abisal')
    const loose = abisal.needs!.groups[0]!.rows
    expect(loose[0]).toMatchObject({ text: 'Algún oficio nivel 200 (sea cual sea).' })
    expect(loose[0]!.quantity).toBeUndefined()
    expect(loose[1]).toMatchObject({
      quantity: 1,
      name: 'Sello de los fundadores',
      note: '(o fabricarlo)',
    })
    expect(loose.find((row) => row.name === 'Pepita')).toMatchObject({ quantity: 200 })
    const dungeons = abisal.needs!.groups.find((group) => group.name === 'Mazmorras')!
    expect(dungeons.rows.map((row) => row.name)).toEqual([
      'Mazmorra Merkator',
      'Mazmorra Dientinea',
      'Mazmorra Capitán Meno',
      'Mazmorra Kutulú',
    ])
  })

  it('los logros llevan las misiones de Torre en su orden, sin el punto final', () => {
    const abisal = guide('dofus-abisal')
    const achievements = abisal.parts as AchievementPart[]
    expect(achievements.map((part) => part.name)).toEqual([
      '¡Plof!',
      '¡No… puedes… bajar!',
      'Luces, cámara y chapuzón',
      'Test de impermeabilidad',
      'El mar por legado',
      'La guerra de los mundos… submarinos',
      'La llamada de Kutulú',
    ])
    expect(achievements[0]!.quests).toEqual([
      { name: 'A la pesca de información', slug: 'a-la-pesca-de-informacion' },
      { name: 'El héroe de Sufokia', slug: 'el-heroe-de-sufokia' },
    ])
  })

  it('un metalogro agrupa sus logros, con el número de Torre', () => {
    const [first] = guide('dofus-plateado').parts
    expect(first).toMatchObject({ type: 'metalogro', number: 1, name: 'Un comienzo ejemplar' })
    if (first?.type !== 'metalogro') throw new Error('Se esperaba un metalogro')
    expect(first.achievements[0]).toMatchObject({
      type: 'achievement',
      name: 'Al partir',
      slug: 'al-partir',
    })
  })

  it('el aviso de la checklist, las misiones sueltas y las alternativas', () => {
    const hielos = guide('dofus-de-los-hielos')
    expect(hielos.banner).toEqual({
      text: 'YA TENEMOS CHECKLIST DOFUS DE LOS HIELOS',
      href: '/checklist-dofus-de-los-hielos',
    })
    const loose = hielos.parts.find((part) => part.type === 'quests')
    expect(loose).toMatchObject({ type: 'quests' })
    if (loose?.type !== 'quests') throw new Error('Se esperaban misiones sueltas')
    expect(loose.quests.at(-1)).toEqual({
      name: 'Luces y sombra',
      slug: 'luces-y-sombras',
      note: '(solo empezarla)',
    })
    const soul = hielos.parts.find(
      (part) => part.type === 'achievement' && part.name === 'Un alma helada',
    ) as AchievementPart
    expect(soul.quests[0]!.alternatives?.map((quest) => quest.slug)).toEqual([
      'la-fatalidad',
      'el-destino',
      'la-rivalidad',
    ])
  })

  it('las notas entre los logros y el vídeo', () => {
    const cacao = guide('dofus-cacao')
    expect(cacao.parts.some((part) => part.type === 'note')).toBe(true)
    expect(cacao.video).toMatch(/^[\w-]{11}$/)
  })

  it('una guía paso a paso deja sus párrafos y capturas en el cuerpo', () => {
    const pinata = guide('piata-de-pino')
    expect(pinata.rewards).toEqual(['Piñata de pino'])
    expect(pinata.body.filter((item) => item.type === 'image')).toHaveLength(10)
    // En el orden de la rejilla de Torre: cada captura junto al texto que la explica.
    const paragraphs = pinata.body.filter((item) => item.type === 'paragraph')
    expect(paragraphs[0]).toMatchObject({
      segs: [{ t: 'text', v: expect.stringMatching(/^Allí encontrarás a Gobalden/) }],
    })
    for (const item of pinata.body) {
      if (item.type === 'image')
        expect(item.url).toMatch(/^https:\/\/images\.squarespace-cdn\.com\//)
    }
  })
})

describe('inline', () => {
  it('convierte la negrita y los enlaces de Torre en trozos', () => {
    expect(
      inline('Haz **primero** [[A la pesca|https://www.torrentearcano.com/a-la-pesca]].'),
    ).toEqual([
      { t: 'text', v: 'Haz ' },
      { t: 'text', v: 'primero', b: true },
      { t: 'text', v: ' ' },
      { t: 'link', v: 'A la pesca', href: '/a-la-pesca' },
      { t: 'text', v: '.' },
    ])
  })

  it('las coordenadas enlazadas a nada quedan como texto', () => {
    expect(inline('Ve a Valonia [[[38,-80]|#]] y habla')).toEqual([
      { t: 'text', v: 'Ve a Valonia [38,-80] y habla' },
    ])
  })
})
