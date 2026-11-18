import { renderShareCard } from '@/lib/seo/share-card-image'

// La tarjeta de la marca (backlog S-19): la portada y los índices cuando Torre no subió imagen
// en «Ajustes del sitio». No lee la base: se pinta en el build y se sirve estática.
export const dynamic = 'force-static'

export async function GET() {
  const { body, type } = await renderShareCard('brand')
  return new Response(new Uint8Array(body), { headers: { 'Content-Type': type } })
}
