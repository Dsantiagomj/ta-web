// Lo que comparten los scripts que leen las páginas de logro de Torre en Squarespace
// (import-achievement-prose.ts e import-alignment-achievements.ts): leer una página, cacheada o
// descargada, y lo que la carga de la prosa necesita para subir capturas y portadas.
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Payload } from 'payload'

import { createPosterFetcher, posterUrl } from '../dofus-guides/video-poster'
import { mediaByUrl } from '../media-by-url'
import { createHtmlToLexical } from '../rich-text'
import { createImageFetcher } from '../squarespace/fetch-image'
import type { LoadProseOptions } from './load-prose'

const SITE = 'https://www.torrentearcano.com'

/**
 * El HTML de la página de Squarespace de un slug, o null si no la hay: de <from>/<slug>.html
 * (las páginas cacheadas del rastreo) o, sin from, descargada de la web de Torre.
 */
export function squarespacePageReader(from: string | null) {
  return async (slug: string): Promise<string | null> => {
    if (from) {
      try {
        return await readFile(path.join(from, `${slug}.html`), 'utf8')
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
        throw error
      }
    }
    const response = await fetch(`${SITE}/${slug}`, {
      headers: { 'User-Agent': 'ta-web/importacion' },
      signal: AbortSignal.timeout(30_000),
    })
    if (response.status === 404) return null
    if (!response.ok) throw new Error(`${SITE}/${slug} respondió ${response.status}`)
    return response.text()
  }
}

/**
 * Cómo pasa la prosa a Lexical y a Media: las capturas desde el CDN de Squarespace y las
 * portadas desde YouTube, una vez (si ya están por su URL de origen, se reutilizan). Una
 * descarga fallida (ImageDownloadError) la anota la carga; cualquier otro error para.
 */
export async function proseMedia(
  payload: Payload,
): Promise<Pick<LoadProseOptions, 'htmlToLexical' | 'mediaFor' | 'posterFor'>> {
  const images = mediaByUrl(payload, createImageFetcher())
  const fetchPoster = createPosterFetcher()
  const posters = mediaByUrl(payload, (url) => fetchPoster(url.split('/vi/')[1]!.split('/')[0]!))
  return {
    htmlToLexical: await createHtmlToLexical(payload.config),
    mediaFor: images,
    posterFor: (videoId, options) => posters(posterUrl(videoId), 'Portada del vídeo', options),
  }
}
