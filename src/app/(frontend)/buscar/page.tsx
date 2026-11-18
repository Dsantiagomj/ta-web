import config from '@payload-config'
import type { Metadata } from 'next'
import { getPayload } from 'payload'

import { SearchPage } from '@/components/site/SearchPage'
import { needsIndex, searchPageQuery, searchPageView } from '@/components/site/search-page'
import { searchPageStrings as s } from '@/components/site/search-page-strings'
import { cachedSearchIndex } from '@/lib/search/cached-index'

// Una página de resultados no se indexa: cada ?q= sería una página distinta y vacía de
// contenido propio. Sus enlaces sí se siguen.
export const metadata: Metadata = {
  title: s.title,
  robots: { index: false, follow: true },
}

type Props = { searchParams: Promise<{ q?: string | string[] }> }

/**
 * /buscar?q=…: los resultados de la búsqueda de la portada cuando no hay JavaScript (el
 * formulario del hero manda aquí). Lee el mismo índice en caché que el endpoint de las islas,
 * solo si hay algo que buscar, y no manda JavaScript propio.
 */
export default async function BuscarPage({ searchParams }: Props) {
  const query = searchPageQuery((await searchParams).q)
  const index = needsIndex(query) ? await cachedSearchIndex(await getPayload({ config })) : null
  return <SearchPage view={searchPageView(index, query)} />
}
