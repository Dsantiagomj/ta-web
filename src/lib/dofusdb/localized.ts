import type { LocalizedText } from './types'

// Solo español al lanzar; el francés es el idioma original de DofusDB y cubre los huecos.
export function spanish(text: LocalizedText | null | undefined): string | null {
  return text?.es || text?.fr || null
}
