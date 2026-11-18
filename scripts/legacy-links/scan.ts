// Los enlaces que guarda un documento, leídos con el esquema de su colección: los nodos de
// enlace de cada texto rico (Lexical) y los campos de texto que son un enlace (`url`, `link`,
// `href`, `legacyHref`). Lo demás no se pinta como enlace aunque lleve una URL (el título, la
// URL de siempre de una guía importada, la instantánea de la importación). Código puro: lo usa
// pnpm links:legacy (scripts/links-legacy.ts).
import type { Block, Field } from 'payload'

/** Los nombres de los campos de texto que el sitio pinta como enlace. */
const LINK_FIELDS = new Set(['url', 'link', 'href', 'legacyHref'])

export interface FoundLink {
  href: string
  /** Dónde está, con las filas contadas desde 1: «body.3.content», «checklist.url». */
  field: string
  /** El objeto que guarda el campo: sus hermanos dicen si el enlace se pinta. */
  parent: Record<string, unknown>
}

type Json = Record<string, unknown>
type Blocks = (slug: string) => Block | undefined

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const join = (path: string, key: string | number) => (path ? `${path}.${key}` : String(key))

/** Las URL de los nodos `link` y `autolink` de un texto rico, estén donde estén. */
function lexicalLinks(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) lexicalLinks(item, out)
  } else if (isObject(value)) {
    const fields = value.fields
    if (
      (value.type === 'link' || value.type === 'autolink') &&
      isObject(fields) &&
      fields.linkType !== 'internal' &&
      typeof fields.url === 'string' &&
      fields.url.trim()
    ) {
      out.push(fields.url)
    }
    for (const child of Object.values(value)) lexicalLinks(child, out)
  }
  return out
}

/** Los bloques de un campo blocks, incluidos los que se citan por slug (blockReferences). */
function fieldBlocks(field: Field, blocks: Blocks): Block[] {
  if (field.type !== 'blocks') return []
  const refs = (field.blockReferences ?? []).flatMap((ref) =>
    typeof ref === 'string' ? (blocks(ref) ?? []) : [ref],
  )
  return [...field.blocks, ...refs]
}

/** Los enlaces de un documento (o de un trozo, con sus campos), en el orden del esquema. */
export function scanLinks(
  fields: readonly Field[],
  data: unknown,
  { path = '', blocks = () => undefined }: { path?: string; blocks?: Blocks } = {},
): FoundLink[] {
  if (!isObject(data)) return []
  const found: FoundLink[] = []
  for (const field of fields) {
    const named = 'name' in field && typeof field.name === 'string' ? field.name : null
    const value = named ? data[named] : data
    const here = named ? join(path, named) : path
    switch (field.type) {
      case 'richText':
        for (const href of lexicalLinks(value)) found.push({ href, field: here, parent: data })
        break
      case 'text':
        if (named && LINK_FIELDS.has(named) && typeof value === 'string' && value.trim()) {
          found.push({ href: value.trim(), field: here, parent: data })
        }
        break
      case 'group':
      case 'row':
      case 'collapsible':
        found.push(...scanLinks(field.fields, value, { path: here, blocks }))
        break
      case 'tabs':
        for (const tab of field.tabs) {
          const tabName = 'name' in tab && tab.name ? tab.name : null
          found.push(
            ...scanLinks(tab.fields, tabName ? data[tabName] : data, {
              path: tabName ? join(path, tabName) : path,
              blocks,
            }),
          )
        }
        break
      case 'array':
        if (Array.isArray(value)) {
          value.forEach((row, index) => {
            found.push(...scanLinks(field.fields, row, { path: join(here, index + 1), blocks }))
          })
        }
        break
      case 'blocks':
        if (Array.isArray(value)) {
          const byType = new Map(fieldBlocks(field, blocks).map((block) => [block.slug, block]))
          value.forEach((row, index) => {
            const block = isObject(row) ? byType.get(String(row.blockType)) : undefined
            if (block) {
              found.push(...scanLinks(block.fields, row, { path: join(here, index + 1), blocks }))
            }
          })
        }
        break
      default:
        break
    }
  }
  return found
}

/** Si unos campos pueden guardar un enlace: un texto rico o un campo de enlace, a cualquier nivel. */
export function hasLinkFields(fields: readonly Field[], blocks: Blocks = () => undefined): boolean {
  return fields.some((field) => {
    switch (field.type) {
      case 'richText':
        return true
      case 'text':
        return LINK_FIELDS.has(field.name)
      case 'group':
      case 'row':
      case 'collapsible':
      case 'array':
        return hasLinkFields(field.fields, blocks)
      case 'tabs':
        return field.tabs.some((tab) => hasLinkFields(tab.fields, blocks))
      case 'blocks':
        return fieldBlocks(field, blocks).some((block) => hasLinkFields(block.fields, blocks))
      default:
        return false
    }
  })
}
