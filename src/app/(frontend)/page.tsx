import { Hero } from '@/components/home/Hero'
import { LiveStrip } from '@/components/home/LiveStrip'
import { liveState } from '@/lib/site/live'
import '@/components/home/home.css'

/** La portada (DESIGN.md, Layout: Home): el directo si lo hay y el hero con la búsqueda. */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const live = liveState((await searchParams).directo, process.env)
  return (
    <main id="contenido" className="home">
      <LiveStrip live={live} />
      <Hero />
    </main>
  )
}
