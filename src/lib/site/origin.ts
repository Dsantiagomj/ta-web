/** El origen público del sitio (el mismo que metadataBase), para las URL absolutas del JSON-LD. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(
  /\/+$/,
  '',
)
