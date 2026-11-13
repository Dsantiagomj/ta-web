// Caché de las checklists, como la de las guías de Dofus (src/lib/dofus-guides/cache.ts): lo
// que se guarda es lo leído de Postgres, con esta etiqueta. La caducan los hooks de las
// checklists y de lo que enseña su página: las guías de misión y las páginas de logro (sus
// enlaces), las guías de Dofus (el huevo y el color) y Media (iconos, banners y figuras).
// Las misiones solo las escribe pnpm data:quests, fuera de Next, donde no hay caché que
// caducar: lo que cambia (nombres, niveles, objetivos), como lo de la importación, se ve
// como mucho tras CHECKLISTS_REVALIDATE segundos.
// El índice /checklists y el menú comparten una lectura (loadChecklists) con esta etiqueta.

export const CHECKLISTS_TAG = 'checklists'

/** Diez minutos, como las guías, los logros y las guías de Dofus. */
export const CHECKLISTS_REVALIDATE = 600
