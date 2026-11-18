import { readShareArt } from '@/lib/seo/share-card-art'
import { renderShareCard } from '@/lib/seo/share-card-image'

import { slugSeo } from '../seo-data'

// La tarjeta al compartir de una página de /<slug> (backlog S-19, DESIGN.md, Share card),
// pintada la primera vez que se pide y guardada como página estática (ISR). Las lecturas son
// las de la página, con sus etiquetas de caché: cuando Torre publica, el hook de la colección
// caduca la etiqueta y la siguiente petición la vuelve a pintar; lo de fuera del panel, en
// diez minutos. La URL de og:image lleva ?v= con la versión: las redes piden la nueva.
export const dynamic = 'force-static'
export const revalidate = 600

// Ninguna en el build (no hay base de datos): cada una se pinta al pedirla.
export function generateStaticParams() {
  return []
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const found = await slugSeo((await params).slug)
  // Un borrador nunca llega aquí: force-static no tiene draft mode.
  if (!found) return new Response(null, { status: 404 })
  const { art } = found.card
  const file = art ? await readShareArt(art.src) : null
  const { body, type } = await renderShareCard(found.card, file)
  return new Response(new Uint8Array(body), { headers: { 'Content-Type': type } })
}
