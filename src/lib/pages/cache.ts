// Caché de las páginas sueltas (emotes, cómo llegar a un sitio, textos legales), como la de
// las guías de Dofus (src/lib/dofus-guides/cache.ts): lo que se guarda es lo leído de
// Postgres, con esta etiqueta. La caducan los hooks de las páginas y de Media (las imágenes
// de su cuerpo). Lo que se escribe fuera del servidor (la importación) se ve como mucho tras
// PAGES_REVALIDATE segundos.

export const PAGES_TAG = 'pages'

/** Diez minutos, como las guías y los logros. */
export const PAGES_REVALIDATE = 600
