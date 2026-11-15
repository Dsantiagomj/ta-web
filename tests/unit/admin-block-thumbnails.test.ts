import config from '@payload-config'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { Block, Field, SanitizedConfig } from 'payload'
import sharp from 'sharp'
import { beforeAll, describe, expect, it } from 'vitest'

import {
  BLOCK_THUMBNAIL_DIR,
  BLOCK_THUMBNAIL_SIZE,
  blockThumbnails,
} from '@/lib/admin/block-thumbnails'

// Cada bloque que Torre puede añadir en el panel enseña en el selector cómo se ve en la web
// (pnpm panel:block-thumbs, desde el catálogo /sistema). Sin miniatura, Payload pinta un
// recuadro vacío y todos los bloques parecen iguales.

const PUBLIC = join(process.cwd(), 'public')
// Una miniatura pesa poco: el selector carga todas a la vez.
const MAX_BYTES = 20_000

type Images = { icon?: { url: string; alt?: string } | string; thumbnail?: unknown }
type RichTextEditor = {
  editorConfig?: {
    resolvedFeatureMap?: Map<
      string,
      { sanitizedServerFeatureProps?: { blocks?: Block[]; inlineBlocks?: Block[] } }
    >
  }
}

/** Los bloques de Lexical de un campo de texto enriquecido (BlocksFeature). */
function lexicalBlocks(editor: unknown): Block[] {
  const feature = (editor as RichTextEditor | undefined)?.editorConfig?.resolvedFeatureMap?.get(
    'blocks',
  )
  const props = feature?.sanitizedServerFeatureProps
  return [...(props?.blocks ?? []), ...(props?.inlineBlocks ?? [])]
}

type Found = { block: Block; lexical: boolean }

/**
 * Todos los bloques que alcanza una lista de campos, los de dentro de otros bloques incluidos.
 * lexical: el bloque va dentro de un texto enriquecido, no en un campo de bloques.
 */
function blocksIn(fields: Field[]): Found[] {
  const found = (block: Block, lexical: boolean): Found[] => [
    { block, lexical },
    ...blocksIn(block.fields),
  ]
  return fields.flatMap((field): Found[] => {
    if (field.type === 'blocks') {
      return field.blocks
        .filter((block): block is Block => typeof block === 'object')
        .flatMap((block) => found(block, false))
    }
    if (field.type === 'richText') {
      return lexicalBlocks(field.editor).flatMap((block) => found(block, true))
    }
    if (field.type === 'tabs') return field.tabs.flatMap((tab) => blocksIn(tab.fields))
    if ('fields' in field && Array.isArray(field.fields)) return blocksIn(field.fields)
    return []
  })
}

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => join(entry.parentPath, entry.name))
}

/** Los slugs de cada `const X: Block = { … }` escrito en src. */
function declaredBlockSlugs(): string[] {
  return filesUnder(join(process.cwd(), 'src')).flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(/:\s*Block\s*=\s*\{[^]*?\bslug:\s*'([^']+)'/g)].map(
      (match) => match[1]!,
    ),
  )
}

const imagesOf = (block: Block) => (block.admin?.images ?? {}) as Images
const publicFile = (url: string) => join(PUBLIC, url)

let blocks: Map<string, Block>
let lexical: Set<string>

beforeAll(async () => {
  const sanitized: SanitizedConfig = await config
  const all = [
    ...(sanitized.blocks ?? []).map((block) => ({ block, lexical: false })),
    ...sanitized.collections.flatMap((collection) => blocksIn(collection.fields)),
    ...sanitized.globals.flatMap((global) => blocksIn(global.fields)),
  ]
  blocks = new Map(all.map(({ block }) => [block.slug, block]))
  lexical = new Set(all.filter((entry) => entry.lexical).map(({ block }) => block.slug))
})

describe('las miniaturas de los bloques del panel', () => {
  it('encuentra los bloques de las guías, los de Dofus y el vídeo de las páginas de logro', () => {
    for (const slug of ['richText', 'step', 'proseVideo', 'needItem', 'dofusAchievement']) {
      expect([...blocks.keys()]).toContain(slug)
    }
  })

  it('no se deja ningún bloque declarado en src fuera de la cuenta', () => {
    const declared = declaredBlockSlugs()
    expect(declared.length).toBeGreaterThan(0)
    for (const slug of declared) expect([...blocks.keys()], slug).toContain(slug)
  })

  it('cada bloque tiene su miniatura con un texto alternativo en español', () => {
    for (const [slug, block] of blocks) {
      const thumbnail = imagesOf(block).thumbnail as { url?: string; alt?: string } | undefined
      expect(thumbnail?.url, `${slug}: sin miniatura`).toBe(`${BLOCK_THUMBNAIL_DIR}/${slug}.webp`)
      expect(thumbnail?.alt, `${slug}: sin texto alternativo`).toBe(blockThumbnails[slug as never])
      expect(thumbnail?.alt?.length ?? 0, slug).toBeGreaterThan(10)
      // La forma antigua de Payload, que ya no usa: una sola fuente de verdad.
      expect(block.imageURL, slug).toBeUndefined()
    }
  })

  it('el archivo de cada miniatura existe: WebP de 3:2, del tamaño fijo y ligero', async () => {
    for (const slug of blocks.keys()) {
      const file = publicFile(`${BLOCK_THUMBNAIL_DIR}/${slug}.webp`)
      expect(existsSync(file), `${slug}: falta ${file}`).toBe(true)
      const meta = await sharp(file).metadata()
      expect(meta.format, slug).toBe('webp')
      expect({ width: meta.width, height: meta.height }, slug).toEqual(BLOCK_THUMBNAIL_SIZE)
      expect(statSync(file).size, `${slug}: pesa demasiado`).toBeLessThanOrEqual(MAX_BYTES)
    }
  })

  it('la lista de miniaturas y los archivos son justo los de los bloques, sin sobrantes', () => {
    expect(Object.keys(blockThumbnails).sort()).toEqual([...blocks.keys()].sort())
    const files = readdirSync(publicFile(BLOCK_THUMBNAIL_DIR)).filter((name) =>
      name.endsWith('.webp'),
    )
    expect(files.sort()).toEqual([...blocks.keys()].map((slug) => `${slug}.webp`).sort())
  })

  it('los bloques de Lexical llevan además un icono cuadrado para el menú del editor', () => {
    // Sin icono, Lexical encoge la miniatura de 3:2 a 20 px en su menú.
    expect([...lexical]).toContain('proseVideo')
    for (const slug of lexical) {
      const icon = imagesOf(blocks.get(slug)!).icon
      const url = typeof icon === 'string' ? icon : icon?.url
      expect(url, `${slug}: sin icono`).toBe(`${BLOCK_THUMBNAIL_DIR}/${slug}-icono.svg`)
      const svg = readFileSync(publicFile(url!), 'utf8')
      expect(svg, slug).toMatch(/viewBox="0 0 (\d+) \1"/)
    }
  })
})
