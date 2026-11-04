import { convertHTMLToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import type { SanitizedConfig } from 'payload'

import type { RichTextBlock } from '@/payload-types'

import { parseHtml } from './squarespace/dom'

/** El valor de un campo richText, con la forma que generan los tipos de Payload. */
export type LexicalState = RichTextBlock['content']

// convertHTMLToLexical pide un constructor con la forma de JSDOM; happy-dom ya viene
// con @lexical/headless y parsea sin ejecutar nada (ver squarespace/dom.ts).
class HappyDomAsJsdom {
  window: { document: Document }
  constructor(html: string) {
    this.window = { document: parseHtml(html) }
  }
}

/** Conversor de HTML a Lexical con el editor de la configuración de Payload. */
export async function createHtmlToLexical(
  config: SanitizedConfig,
): Promise<(html: string) => LexicalState> {
  const editorConfig = await editorConfigFactory.default({ config })
  return (html) =>
    convertHTMLToLexical({ editorConfig, html, JSDOM: HappyDomAsJsdom }) as unknown as LexicalState
}
