import { contentDate } from '@/lib/content-date/format'
import {
  DofusBody,
  DofusChecklist,
  DofusHeader,
  DofusNav,
  DofusParts,
  DofusSheet,
  DofusVideo,
  hasDofusSheet,
} from '@/components/dofus/DofusGuideParts'
import { GuideRichText } from '@/components/game/GuideRichText'
import { PageEnhancements } from '@/components/game/PageEnhancements'
import { Breadcrumb } from '@/components/site/Breadcrumb'
import { pageSection } from '@/components/site/nav'
import { dofusGuideView, type DofusGuideData } from '@/lib/dofus-guides/page'

import { LivePreviewRefresh } from './LivePreviewRefresh'

/**
 * La guía de un Dofus (DESIGN.md, Dofus guide page), con la disposición de la página de logro
 * (logro--sheet): las migas, la cabecera con el huevo y, en logro__body, la checklist, la
 * entrada de Torre, los logros con sus misiones en orden, el paso a paso, el cierre, el vídeo
 * y el Dofus anterior y el siguiente. La ficha (Prerrequisitos, Necesitarás y Recompensas) es
 * una columna a la derecha desde 64rem; en el móvil va entre la cabecera y lo demás, plegada.
 * Todo sale de la colección. La única isla es la de las guías (copiar objetos, el vídeo, las
 * capturas y la ficha abierta desde 64rem); la de la vista previa, solo en draft mode.
 */
export function DofusGuideView({ data, preview }: { data: DofusGuideData; preview: boolean }) {
  const view = dofusGuideView(data)
  return (
    <div className="dg-page">
      <main
        id="contenido"
        className={hasDofusSheet(view) ? 'logro logro--sheet dg-page' : 'logro dg-page'}
        {...pageSection('dofus')}
      >
        <article className="logro__main">
          <Breadcrumb {...view.breadcrumb} />
          <DofusHeader view={view} updated={contentDate(data.guide).modified} />
          <DofusSheet view={view} />
          <div className="logro__body">
            {view.checklist && <DofusChecklist checklist={view.checklist} egg={view.egg} />}
            {view.intro && (
              <div className="logro__prose dg-intro guide-body">
                <GuideRichText content={view.intro} />
              </div>
            )}
            <DofusParts view={view} />
            <DofusBody content={view.body} />
            {view.outro && (
              <div className="logro__prose guide-body">
                <GuideRichText content={view.outro} />
              </div>
            )}
            {view.video && <DofusVideo video={view.video} />}
            <DofusNav previous={view.previous} next={view.next} />
          </div>
        </article>
      </main>
      <PageEnhancements />
      {preview && <LivePreviewRefresh />}
    </div>
  )
}
