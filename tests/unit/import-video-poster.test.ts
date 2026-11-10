import { describe, expect, it, vi } from 'vitest'

import { createPosterFetcher, posterUrl } from '../../scripts/import/dofus-guides/video-poster'

function fakeFetch(body: string, contentType: string, status = 200) {
  return vi.fn(async () => new Response(body, { status, headers: { 'content-type': contentType } }))
}

describe('portada de un vídeo de YouTube', () => {
  it('es la miniatura grande de YouTube, que se copia una vez al importar', () => {
    expect(posterUrl('ovPAxnBdKYQ')).toBe('https://i.ytimg.com/vi/ovPAxnBdKYQ/hqdefault.jpg')
  })

  it('descarga la miniatura con su tipo y un nombre con el ID del vídeo', async () => {
    const fetchFn = fakeFetch('jpg', 'image/jpeg')
    const file = await createPosterFetcher(fetchFn)('ovPAxnBdKYQ')
    expect(file).toMatchObject({
      mimetype: 'image/jpeg',
      name: 'video-ovPAxnBdKYQ.jpg',
      size: 3,
    })
    expect(fetchFn).toHaveBeenCalledWith(
      'https://i.ytimg.com/vi/ovPAxnBdKYQ/hqdefault.jpg',
      expect.objectContaining({ redirect: 'error' }),
    )
  })

  it('rechaza un ID que no es de YouTube sin hacer la petición', async () => {
    const fetchFn = fakeFetch('x', 'image/jpeg')
    await expect(createPosterFetcher(fetchFn)('../../evil')).rejects.toThrow(/no válido/)
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('rechaza una respuesta que no es una imagen o con error HTTP', async () => {
    await expect(
      createPosterFetcher(fakeFetch('<html>', 'text/html'))('ovPAxnBdKYQ'),
    ).rejects.toThrow(/no es una imagen/)
    await expect(
      createPosterFetcher(fakeFetch('', 'text/plain', 404))('ovPAxnBdKYQ'),
    ).rejects.toThrow(/404/)
  })
})
