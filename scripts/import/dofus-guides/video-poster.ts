// La portada del vídeo de una guía de Dofus: la miniatura de YouTube, copiada una vez a Media
// al importar. La página nunca la pide a YouTube (DESIGN.md, Video facade).
import type { ImageFile } from '../load-quest-guides'

const YOUTUBE_ID = /^[\w-]{11}$/

/** La miniatura grande de un vídeo; hqdefault existe siempre, maxresdefault no. */
export const posterUrl = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

/** Descarga la miniatura de un vídeo de YouTube; rechaza cualquier otro ID o respuesta. */
export function createPosterFetcher(fetchFn: typeof fetch = fetch) {
  return async (videoId: string): Promise<ImageFile> => {
    if (!YOUTUBE_ID.test(videoId)) throw new Error(`ID de vídeo no válido: ${videoId}`)
    const response = await fetchFn(posterUrl(videoId), {
      // Una redirección podría llevar a otro host: no se sigue.
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const mimetype = response.headers.get('content-type')?.split(';')[0]?.trim() ?? ''
    if (!mimetype.startsWith('image/')) {
      throw new Error(`La respuesta no es una imagen (${mimetype || 'sin tipo'})`)
    }
    const data = Buffer.from(await response.arrayBuffer())
    return { data, mimetype, name: `video-${videoId}.jpg`, size: data.length }
  }
}
