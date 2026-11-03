import { withPayload } from '@payloadcms/next/withPayload'
import { withSentryConfig } from '@sentry/nextjs/config'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  // AGENTS.md es nuestro contrato, escrito a mano; next dev no debe añadirle su bloque.
  agentRules: false,
  // Las variantes AVIF y WebP se generan antes de importar; la app nunca optimiza imágenes al vuelo.
  images: {
    unoptimized: true,
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN?.trim() || undefined

// Sentry solo en el servidor (src/instrumentation.ts). Sin SENTRY_AUTH_TOKEN no se suben
// mapas de código: el build no habla con Sentry y no hace falta ninguna variable suya.
const config = withSentryConfig(withPayload(nextConfig, { devBundleServerPackages: false }), {
  org: 'dsmjdev',
  project: 'ta-web',
  sentryUrl: 'https://us.sentry.io',
  authToken: sentryAuthToken,
  sourcemaps: { disable: !sentryAuthToken },
  // Sin SDK de navegador: el manifiesto de rutas solo serviría al cliente y listaría /admin.
  routeManifestInjection: false,
  // El plugin no envía a Sentry sus propios errores ni tiempos de compilación.
  telemetry: false,
  silent: !process.env.CI,
})

// withSentryConfig añade las metas sentry-trace y baggage a cada página para que el SDK de
// navegador continúe la traza. Sin ese SDK no sirven y publicarían la clave del DSN.
delete config.experimental?.clientTraceMetadata

export default config
