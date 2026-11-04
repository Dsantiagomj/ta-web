import { describe, expect, it } from 'vitest'

import { parseQuestMatches } from '../../scripts/import/squarespace/quest-matches'

const CSV = [
  'slug,title,matched_by,quest_ids,quest_names,ambiguous,in_guides_json',
  'el-cazador-cazado,El cazador cazado,slug+title,1977,El cazador cazado,False,False',
  'dos-misiones,"Uno, dos",title,10 11,"Uno, dos|Otra",False,False',
  'ambigua,Ambigua,title,20 21,A|B,True,False',
  'operacion-envenenamiento,Operación «envenenamiento»,,,,False,False',
  '',
].join('\n')

describe('cruce de páginas con misiones de DofusDB', () => {
  it('lee los IDs de DofusDB de cada slug, con comas entre comillas', () => {
    const matches = parseQuestMatches(CSV)
    expect(matches.get('el-cazador-cazado')).toEqual({ questIds: [1977], ambiguous: false })
    expect(matches.get('dos-misiones')).toEqual({ questIds: [10, 11], ambiguous: false })
    expect(matches.get('operacion-envenenamiento')).toEqual({ questIds: [], ambiguous: false })
  })

  it('marca los cruces ambiguos', () => {
    expect(parseQuestMatches(CSV).get('ambigua')).toEqual({ questIds: [20, 21], ambiguous: true })
  })

  it('un slug que no está no tiene cruce', () => {
    expect(parseQuestMatches(CSV).get('no-existe')).toBeUndefined()
  })

  it('acepta la cabecera con BOM', () => {
    const matches = parseQuestMatches('\uFEFFslug,quest_ids,ambiguous\nla-mision,42,False\n')
    expect(matches.get('la-mision')).toEqual({ questIds: [42], ambiguous: false })
  })

  it('falla con un mensaje claro si falta una columna obligatoria', () => {
    expect(() => parseQuestMatches('pagina,quest_ids,ambiguous\nla-mision,42,False\n')).toThrow(
      /slug/,
    )
  })
})
