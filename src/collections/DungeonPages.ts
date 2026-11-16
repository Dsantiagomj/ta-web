import { dungeonPageStrings as s } from '../lib/section-pages/strings'
import { sectionPageCollection } from './section-pages'

// Las páginas de mazmorra de Torre (backlog S-11): su explicación de los monstruos, el jefe y
// sus recomendaciones, con los bloques de las guías (los combates enlazan los monstruos de
// DofusDB). Pueden enlazar la mazmorra de DofusDB, que da sus jefes y su nivel. No se llaman
// `dungeons`: esa es la colección de DofusDB.
export const DungeonPages = sectionPageCollection({
  slug: 'dungeon-pages',
  labels: { singular: 'Mazmorra', plural: 'Mazmorras' },
  strings: s,
  sidebar: [
    {
      name: 'dungeon',
      label: s.dungeon,
      type: 'relationship',
      relationTo: 'dungeons',
      admin: { position: 'sidebar', description: s.dungeonDescription },
    },
  ],
})
