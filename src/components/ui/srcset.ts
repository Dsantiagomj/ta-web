import type { ImageSource } from './types'

/**
 * El valor de srcset con descriptores w, o undefined si no hay al menos dos anchos entre los
 * que elegir: con uno solo basta el src.
 */
export function srcSetValue(sources: ImageSource[] | undefined): string | undefined {
  if (!sources || sources.length < 2) return undefined
  return sources.map(({ src, width }) => `${src} ${width}w`).join(', ')
}
