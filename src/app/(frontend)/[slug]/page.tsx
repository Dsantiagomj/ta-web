import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { GuideSections } from '@/components/game/GuideBody'
import { NextQuestCard } from '@/components/game/NextQuestCard'
import { PageEnhancements } from '@/components/game/PageEnhancements'
import { QuestHeader } from '@/components/game/QuestHeader'
import { ZoneBackground } from '@/components/game/ZoneBackground'
import {
  guideContent,
  guideSeo,
  guideStart,
  nextQuestCard,
  questHeaderProps,
} from '@/lib/guides/page'

import { Breadcrumb } from '@/components/site/Breadcrumb'
import { pageSection } from '@/components/site/nav'
import { guideBreadcrumb } from '@/lib/achievements/page'
import { achievementPageStrings } from '@/lib/achievements/strings'
import { checklistRoute } from '@/lib/checklists/page'
import { checklistPageStrings } from '@/lib/checklists/strings'
import { dofusPageStrings } from '@/lib/dofus-guides/strings'
import { sitePageRoute, sitePageSeo } from '@/lib/pages/page'
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
import { SitePageView } from './SitePageView'

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
  const site = await loadSitePage(slug)
  if (site) {
    if (sitePageRoute(site.page, site.preview, SITE_URL).kind !== 'page') return null
    return { ...sitePageSeo(site.page), url: `/${site.page.slug}`, preview: site.preview }
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

// /<slug> es una guía, un logro, una guía de Dofus, una página suelta o una checklist: los
// slugs no chocan (src/collections/root-slug.ts).
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [found, settings] = await Promise.all([slugSeo((await params).slug), loadSiteSettings()])
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
      // El nombre del sitio y la imagen al compartir, de «Ajustes del sitio».
      ...openGraphDefaults(settings),
    },
    // Un borrador nunca se indexa.
    ...(preview && { robots: { index: false, follow: false } }),
  }
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
  const page = await loadGuidePage(slug)
  if (page) return <QuestGuideView page={await linked(page)} />
  // Un logro o un Dofus En preparación no tienen página: la consulta no se los da a un visitante.
  const achievement = await loadAchievementPage(slug)
  if (achievement) {
    return <AchievementView data={await linked(achievement)} preview={achievement.preview} />
  }
  const dofus = await loadDofusGuide(slug)
  if (dofus) {
    const live = await loadLiveSlug()
    return <DofusGuideView data={{ ...withSiteLinks(dofus, live), live }} preview={dofus.preview} />
  }
  // Una página En preparación lleva a su página de Squarespace, como una checklist.
  const site = await loadSitePage(slug)
  if (site) {
    const route = sitePageRoute(site.page, site.preview, SITE_URL)
    if (route.kind === 'legacy') redirect(route.href)
    if (route.kind === 'none') notFound()
    return <SitePageView page={await linked(site.page)} preview={site.preview} />
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
