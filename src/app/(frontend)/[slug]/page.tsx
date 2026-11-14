import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

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
import { checklistRoute } from '@/lib/checklists/page'
import { checklistPageStrings } from '@/lib/checklists/strings'
import { dofusPageStrings } from '@/lib/dofus-guides/strings'
import { SITE_URL } from '@/lib/site/origin'

import { siteStrings } from '../strings'

import { loadAchievementPage } from './achievement-data'
import { AchievementView } from './AchievementView'
import { loadChecklist } from './checklist-data'
import { ChecklistView } from './ChecklistView'
import { SoulsView } from './SoulsView'
import { loadGuidePage } from './data'
import { loadDofusGuide } from './dofus-data'
import { DofusGuideView } from './DofusGuideView'
import { LivePreviewRefresh } from './LivePreviewRefresh'
import { PreviewBar } from './PreviewBar'

type Props = { params: Promise<{ slug: string }> }

/** Título y descripción de un logro: el nombre y cuántas misiones tiene. */
function achievementSeo(name: string, quests: number) {
  const s = achievementPageStrings.seo
  return { title: s.title(name), description: s.description(name, quests) }
}

/** Lo que dicen los metadatos de la página del slug, o null si no hay página. */
async function slugSeo(slug: string) {
  const page = await loadGuidePage(slug)
  if (page) return { ...guideSeo(page.guide), url: `/${page.guide.slug}`, preview: page.preview }
  const achievement = await loadAchievementPage(slug)
  if (achievement) {
    const { name, quests } = achievement.page
    return {
      ...achievementSeo(name, quests?.length ?? 0),
      url: `/${achievement.page.slug}`,
      preview: achievement.preview,
    }
  }
  const dofus = await loadDofusGuide(slug)
  if (dofus) {
    const { seo } = dofusPageStrings
    return {
      title: seo.title(dofus.guide.name),
      description: seo.description(dofus.guide.name),
      url: `/${dofus.guide.slug}`,
      preview: dofus.preview,
    }
  }
  const checklist = await loadChecklist(slug)
  if (
    checklist &&
    checklistRoute(checklist.checklist, checklist.preview, SITE_URL).kind === 'page'
  ) {
    const { name, description, slug: url } = checklist.checklist
    return {
      // Una checklist de almas se llama por su nombre («Almas del Ocre»).
      title: checklist.checklist.kind === 'souls' ? name : checklistPageStrings.title(name),
      description: description || checklistPageStrings.seoDescription(name),
      url: `/${url}`,
      preview: checklist.preview,
    }
  }
  return null
}

// /<slug> es una guía, un logro, una guía de Dofus o una checklist: los slugs no chocan
// (src/collections/root-slug.ts).
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await slugSeo((await params).slug)
  // Sin página, la página llama a notFound() y Next pone noindex.
  if (!found) return {}
  const { title, description, url, preview } = found
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

/** Una guía, un logro, una guía de Dofus o una checklist; si no es ninguno, 404. */
export default async function SlugPage({ params }: Props) {
  const slug = (await params).slug
  const page = await loadGuidePage(slug)
  if (page) return <QuestGuideView page={page} />
  // Un logro o un Dofus En preparación no tienen página: la consulta no se los da a un visitante.
  const achievement = await loadAchievementPage(slug)
  if (achievement) return <AchievementView data={achievement} preview={achievement.preview} />
  const dofus = await loadDofusGuide(slug)
  if (dofus) return <DofusGuideView data={dofus} preview={dofus.preview} />
  const checklist = await loadChecklist(slug)
  if (!checklist) notFound()
  // Una checklist En preparación no tiene página: lleva a la de Squarespace.
  const route = checklistRoute(checklist.checklist, checklist.preview, SITE_URL)
  if (route.kind === 'legacy') redirect(route.href)
  if (route.kind === 'none') notFound()
  if (checklist.checklist.kind === 'souls') {
    return <SoulsView data={checklist} preview={checklist.preview} />
  }
  return <ChecklistView data={checklist} preview={checklist.preview} />
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
