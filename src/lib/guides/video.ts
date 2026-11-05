// Vídeos de las guías (DESIGN.md, Video facade): solo YouTube. El reproductor se carga
// del dominio sin cookies y solo al pulsar.

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtube-nocookie.com',
  'youtube-nocookie.com',
])

// Los ID de YouTube tienen 11 caracteres de este alfabeto.
const VIDEO_ID = /^[\w-]{11}$/

/** El ID de un vídeo de YouTube a partir de la URL que Torre pega, o null. */
export function youtubeId(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (!YOUTUBE_HOSTS.has(parsed.hostname)) return null

  const path = parsed.pathname.split('/').filter(Boolean)
  const candidate =
    parsed.hostname === 'youtu.be'
      ? path[0]
      : path[0] === 'watch'
        ? parsed.searchParams.get('v')
        : ['embed', 'shorts'].includes(path[0] ?? '')
          ? path[1]
          : null
  return candidate && VIDEO_ID.test(candidate) ? candidate : null
}

export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`
}

export function youtubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`
}
