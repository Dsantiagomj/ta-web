import {
  DofusBody,
  DofusChecklist,
  DofusHeader,
  DofusNav,
  DofusNeeds,
  DofusParts,
  DofusVideo,
} from '@/components/dofus/DofusGuideParts'
import { GuideRichText } from '@/components/game/GuideRichText'
import { PageEnhancements } from '@/components/game/PageEnhancements'
import { Breadcrumb } from '@/components/site/Breadcrumb'
import { dofusGuideView, type DofusGuideData } from '@/lib/dofus-guides/page'

import { LivePreviewRefresh } from './LivePreviewRefresh'
import { PreviewBar } from './PreviewBar'

/**
 * La guía de un Dofus (DESIGN.md, Dofus guide page): las migas, la cabecera con el huevo,
 * la checklist, la intro de Torre, Necesitarás, el paso a paso, los logros y misiones en
 * orden, el cierre, el vídeo y el Dofus anterior y el siguiente, en una sola columna centrada.
 * Todo sale de la colección. La única isla es la de las guías
 * (copiar objetos, el vídeo y las capturas); la de la vista previa, solo en draft mode.
 */
export function DofusGuideView({ data, preview }: { data: DofusGuideData; preview: boolean }) {
  const view = dofusGuideView(data)
  return (
    <div className="dg-page">
      {preview && <PreviewBar slug={data.guide.slug} />}
      <main id="contenido" className="logro dg-page dg-single">
        <article className="logro__main">
          <Breadcrumb {...view.breadcrumb} />
          <DofusHeader view={view} />
          {view.checklist && <DofusChecklist checklist={view.checklist} egg={view.egg} />}
          {view.intro && (
            <div className="logro__prose dg-intro guide-body">
              <GuideRichText content={view.intro} />
            </div>
          )}
          {view.needs && <DofusNeeds needs={view.needs} />}
          <DofusBody blocks={view.body} />
          <DofusParts view={view} />
          {view.outro && (
            <div className="logro__prose guide-body">
              <GuideRichText content={view.outro} />
            </div>
          )}
          {view.video && <DofusVideo video={view.video} />}
          <DofusNav previous={view.previous} next={view.next} />
        </article>
      </main>
      <PageEnhancements />
      {preview && <LivePreviewRefresh />}
    </div>
  )
}
