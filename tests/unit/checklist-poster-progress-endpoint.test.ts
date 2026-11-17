import { describe, expect, it } from 'vitest'

import { posterProgressResponse } from '@/endpoints/checklist-poster-progress'
import type { PosterProgressModel } from '@/lib/checklists/poster-progress'
import { POSTER_PROGRESS_URL } from '@/lib/checklists/poster-progress-url'

// GET /api/checklists/poster-progress: lo que pide el motor del porcentaje de cada cartel del
// índice. Solo lo pide quien tiene progreso guardado; va en caché del navegador, y lo comprime
// Next.

const models: PosterProgressModel[] = [{ kind: 'souls', slug: 'lista-ocre', souls: [1, 2] }]

describe('posterProgressResponse', () => {
  it('va en caché pública cinco minutos', () => {
    const response = posterProgressResponse(models)
    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=300, stale-while-revalidate=3600',
    )
  })

  it('es JSON, sin comprimir a mano', async () => {
    const response = posterProgressResponse(models)
    expect(response.headers.get('Content-Type')).toBe('application/json')
    expect(response.headers.get('Content-Encoding')).toBeNull()
    expect(await response.json()).toEqual(models)
  })

  it('la isla lo pide en /api/checklists/poster-progress', () => {
    expect(POSTER_PROGRESS_URL).toBe('/api/checklists/poster-progress')
  })
})
