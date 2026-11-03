import { describe, expect, it } from 'vitest'

import nextConfig from '../../next.config'

describe('next.config', () => {
  it('no añade a las páginas las metas de traza de Sentry: no hay SDK de navegador', () => {
    expect(nextConfig.experimental?.clientTraceMetadata).toBeUndefined()
  })
})
