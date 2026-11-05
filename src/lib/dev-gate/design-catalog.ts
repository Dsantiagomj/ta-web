import { isDevEnvironment } from './dev-gate'

type Env = Record<string, string | undefined>

/**
 * El catálogo de componentes (/sistema, DESIGN.md, Component catalog) solo existe en
 * desarrollo local, en el entorno dev (detrás de la puerta de basic auth) y en las
 * pruebas E2E, que corren el build de producción con E2E_DESIGN_CATALOG=1. En
 * producción responde 404.
 */
export function isDesignCatalogEnabled(env: Env): boolean {
  return env.NODE_ENV === 'development' || isDevEnvironment(env) || env.E2E_DESIGN_CATALOG === '1'
}
