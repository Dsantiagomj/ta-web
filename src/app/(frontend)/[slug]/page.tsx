import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { BotinCard } from '@/components/game/BotinCard'
import { GuideBody } from '@/components/game/GuideBody'
import { HeroHeader } from '@/components/game/HeroHeader'
import { PageEnhancements } from '@/components/game/PageEnhancements'
import { SummaryRibbon } from '@/components/game/SummaryRibbon'
import { botinProps, guideBlocks, guideLevel, guideSeo, ribbonProps } from '@/lib/guides/page'

import { siteStrings } from '../strings'
import { loadGuidePage } from './data'
import { LivePreviewRefresh } from './LivePreviewRefresh'
import { PreviewBar } from './PreviewBar'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await loadGuidePage((await params).slug)
  // Sin guía, la página llama a notFound() y Next pone noindex.
  if (!page) return {}
  const { title, description } = guideSeo(page.guide)
  const url = `/${page.guide.slug}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title,
      description,
      url,
      siteName: siteStrings.brand,
      locale: 'es_ES',
    },
    // Un borrador nunca se indexa.
    ...(page.preview && { robots: { index: false, follow: false } }),
  }
}

/**
 * Guía de misión, variante B (DESIGN.md, Quest guide), con lo que la guía guarda hoy:
 * cabecera con el medallón, resumen, el cuerpo como prosa y el Botín. Las partes sin datos
 * (arte, migas, etapas, logro, siguiente misión) no se pintan. Una sola isla de cliente;
 * la de la vista previa solo en draft mode.
 */
export default async function QuestGuidePage({ params }: Props) {
  const page = await loadGuidePage((await params).slug)
  if (!page) notFound()

  const { guide, links, preview } = page
  const botin = botinProps(guide)

  return (
    <main className="pb-20 [--color-section:var(--color-sec-misiones)]">
      {preview && <PreviewBar slug={guide.slug} />}
      <HeroHeader title={guide.title} level={guideLevel(guide)} crumbs={[]} />
      <div className="px-4 sm:px-6 lg:px-12">
        <SummaryRibbon {...ribbonProps(guide, links)} />
        <div className="mx-auto mt-12 w-full max-w-[calc(var(--width-prose)+64px)]">
          <GuideBody blocks={guideBlocks(guide)} />
          {botin && (
            <div className="mt-12">
              <BotinCard {...botin} />
            </div>
          )}
        </div>
      </div>
      <PageEnhancements />
      {preview && <LivePreviewRefresh />}
    </main>
  )
}
