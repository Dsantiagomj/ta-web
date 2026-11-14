import { describe, expect, it } from 'vitest'

import { soulMatches, soulQuery } from '@/lib/checklists/souls-search'
import { fold } from '@/lib/text/fold'

// El buscador del Ocre: un alma se busca por su monstruo, su mazmorra (solo los jefes tienen),
// su zona, su región o su nivel. Un número es un nivel o un trozo de texto; «100-150», un rango,
// y «100-» mientras se escribe, desde 100.

const boss = { search: fold('Mob Lasponja Castillo de Arena Playa de Arena Astrub'), level: 20 }
const archi = { search: fold('Pikopi Bosque de Amakna Amakna'), level: 55 }
const unknown = { search: fold('Sin datos'), level: null }
const numbered = { search: fold('Gelatina 300 La Gelexta Dimensión'), level: 60 }

const matches = (raw: string) =>
  [boss, archi, unknown, numbered].filter((soul) => soulMatches(soulQuery(raw), soul))

describe('el buscador de almas', () => {
  it('sin nada escrito, todas', () => {
    expect(soulQuery('  ')).toBeNull()
    expect(matches('')).toEqual([boss, archi, unknown, numbered])
  })

  it('por el monstruo, la mazmorra, la zona o la región, sin acentos ni mayúsculas', () => {
    expect(matches('LASPONJA')).toEqual([boss])
    expect(matches('castillo')).toEqual([boss])
    expect(matches('bosque de amakna')).toEqual([archi])
    expect(matches('Ástrub')).toEqual([boss])
  })

  it('un número es su nivel o un trozo del nombre o del sitio', () => {
    expect(matches('55')).toEqual([archi])
    expect(matches('300')).toEqual([numbered])
    expect(matches('60')).toEqual([numbered])
    expect(matches('5')).toEqual([])
    // Con «nv.» o «nivel» solo es un nivel.
    expect(matches('nv. 20')).toEqual([boss])
    expect(matches('Nivel 20')).toEqual([boss])
  })

  it('un rango de niveles, con guion o «a», en cualquier orden', () => {
    expect(matches('10-30')).toEqual([boss])
    expect(matches('10 – 60')).toEqual([boss, archi, numbered])
    expect(matches('60 a 10')).toEqual([boss, archi, numbered])
    // Un alma sin nivel no entra en ningún rango.
    expect(matches('0-200')).toEqual([boss, archi, numbered])
  })

  it('un rango a medio escribir es «desde»: no se queda sin almas mientras se teclea', () => {
    expect(matches('50-')).toEqual([archi, numbered])
    expect(matches('56 –')).toEqual([numbered])
    expect(matches('10 a')).toEqual([boss, archi, numbered])
  })
})
