// La base Postgres embebida que arranca `pnpm db:dev`. Puerto fijo fuera del 5432
// para no chocar con un Postgres instalado en la máquina.
export const DEV_DATABASE = {
  host: '127.0.0.1',
  port: 54329,
  user: 'postgres',
  password: 'postgres',
  database: 'torrente_arcano',
  // Base aparte para las pruebas E2E: se borra y se migra en cada ejecución.
  e2eDatabase: 'torrente_arcano_e2e',
  // Base aparte para las pruebas de integración: también se borra y se migra en cada ejecución.
  integrationDatabase: 'torrente_arcano_integration',
  dataDir: '.postgres/data',
} as const

export const DEV_DATABASE_URL = `postgres://${DEV_DATABASE.user}:${DEV_DATABASE.password}@${DEV_DATABASE.host}:${DEV_DATABASE.port}/${DEV_DATABASE.database}`

export const E2E_DATABASE_URL = `postgres://${DEV_DATABASE.user}:${DEV_DATABASE.password}@${DEV_DATABASE.host}:${DEV_DATABASE.port}/${DEV_DATABASE.e2eDatabase}`

export const INTEGRATION_DATABASE_URL = `postgres://${DEV_DATABASE.user}:${DEV_DATABASE.password}@${DEV_DATABASE.host}:${DEV_DATABASE.port}/${DEV_DATABASE.integrationDatabase}`
