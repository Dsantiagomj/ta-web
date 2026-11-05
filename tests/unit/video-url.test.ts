import { describe, expect, it } from 'vitest'

import { youtubeEmbedUrl, youtubeId } from '@/lib/guides/video'

describe('youtubeId', () => {
  it('saca el ID de las URLs de YouTube que se pegan en el panel', () => {
    for (const url of [
      'https://www.youtube.com/watch?v=VaY3tyYTq4A',
      'https://youtube.com/watch?v=VaY3tyYTq4A&t=42s',
      'https://m.youtube.com/watch?v=VaY3tyYTq4A',
      'https://youtu.be/VaY3tyYTq4A?si=abc',
      'https://www.youtube.com/embed/VaY3tyYTq4A',
      'https://www.youtube-nocookie.com/embed/VaY3tyYTq4A',
      'https://www.youtube.com/shorts/VaY3tyYTq4A',
    ]) {
      expect(youtubeId(url), url).toBe('VaY3tyYTq4A')
    }
  })

  it('no da ID para otros sitios ni para URLs rotas', () => {
    for (const url of [
      'https://vimeo.com/123456',
      'https://www.youtube.com/channel/UC123',
      'https://www.youtube.com/watch?v=corto',
      'https://evil.example/watch?v=VaY3tyYTq4A',
      'no es una url',
      '',
    ]) {
      expect(youtubeId(url), url).toBeNull()
    }
  })
})

describe('youtubeEmbedUrl', () => {
  it('usa el dominio sin cookies y arranca el vídeo al cargar el reproductor', () => {
    expect(youtubeEmbedUrl('VaY3tyYTq4A')).toBe(
      'https://www.youtube-nocookie.com/embed/VaY3tyYTq4A?autoplay=1',
    )
  })
})
