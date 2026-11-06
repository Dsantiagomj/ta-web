import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { GuideBody, GuideSteps } from '@/components/game/GuideBody'
import { PageEnhancements } from '@/components/game/PageEnhancements'
import { QuestHeader } from '@/components/game/QuestHeader'
import { StepTracker } from '@/components/game/QuestSteps'
import { guideContent, guideSeo, questHeaderProps } from '@/lib/guides/page'
import { stepNav } from '@/lib/guides/step-nav'

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
 * Guía de misión, v4 (DESIGN.md, Quest guide): una página plana con la cabecera (el PNJ
 * que da la misión, el título, el subtítulo y Prerrequisitos, Necesitarás y Recompensas),
 * la entrada, los pasos numerados y el cierre; desde 1152px, la lista «Pasos» al lado.
 * Lo que la guía no guarda no se pinta. Una sola isla de cliente; la de la vista previa
 * solo en draft mode.
 */
export default async function QuestGuidePage({ params }: Props) {
  const page = await loadGuidePage((await params).slug)
  if (!page) notFound()

  const { guide, links, giver, preview } = page
  const { intro, steps, outro } = guideContent(guide)

  return (
    <div className="[--color-section:var(--color-sec-misiones)]">
      {preview && <PreviewBar slug={guide.slug} />}
      <main className="quest">
        <article className="quest__main">
          <QuestHeader title={guide.title} data={questHeaderProps(guide, links, giver)} />
          {intro.length > 0 && (
            <div className="quest__intro">
              <GuideBody blocks={intro} />
            </div>
          )}
          {steps.length > 0 && <GuideSteps steps={steps} />}
          {outro.length > 0 && (
            <div className="quest__outro">
              <GuideBody blocks={outro} />
            </div>
          )}
        </article>
        <StepTracker entries={stepNav(steps)} />
      </main>
      <PageEnhancements />
      {preview && <LivePreviewRefresh />}
    </div>
  )
}
