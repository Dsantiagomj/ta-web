// Lo que la importación saca de una página de oro: el conversor de su tipo, tal como lo llaman
// los scripts de import-*.ts, hasta antes de la carga en Payload. La prosa sigue en HTML y las
// imágenes y los vídeos van por su URL de origen (la carga los sube a Media y los cambia por un
// ID). Dos datos que la carga saca de fuera se fijan aquí: las guías de misiones no llevan
// cruce con DofusDB (sale de quest_matches.csv del inventario) y ninguna página se da por
// publicada en este sitio, así que los enlaces de Torre a su propia web van a Squarespace salvo
// las rutas propias y las de la tabla de redirecciones (dofus-guides/site-links.ts).
import { achievementProse } from '../achievements/prose'
import { parseDofusGuide } from '../dofus-guides/parse'
import { PAGE_CATALOG } from '../pages/catalog'
import { convertPage } from '../pages/convert'
import { CLASS_CATALOG, DUNGEON_CATALOG } from '../section-pages/catalog'
import { convertClassPage, convertDungeonPage } from '../section-pages/convert'
import { parsePage } from '../squarespace/parse-page'
import { toQuestGuide } from '../squarespace/to-quest-guide'
import type { GoldenPage } from './catalog'

const notLive = () => false

function catalogEntry<T extends { slug: string }>(catalog: T[], slug: string): T {
  const entry = catalog.find((candidate) => candidate.slug === slug)
  if (!entry) throw new Error(`${slug} no está en el catálogo de su importación`)
  return entry
}

/** La salida del conversor de la página. Quien lee muchas páginas suelta luego el DOM. */
export function goldenOutput(page: GoldenPage, html: string): unknown {
  switch (page.kind) {
    case 'quest':
      return toQuestGuide(parsePage(html), { slug: page.slug, questDofusIds: [] })
    case 'achievement':
      return achievementProse(parsePage(html))
    case 'dofus':
      return parseDofusGuide(html)
    case 'page':
      return convertPage(html, catalogEntry(PAGE_CATALOG, page.slug), notLive)
    case 'class':
      return convertClassPage(html, catalogEntry(CLASS_CATALOG, page.slug), notLive)
    case 'dungeon':
      return convertDungeonPage(html, catalogEntry(DUNGEON_CATALOG, page.slug), notLive)
  }
}
