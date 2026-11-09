// Caché de las guías de Dofus, como la de las páginas de logro (src/lib/achievements/cache.ts):
// lo que se guarda es lo leído de Postgres, con esta etiqueta. La caducan los hooks de las
// guías de Dofus y de lo que enseñan: las páginas de logro y sus metalogros (las misiones de
// cada logro), las guías de misión (los enlaces de esas misiones) y Media (iconos, renders y
// capturas). Lo que se escribe fuera del servidor (la importación) se ve como mucho tras
// DOFUS_GUIDES_REVALIDATE segundos.

export const DOFUS_GUIDES_TAG = 'dofus-guides'

/** Diez minutos, como las guías y los logros. */
export const DOFUS_GUIDES_REVALIDATE = 600
