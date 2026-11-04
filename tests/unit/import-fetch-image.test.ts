import { describe, expect, it, vi } from 'vitest'

import { createImageFetcher } from '../../scripts/import/squarespace/fetch-image'

const URL_OK = 'https://images.squarespace-cdn.com/content/v1/abc/Captura+1.png'

function fakeFetch(body: string, contentType: string, status = 200) {
  return vi.fn(async () => new Response(body, { status, headers: { 'content-type': contentType } }))
}

describe('descarga de imágenes de Squarespace', () => {
  it('descarga una imagen del CDN de Squarespace con su nombre y tipo', async () => {
    const fetchFn = fakeFetch('png', 'image/png')
    const file = await createImageFetcher(fetchFn)(URL_OK)
    expect(file).toMatchObject({ mimetype: 'image/png', name: 'Captura 1.png', size: 3 })
    // Sin seguir redirecciones: una redirección podría llevar a otro host.
    expect(fetchFn).toHaveBeenCalledWith(URL_OK, expect.objectContaining({ redirect: 'error' }))
  })

  it.each([
    ['http, no https', 'http://images.squarespace-cdn.com/a.png'],
    ['otro dominio', 'https://evil.example.com/a.png'],
    ['una IP interna', 'https://169.254.169.254/latest/meta-data'],
    ['localhost', 'https://localhost:3000/a.png'],
    ['un subdominio parecido', 'https://images.squarespace-cdn.com.evil.com/a.png'],
  ])('rechaza %s sin hacer la petición', async (_, url) => {
    const fetchFn = fakeFetch('x', 'image/png')
    await expect(createImageFetcher(fetchFn)(url)).rejects.toThrow(/no permitida/)
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('rechaza una respuesta que no es una imagen', async () => {
    const fetchFn = fakeFetch('<html>', 'text/html; charset=utf-8')
    await expect(createImageFetcher(fetchFn)(URL_OK)).rejects.toThrow(/no es una imagen/)
  })

  it('rechaza una respuesta con error HTTP', async () => {
    const fetchFn = fakeFetch('', 'text/plain', 404)
    await expect(createImageFetcher(fetchFn)(URL_OK)).rejects.toThrow(/404/)
  })
})
