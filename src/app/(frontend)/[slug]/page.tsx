import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { GuideSections } from '@/components/game/GuideBody'
import { NextQuestCard } from '@/components/game/NextQuestCard'
import { PageEnhancements } from '@/components/game/PageEnhancements'
import { QuestHeader } from '@/components/game/QuestHeader'
import { ZoneBackground } from '@/components/game/ZoneBackground'
import { guideContent, guideStart, nextQuestCard, questHeaderProps } from '@/lib/guides/page'

import { Breadcrumb } from '@/components/site/Breadcrumb'
import { JsonLd } from '@/components/site/JsonLd'
import { pageSection } from '@/components/site/nav'
import { guideBreadcrumb } from '@/lib/achievements/page'
import { checklistRoute } from '@/lib/checklists/page'
import { contentDate } from '@/lib/content-date/format'
import { sitePageRoute } from '@/lib/pages/page'
import { articleJsonLd } from '@/lib/seo/json-ld'
import { shareCardImage } from '@/lib/seo/share-card'
import { SITE_URL } from '@/lib/site/origin'
import { withSiteLinks } from '@/lib/site/site-links'
import { openGraphDefaults } from '@/lib/site-copy/metadata'

import { loadLiveSlug, loadSiteSettings } from '../site-data'

import { loadAchievementPage } from './achievement-data'
import { AchievementView } from './AchievementView'
import { loadChecklist } from './checklist-data'
import { ChecklistView } from './ChecklistView'
import { SoulsView } from './SoulsView'
import { loadGuidePage } from './data'
import { loadDofusGuide } from './dofus-data'
import { DofusGuideView } from './DofusGuideView'
import { LivePreviewRefresh } from './LivePreviewRefresh'
import { loadSitePage } from './page-data'
import { redirectOrNotFound } from './redirect-data'
import { slugSeo } from './seo-data'
import { SitePageView } from './SitePageView'

type Props = { params: Promise<{ slug: string }> }

// /<slug> es una guía, un logro, una guía de Dofus, una página suelta o una checklist: los
// slugs no chocan (src/collections/root-slug.ts).
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [found, settings] = await Promise.all([slugSeo((await params).slug), loadSiteSettings()])
  // Sin página, la página llama a notFound() y Next pone noindex.
  if (!found) return {}
  const { title, description, url, preview } = found
  // La tarjeta de la página (/<slug>/og), nunca la imagen de «Ajustes del sitio».
  const image = shareCardImage(url.slice(1), found.card, found.dates.modified)
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title,
      description,
      url,
      // El nombre del sitio, de «Ajustes del sitio».
      ...openGraphDefaults(settings),
      images: [image],
    },
    twitter: { card: 'summary_large_image', images: [image] },
    // Un borrador nunca se indexa.
    ...(preview && { robots: { index: false, follow: false } }),
  }
}

/** El Article de la página (AGENTS.md, SEO), con la tarjeta y las fechas del contenido. */
async function ArticleData({ slug }: { slug: string }) {
  const [found, settings] = await Promise.all([slugSeo(slug), loadSiteSettings()])
  if (!found?.article) return null
  const { socials } = settings
  return (
    <JsonLd
      data={articleJsonLd({
        siteUrl: SITE_URL,
        siteName: settings.name,
        path: found.url,
        headline: found.headline,
        description: found.description,
        image: shareCardImage(found.url.slice(1), found.card, found.dates.modified).url,
        published: found.dates.published,
        modified: found.dates.modified,
        sameAs: [socials.twitch.url, socials.youtube.url, socials.kick.url],
      })}
    />
  )
}

/**
 * Una guía, un logro, una guía de Dofus, una página suelta o una checklist; si no, un 308 a
 * su dirección nueva si Torre la cambió, o 404.
 */
export default async function SlugPage({ params }: Props) {
  const slug = (await params).slug
  // Los enlaces de Torre a su propia web pasan a relativos donde este sitio sirve la ruta
  // (src/lib/site/site-links.ts); el resto lleva a su página de Squarespace.
  const linked = async <T,>(data: T): Promise<T> => withSiteLinks(data, await loadLiveSlug())
  const article = <ArticleData slug={slug} />
  const page = await loadGuidePage(slug)
  if (page) {
    return (
      <>
        {article}
        <QuestGuideView page={await linked(page)} />
      </>
    )
  }
  // Un logro o un Dofus En preparación no tienen página: la consulta no se los da a un visitante.
  const achievement = await loadAchievementPage(slug)
  if (achievement) {
    return (
      <>
        {article}
        <AchievementView data={await linked(achievement)} preview={achievement.preview} />
      </>
    )
  }
  const dofus = await loadDofusGuide(slug)
  if (dofus) {
    const live = await loadLiveSlug()
    return (
      <>
        {article}
        <DofusGuideView data={{ ...withSiteLinks(dofus, live), live }} preview={dofus.preview} />
      </>
    )
  }
  // Una página En preparación lleva a su página de Squarespace, como una checklist.
  const site = await loadSitePage(slug)
  if (site) {
    const route = sitePageRoute(site.page, site.preview, SITE_URL)
    if (route.kind === 'legacy') redirect(route.href)
    if (route.kind === 'none') notFound()
    return (
      <>
        {article}
        <SitePageView page={await linked(site.page)} preview={site.preview} />
      </>
    )
  }
  const checklist = await loadChecklist(slug)
  if (!checklist) return redirectOrNotFound(slug)
  // Una checklist En preparación no tiene página: lleva a la de Squarespace.
  const route = checklistRoute(checklist.checklist, checklist.preview, SITE_URL)
  if (route.kind === 'legacy') redirect(route.href)
  if (route.kind === 'none') notFound()
  if (checklist.checklist.kind === 'souls') {
    return <SoulsView data={await linked(checklist)} preview={checklist.preview} />
  }
  return <ChecklistView data={await linked(checklist)} preview={checklist.preview} />
}

/**
 * Guía de misión, v5 (DESIGN.md, Quest guide): una columna de lectura a la izquierda con la
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
  // Una entrada de la caché guardada antes de los jefes no los trae: el icono de mazmorra.
  const bosses = new Map(page.dungeonBosses ?? [])
  const crumbs = guideBreadcrumb(achievement, guide, SITE_URL)
  const place = achievement && { position: achievement.position, total: achievement.total }
  const card = next && nextQuestCard(next.quest, next.guide)

  return (
    <div className="[--color-section:var(--color-sec-misiones)]">
      {page.zoneBackground && <ZoneBackground image={page.zoneBackground} />}
      <main id="contenido" className="quest" {...pageSection('misiones')}>
        <article>
          {crumbs && <Breadcrumb {...crumbs} />}
          <QuestHeader
            title={guide.title}
            data={questHeaderProps(guide, links, giver, place, bosses)}
            updated={contentDate(guide).modified}
          />
          <GuideSections
            content={guideContent(guide)}
            start={guideStart(guide)}
            introClassName="quest__intro"
            outroClassName="quest__outro"
          />
          {card && <NextQuestCard card={card} />}
        </article>
      </main>
      <PageEnhancements />
      {preview && <LivePreviewRefresh />}
    </div>
  )
}
