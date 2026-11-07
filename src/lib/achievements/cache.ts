// Caché de las páginas de logro, como la de las guías (src/lib/guides/cache.ts): lo que se
// guarda es lo leído de Postgres, con esta etiqueta. La caducan los hooks de las páginas de
// logro, de los metalogros, de las guías (sus tarjetas enlazan las guías publicadas) y de
// Media. Lo que se escribe fuera del servidor (pnpm data:quests, la importación) se ve como
// mucho tras ACHIEVEMENT_PAGES_REVALIDATE segundos.

export const ACHIEVEMENT_PAGES_TAG = 'achievement-pages'

/** Diez minutos, como las guías. */
export const ACHIEVEMENT_PAGES_REVALIDATE = 600
