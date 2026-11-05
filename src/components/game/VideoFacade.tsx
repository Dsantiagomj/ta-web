import { Picture } from '@/components/ui/Picture'
import type { ImageAsset } from '@/components/ui/types'
import { youtubeEmbedUrl, youtubeId, youtubeWatchUrl } from '@/lib/guides/video'

import './game.css'
import { gameStrings } from './strings'

const s = gameStrings.video

/**
 * Vídeo sin código de terceros hasta pulsar (DESIGN.md, Video facade). Sin JavaScript es
 * un enlace al vídeo en YouTube; con PageEnhancements, el clic lo cambia por el
 * reproductor de youtube-nocookie.com. La portada es nuestra, nunca de i.ytimg.com.
 */
export function VideoFacade({
  url,
  title,
  poster,
}: {
  url: string
  title: string
  poster?: ImageAsset
}) {
  const id = youtubeId(url)
  if (!id) {
    return (
      <p>
        <a href={url}>{title}</a>
      </p>
    )
  }
  return (
    <figure>
      <div className="video__frame">
        <a
          className="video__link"
          href={youtubeWatchUrl(id)}
          data-video-embed={youtubeEmbedUrl(id)}
          data-video-title={title}
          aria-label={s.watch(title)}
        >
          {poster ? (
            <Picture image={poster} alt="" className="video__poster" />
          ) : (
            <span className="video__title">{title}</span>
          )}
          <span className="video__badge" aria-hidden="true" />
        </a>
      </div>
      <figcaption className="mt-2.5 text-sm text-muted">
        {title} · {s.source}
      </figcaption>
    </figure>
  )
}
