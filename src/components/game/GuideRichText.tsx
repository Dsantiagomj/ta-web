import type { SerializedAutoLinkNode, SerializedLinkNode } from '@payloadcms/richtext-lexical'
import {
  type JSXConverterArgs,
  type JSXConvertersFunction,
  RichText,
} from '@payloadcms/richtext-lexical/react'
import type { ReactNode } from 'react'

import { Figure } from '@/components/ui/Figure'
import type { RichTextState } from '@/lib/guides/page'
import { mediaImageAsset } from '@/lib/media/image-asset'
import type { Media } from '@/payload-types'

import { CoordinatesText } from './Coordinates'

// Bits de formato de un nodo de texto de Lexical.
const BOLD = 1
const ITALIC = 1 << 1
const STRIKETHROUGH = 1 << 2
const UNDERLINE = 1 << 3
const CODE = 1 << 4
const SUBSCRIPT = 1 << 5
const SUPERSCRIPT = 1 << 6

type ParentChain = { type?: string; parent?: ParentChain } | undefined

function insideLink(parent: ParentChain): boolean {
  for (let node = parent; node; node = node.parent) {
    if (node.type === 'link' || node.type === 'autolink') return true
  }
  return false
}

/**
 * El texto con su formato. Cada [x,y] pasa a chip de coordenadas (DESIGN.md, Coordinates
 * chip), salvo dentro de un enlace o de código.
 */
function formattedText(text: string, format: number, parent: ParentChain): ReactNode {
  const plain = format & CODE || insideLink(parent)
  let node: ReactNode = plain ? text : <CoordinatesText>{text}</CoordinatesText>
  if (format & BOLD) node = <strong>{node}</strong>
  if (format & ITALIC) node = <em>{node}</em>
  if (format & STRIKETHROUGH) node = <s>{node}</s>
  if (format & UNDERLINE) node = <u>{node}</u>
  if (format & CODE) node = <code>{node}</code>
  if (format & SUBSCRIPT) node = <sub>{node}</sub>
  if (format & SUPERSCRIPT) node = <sup>{node}</sup>
  return node
}

/** Solo enlaces web, de correo o del propio sitio; cualquier otro protocolo se descarta. */
export function safeHref(url: unknown): string | null {
  if (typeof url !== 'string' || !url.trim()) return null
  const href = url.trim()
  if (href.startsWith('/') || href.startsWith('#')) return href.startsWith('//') ? null : href
  try {
    return ['http:', 'https:', 'mailto:'].includes(new URL(href).protocol) ? href : null
  } catch {
    return null
  }
}

interface LinkFields {
  url?: string
  newTab?: boolean
  linkType?: 'custom' | 'internal'
  doc?: { relationTo?: string; value?: unknown }
}

// Un enlace interno a otra guía lleva a su página; a cualquier otra cosa, todavía a nada.
function linkHref(fields: LinkFields): string | null {
  if (fields.linkType !== 'internal') return safeHref(fields.url)
  const value = fields.doc?.value
  if (fields.doc?.relationTo !== 'quest-guides' || !value || typeof value !== 'object') return null
  const slug = (value as { slug?: unknown }).slug
  return typeof slug === 'string' ? `/${slug}` : null
}

function converters(): JSXConvertersFunction {
  return ({ defaultConverters }) => {
    const link = ({
      node,
      nodesToJSX,
    }: JSXConverterArgs<SerializedLinkNode> | JSXConverterArgs<SerializedAutoLinkNode>) => {
      const fields = (node.fields ?? {}) as LinkFields
      const children = nodesToJSX({ nodes: node.children })
      const href = linkHref(fields)
      if (!href) return <>{children}</>
      return fields.newTab ? (
        <a href={href} rel="noopener noreferrer" target="_blank">
          {children}
        </a>
      ) : (
        <a href={href}>{children}</a>
      )
    }
    return {
      ...defaultConverters,
      text: ({ node, parent }) => formattedText(node.text, node.format ?? 0, parent),
      link,
      autolink: link,
      // El único h1 de la página es el título de la guía.
      heading: ({ node, nodesToJSX }) => {
        const Tag = node.tag === 'h1' ? 'h2' : node.tag
        return <Tag>{nodesToJSX({ nodes: node.children })}</Tag>
      },
      // Una imagen subida dentro del texto se pinta como las del bloque Imagen.
      upload: ({ node }) => {
        const media = node.value as Media | number
        const image = mediaImageAsset(media)
        if (!image || typeof media !== 'object') return null
        return <Figure image={image} alt={media.alt ?? ''} />
      },
      unknown: () => null,
    }
  }
}

/** Prosa de la guía (bloques Texto y Aviso), en el servidor: no manda JavaScript. */
export function GuideRichText({ content }: { content: RichTextState }) {
  return (
    <RichText
      data={content as Parameters<typeof RichText>[0]['data']}
      converters={converters()}
      disableContainer
      disableTextAlign
    />
  )
}
