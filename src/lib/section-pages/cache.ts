// Caché de lo que el menú lee de las páginas de clase y de mazmorra: lo leído de Postgres,
// con esta etiqueta. La caducan los hooks de las dos colecciones. Lo que se escribe fuera del
// servidor (la importación) se ve como mucho tras SECTION_PAGES_REVALIDATE segundos.

export const SECTION_PAGES_TAG = 'section-pages'

/** Diez minutos, como las guías y las páginas sueltas. */
export const SECTION_PAGES_REVALIDATE = 600
