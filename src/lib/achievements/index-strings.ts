// Los textos que necesita la isla del índice de metalogros, sin dependencias: van en el
// JavaScript de la página, así que este módulo no importa nada más (metalogrosStrings los
// reúne con los demás).

export const indexIslandStrings = {
  preparing: 'En preparación',
  /** Lo que es cada resultado del buscador. */
  kinds: { zone: 'Zona', achievement: 'Logro', quest: 'Misión' },
  resultsCount: (count: number) => (count === 1 ? '1 resultado' : `${count} resultados`),
  noResults: (query: string) =>
    `Nada se llama «${query}». Prueba con el nombre tal como sale en el juego.`,
  close: (name: string) => `Cerrar ${name}`,
} as const
