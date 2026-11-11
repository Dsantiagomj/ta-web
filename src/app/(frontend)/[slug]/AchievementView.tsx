import {
  AchievementCountsFor,
  AchievementHeader,
  AchievementNav,
  AchievementQuests,
} from '@/components/achievement/AchievementParts'
import { GuideRichText } from '@/components/game/GuideRichText'
import { PageEnhancements } from '@/components/game/PageEnhancements'
import { Breadcrumb } from '@/components/site/Breadcrumb'
import { achievementPageView, type AchievementPageData } from '@/lib/achievements/page'
import type { RichTextState } from '@/lib/guides/page'

import { LivePreviewRefresh } from './LivePreviewRefresh'
import { PreviewBar } from './PreviewBar'

/**
 * La página de un logro (DESIGN.md, Achievement page): las migas, la cabecera con el icono,
 * la entrada de Torre, las misiones en orden, el cierre, «Cuenta para» y el logro anterior y
 * el siguiente, en una sola columna centrada. La única isla es la de la
 * guía, para la bolsa de recompensas; la de la vista previa, solo en draft mode.
 */
export function AchievementView({
  data,
  preview,
}: {
  data: AchievementPageData
  preview: boolean
}) {
  const view = achievementPageView(data)
  const { intro, outro } = data.page as {
    intro?: RichTextState | null
    outro?: RichTextState | null
  }
  return (
    <div className="[--color-section:var(--color-sec-logros)]">
      {preview && <PreviewBar slug={data.page.slug} />}
      <main id="contenido" className="logro">
        <article className="logro__main">
          <Breadcrumb {...view.breadcrumb} />
          <AchievementHeader
            title={view.title}
            icon={view.icon}
            meta={view.meta}
            facts={view.facts}
          />
          {intro && (
            <div className="logro__prose guide-body">
              <GuideRichText content={intro} />
            </div>
          )}
          <AchievementQuests quests={view.quests} />
          {outro && (
            <div className="logro__prose guide-body">
              <GuideRichText content={outro} />
            </div>
          )}
          <AchievementCountsFor countsFor={view.countsFor} />
          {view.group && (
            <AchievementNav group={view.group.name} previous={view.previous} next={view.next} />
          )}
        </article>
      </main>
      <PageEnhancements />
      {preview && <LivePreviewRefresh />}
    </div>
  )
}
