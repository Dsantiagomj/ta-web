import path from 'node:path'

import type { FetchImage, ImageFile } from '../load-quest-guides'

// Las URL vienen del HTML de Squarespace, que no es de fiar: solo se descarga del CDN
// de imágenes (el único que usan las 21 618 imágenes del inventario) y por https.
const IMAGE_HOSTS = new Set(['images.squarespace-cdn.com'])

const ORIGINAL_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}

/** Descarga imágenes del CDN de Squarespace; rechaza cualquier otra URL o respuesta. */
export function createImageFetcher(fetchFn: typeof fetch = fetch): FetchImage {
  return async (src: string): Promise<ImageFile> => {
    let url: URL
    try {
      url = new URL(src)
    } catch {
      throw new Error(`URL de imagen no permitida: ${src}`)
    }
    if (url.protocol !== 'https:' || !IMAGE_HOSTS.has(url.hostname) || url.port) {
      throw new Error(`URL de imagen no permitida: ${src}`)
    }
    // El CDN sirve WebP a quien lo acepte, también con */*. Pidiendo solo el tipo de la
    // extensión devuelve el archivo original, que es el que se guarda.
    const accept = ORIGINAL_TYPES[path.extname(url.pathname).toLowerCase()] ?? 'image/*'
    const response = await fetchFn(src, {
      headers: { accept },
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
    // Squarespace codifica los espacios del nombre como "+".
    const name = decodeURIComponent(path.basename(url.pathname).replace(/\+/g, ' '))
    return { data, mimetype, name, size: data.length }
  }
}
