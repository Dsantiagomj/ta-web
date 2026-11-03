import * as Sentry from '@sentry/nextjs'

// Sentry solo en el servidor (runtime de Node). No hay SDK de navegador
// (instrumentation-client.ts), ni replay ni feedback: las guías no llevan más JavaScript
// de cliente que el shell y Lighthouse vigila un presupuesto de 150 KB (AGENTS.md). Si
// más adelante hacen falta los errores del navegador, se puede cargar el SDK de
// navegador de forma diferida, fuera de las guías.
//
// Tampoco hay runtime edge: el proxy de Next 16 corre en Node y ninguna ruta pide edge.

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  // Import dinámico: la puerta de dev usa node:crypto y no debe entrar en otro runtime.
  const { sentryServerOptions } = await import('./lib/monitoring/sentry')
  const options = sentryServerOptions(process.env)
  // Sin DSN o fuera de dev y production (local, CI) no se inicia y nada sale del proceso.
  if (options) Sentry.init(options)
}

// Errores de componentes de servidor, rutas y el proxy. Sin Sentry.init no hace nada.
export const onRequestError = Sentry.captureRequestError
