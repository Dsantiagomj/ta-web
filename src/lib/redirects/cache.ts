// Caché de la colección redirects, como la de las páginas (src/lib/pages/cache.ts): lo que se
// guarda es la tabla entera leída de Postgres, con esta etiqueta. La caducan los hooks de la
// colección, que también escriben las filas que crea la web al cambiar una dirección.

export const REDIRECTS_TAG = 'redirects'

/** Diez minutos, como las páginas. */
export const REDIRECTS_REVALIDATE = 600
