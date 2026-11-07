import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { GuideBody, GuideSteps } from '@/components/game/GuideBody'
import { NextQuestCard } from '@/components/game/NextQuestCard'
import { PageEnhancements } from '@/components/game/PageEnhancements'
import { QuestHeader } from '@/components/game/QuestHeader'
import {
  guideContent,
  guideSeo,
  guideStart,
  nextQuestCard,
  questHeaderProps,
} from '@/lib/guides/page'

import { Breadcrumb } from '@/components/site/Breadcrumb'
import { guideBreadcrumb } from '@/lib/achievements/page'
import { achievementPageStrings } from '@/lib/achievements/strings'
import { SITE_URL } from '@/lib/site/origin'

import { siteStrings } from '../strings'
import { loadAchievementPage } from './achievement-data'
import { AchievementView } from './AchievementView'
import { loadGuidePage } from './data'
import { LivePreviewRefresh } from './LivePreviewRefresh'
import { PreviewBar } from './PreviewBar'

type Props = { params: Promise<{ slug: string }> }

/** Título y descripción de un logro: el nombre y cuántas misiones tiene. */
function achievementSeo(name: string, quests: number) {
  const s = achievementPageStrings.seo
  return { title: s.title(name), description: s.description(name, quests) }
}

// /<slug> es una guía o un logro: los slugs no chocan (src/collections/root-slug.ts).
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug
  const page = await loadGuidePage(slug)
  const achievement = page ? null : await loadAchievementPage(slug)
  // Sin guía ni logro, la página llama a notFound() y Next pone noindex.
  if (!page && !achievement) return {}
  const { title, description } = page
    ? guideSeo(page.guide)
    : achievementSeo(achievement!.page.name, achievement!.page.quests?.length ?? 0)
  const url = `/${page ? page.guide.slug : achievement!.page.slug}`
  const preview = page ? page.preview : achievement!.preview
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
    ...(preview && { robots: { index: false, follow: false } }),
  }
}

/** Una guía o un logro; si no es ninguno, 404. */
export default async function SlugPage({ params }: Props) {
  const slug = (await params).slug
  const page = await loadGuidePage(slug)
  if (page) return <QuestGuideView page={page} />
  // Un logro En preparación no tiene página: la consulta no lo devuelve a un visitante.
  const achievement = await loadAchievementPage(slug)
  if (!achievement) notFound()
  return <AchievementView data={achievement} preview={achievement.preview} />
}

/**
 * Guía de misión, v5 (DESIGN.md, Quest guide): una columna de lectura centrada con la
 * cabecera (el PNJ que da la misión, el título, el subtítulo y Prerrequisitos, Necesitarás
 * y Recompensas, con los objetos en la bolsa), la entrada, los pasos separados por una
 * línea y el cierre. Lo que la guía no guarda no se pinta. Una sola isla de cliente; la de
 * la vista previa solo en draft mode.
 */
function QuestGuideView({
  page,
}: {
  page: NonNullable<Awaited<ReturnType<typeof loadGuidePage>>>
}) {
  const { guide, links, giver, next, preview, achievement } = page
  const crumbs = guideBreadcrumb(achievement, guide, SITE_URL)
  const place = achievement && { position: achievement.position, total: achievement.total }
  const { intro, steps, outro } = guideContent(guide)
  const card = next && nextQuestCard(next.quest, next.guide)

  return (
    <div className="[--color-section:var(--color-sec-misiones)]">
      {preview && <PreviewBar slug={guide.slug} />}
      <main id="contenido" className="quest">
        <article>
          {crumbs && <Breadcrumb {...crumbs} />}
          <QuestHeader title={guide.title} data={questHeaderProps(guide, links, giver, place)} />
          {intro.length > 0 && (
            <div className="quest__intro">
              <GuideBody blocks={intro} />
            </div>
          )}
          {steps.length > 0 && <GuideSteps steps={steps} start={guideStart(guide)} />}
          {outro.length > 0 && (
            <div className="quest__outro">
              <GuideBody blocks={outro} />
            </div>
          )}
          {card && <NextQuestCard card={card} />}
        </article>
      </main>
      <PageEnhancements />
      {preview && <LivePreviewRefresh />}
    </div>
  )
}
