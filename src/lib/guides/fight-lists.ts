// Los combates de las guías importadas (DESIGN.md, Monster chip and fight block). Squarespace
// los escribe como un párrafo que acaba en «lucha contra:» y una lista «1 x Ramán famélico»;
// aquí esa lista pasa a un bloque Combate con los monstruos de DofusDB. Código puro: lo usan
// el importador y el script que convierte las guías ya importadas.

type LexicalNode = { type?: string; text?: string; children?: LexicalNode[] }
type RichTextContent = { root: LexicalNode & { children?: LexicalNode[] } }

/** Un bloque del cuerpo tal como lo guarda Payload: solo se miran los textos y los pasos. */
export type FightListBlock = {
  blockType: string
  id?: string | null
  content?: unknown
  body?: FightListBlock[] | null
  [field: string]: unknown
}

/** El ID (de Payload) del monstruo con ese nombre, o undefined si no hay. */
export type MonsterLookup = (name: string) => number | undefined

export interface FightListsResult {
  body: FightListBlock[]
  /** Listas convertidas en bloques Combate. */
  converted: number
  /** Listas que se quedan en texto porque algún nombre no casa con un monstruo; los nombres. */
  unmatched: string[]
  unmatchedLists: number
  /** Listas detrás de «lucha contra» sin la forma «N x Nombre»: se quedan en texto. */
  skipped: number
}

// El párrafo que presenta el combate: «Vas a empezar una lucha contra:».
const INTRO = /lucha\s+contra\b[^.]*:\s*$/iu
// «1 x Ramán famélico.»: cantidad, x o ×, nombre y un punto, coma o punto y coma final opcional.
const ROW = /^(\d+)\s*[x×]\s*(.+?)[.,;]?$/u

/** Un nombre para comparar: NFC, minúsculas, un solo espacio y sin el punto final. */
export function comparableMonsterName(name: string): string {
  return name
    .normalize('NFC')
    .replace(/\s+/gu, ' ')
    .trim()
    .replace(/\.+$/u, '')
    .trim()
    .toLocaleLowerCase('es')
}

function plain(node: LexicalNode): string {
  if (node.type === 'text') return node.text ?? ''
  return (node.children ?? []).map(plain).join('')
}

type Rows = { name: string; quantity: number }[]

/** Las filas de una lista «N x Nombre», o null si alguna no tiene esa forma. */
function fightRows(list: LexicalNode): Rows | null {
  const items = list.children ?? []
  if (items.length === 0) return null
  const rows: Rows = []
  for (const listItem of items) {
    const match = ROW.exec(plain(listItem).replace(/\s+/gu, ' ').trim())
    if (!match) return null
    rows.push({ quantity: Number(match[1]), name: match[2]!.trim() })
  }
  return rows
}

function richText(children: LexicalNode[], from?: FightListBlock): FightListBlock {
  const content = (from?.content as RichTextContent | undefined)?.root
  const root = { ...(content ?? { type: 'root', version: 1 }), children }
  return { ...(from ?? { blockType: 'richText' }), content: { root } }
}

/**
 * Busca en el cuerpo (también dentro de los pasos) las listas que siguen a un párrafo que
 * acaba en «lucha contra:» y, si todas sus filas casan con un monstruo, parte ese texto en
 * lo de antes, un bloque Combate y lo de después. Si un nombre no casa, la lista entera se
 * queda en texto y el nombre se apunta. Repetirlo no cambia nada: la lista ya no está.
 */
export function splitFightLists(body: FightListBlock[], lookup: MonsterLookup): FightListsResult {
  const result: FightListsResult = {
    body: [],
    converted: 0,
    unmatched: [],
    unmatchedLists: 0,
    skipped: 0,
  }

  const splitText = (block: FightListBlock): FightListBlock[] => {
    const nodes = (block.content as RichTextContent | undefined)?.root?.children ?? []
    const out: FightListBlock[] = []
    let pending: LexicalNode[] = []
    let first = true
    const flush = () => {
      if (pending.length === 0) return
      // El primer trozo conserva el bloque original (su ID); los demás son nuevos.
      out.push(first ? richText(pending, block) : richText(pending))
      first = false
      pending = []
    }
    nodes.forEach((node, index) => {
      const previous = nodes[index - 1]
      const isFight =
        node.type === 'list' && previous?.type === 'paragraph' && INTRO.test(plain(previous))
      if (!isFight) {
        pending.push(node)
        return
      }
      const rows = fightRows(node)
      if (!rows) {
        result.skipped += 1
        pending.push(node)
        return
      }
      const ids = rows.map((row) => lookup(row.name))
      const missing = rows.filter((_, rowIndex) => ids[rowIndex] === undefined)
      if (missing.length > 0) {
        result.unmatchedLists += 1
        result.unmatched.push(...missing.map((row) => row.name))
        pending.push(node)
        return
      }
      flush()
      out.push({
        blockType: 'fight',
        monsters: rows.map((row, rowIndex) => ({
          monster: ids[rowIndex]!,
          quantity: row.quantity,
        })),
      })
      result.converted += 1
      first = false
    })
    flush()
    return out.length > 0 ? out : [block]
  }

  const walk = (blocks: FightListBlock[]): FightListBlock[] =>
    blocks.flatMap((block) => {
      if (block.blockType === 'richText') return splitText(block)
      if (block.blockType === 'step') return [{ ...block, body: walk(block.body ?? []) }]
      return [block]
    })

  result.body = walk(body)
  return result
}
