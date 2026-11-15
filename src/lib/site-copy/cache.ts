// Caché de los textos del sitio (Ajustes del sitio, Portada e índices), como la de las
// páginas (src/lib/pages/cache.ts): lo que se guarda es lo leído de Postgres, con esta
// etiqueta. La caducan los hooks de los dos globales al guardar. Lo que se escribe fuera del
// servidor (pnpm seed:site-copy) se ve como mucho tras SITE_COPY_REVALIDATE segundos.

export const SITE_COPY_TAG = 'site-copy'

/** Diez minutos, como las guías y las páginas. */
export const SITE_COPY_REVALIDATE = 600
