import { describe, expect, it } from 'vitest'

import { searchIndexResponse } from '@/endpoints/search-index'
import type { SearchIndex } from '@/lib/search/guide-index'

// El endpoint responde JSON tal cual: lo comprime Next, como cualquier respuesta. Desde Next
// 16.4.5 una cabecera Content-Encoding puesta a mano se descarta y el navegador recibiría gzip
// presentado como JSON.
const index: SearchIndex = {
  guides: Array.from({ length: 50 }, (_, i) => [`Misión ${i}`, `mision-${i}`, 'Un logro', i]),
}

describe('la respuesta del índice de búsqueda', () => {
  it('es el índice en JSON, sin comprimir a mano', async () => {
    const response = searchIndexResponse(index)
    expect(response.headers.get('content-type')).toBe('application/json')
    expect(response.headers.get('content-encoding')).toBeNull()
    expect(await response.json()).toEqual(index)
  })

  it('es público y cacheable', () => {
    const response = searchIndexResponse(index)
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe(
      'public, max-age=300, stale-while-revalidate=3600',
    )
  })
})
