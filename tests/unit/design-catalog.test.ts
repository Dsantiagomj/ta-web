import { describe, expect, it } from 'vitest'

import { isDesignCatalogEnabled } from '@/lib/dev-gate/design-catalog'

describe('isDesignCatalogEnabled', () => {
  it('abre /sistema en desarrollo local', () => {
    expect(isDesignCatalogEnabled({ NODE_ENV: 'development' })).toBe(true)
  })

  it('abre /sistema en el entorno dev, que está detrás de la puerta de basic auth', () => {
    expect(isDesignCatalogEnabled({ NODE_ENV: 'production', APP_ENV: 'dev' })).toBe(true)
    expect(
      isDesignCatalogEnabled({ NODE_ENV: 'production', RAILWAY_ENVIRONMENT_NAME: 'dev' }),
    ).toBe(true)
  })

  it('abre /sistema en las pruebas E2E, que corren el build de producción', () => {
    expect(isDesignCatalogEnabled({ NODE_ENV: 'production', E2E_DESIGN_CATALOG: '1' })).toBe(true)
  })

  it('da 404 en producción y con cualquier otro valor', () => {
    expect(isDesignCatalogEnabled({ NODE_ENV: 'production' })).toBe(false)
    expect(isDesignCatalogEnabled({ NODE_ENV: 'production', APP_ENV: 'production' })).toBe(false)
    expect(isDesignCatalogEnabled({ NODE_ENV: 'production', E2E_DESIGN_CATALOG: 'true' })).toBe(
      false,
    )
    expect(isDesignCatalogEnabled({ NODE_ENV: 'test' })).toBe(false)
    expect(isDesignCatalogEnabled({})).toBe(false)
  })
})
