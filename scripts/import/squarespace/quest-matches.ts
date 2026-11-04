export interface QuestMatch {
  questIds: number[]
  ambiguous: boolean
}

/** Filas de un CSV con comillas dobles (RFC 4180): comas y comillas escapadas dentro. */
function csvRows(csv: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index]
    if (quoted) {
      if (char === '"' && csv[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (char === '"') quoted = false
      else field += char
    } else if (char === '"') quoted = true
    else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && csv[index + 1] === '\n') index += 1
      row.push(field)
      if (row.some(Boolean)) rows.push(row)
      row = []
      field = ''
    } else field += char
  }
  row.push(field)
  if (row.some(Boolean)) rows.push(row)
  return rows
}

/**
 * Lee `out/quest_matches.csv` del inventario de la migración: por slug, los IDs de
 * DofusDB que le corresponden (separados por espacios) y si el cruce es ambiguo.
 */
export function parseQuestMatches(csv: string): Map<string, QuestMatch> {
  const [header = [], ...rows] = csvRows(csv)
  const column = (name: string) => header.indexOf(name)
  const [slug, questIds, ambiguous] = [column('slug'), column('quest_ids'), column('ambiguous')]
  return new Map(
    rows.map((row) => [
      row[slug]!,
      {
        questIds: (row[questIds] ?? '').split(/\s+/).filter(Boolean).map(Number),
        ambiguous: row[ambiguous] === 'True',
      },
    ]),
  )
}
