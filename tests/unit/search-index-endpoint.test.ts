import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'

import { searchIndexResponse } from '@/endpoints/search-index'
import type { GuideSearchIndex } from '@/lib/search/guide-index'

// Next no comprime las respuestas de la API de Payload: el endpoint lo hace él.
const index: GuideSearchIndex = {
  guides: Array.from({ length: 50 }, (_, i) => [`Misión ${i}`, `mision-${i}`, 'Un logro', i]),
}

describe('la respuesta del índice de búsqueda', () => {
  it('va en gzip si el navegador lo acepta', async () => {
    const response = searchIndexResponse(index, 'gzip, deflate, br, zstd')
    expect(response.headers.get('content-encoding')).toBe('gzip')
    expect(response.headers.get('content-type')).toBe('application/json')
    expect(response.headers.get('vary')).toBe('Accept-Encoding')
    const body = Buffer.from(await response.arrayBuffer())
    expect(body.length).toBeLessThan(JSON.stringify(index).length / 2)
    expect(JSON.parse(gunzipSync(body).toString('utf8'))).toEqual(index)
  })

  it('sin gzip, va en JSON tal cual', async () => {
    for (const accept of [null, 'identity', 'gzip;q=0, br']) {
      const response = searchIndexResponse(index, accept)
      expect(response.headers.get('content-encoding'), String(accept)).toBeNull()
      expect(response.headers.get('vary')).toBe('Accept-Encoding')
      expect(await response.json()).toEqual(index)
    }
  })

  it('es público y cacheable', () => {
    const response = searchIndexResponse(index, 'gzip')
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe(
      'public, max-age=300, stale-while-revalidate=3600',
    )
  })
})
