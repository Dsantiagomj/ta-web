import { GuideSections } from '@/components/game/GuideBody'
import { PageEnhancements } from '@/components/game/PageEnhancements'
import { Breadcrumb } from '@/components/site/Breadcrumb'
import { guideContent } from '@/lib/guides/page'
import { sitePageBreadcrumb, type SitePageDoc } from '@/lib/pages/page'
import { SITE_URL } from '@/lib/site/origin'

import { LivePreviewRefresh } from './LivePreviewRefresh'
import { PreviewBar } from './PreviewBar'

/**
 * Una página suelta (DESIGN.md, Site page): la página plana de las guías de misión, con las
 * migas, el título y el cuerpo con los mismos bloques, sin cabecera de misión. La única isla
 * es la de las guías (copiar coordenadas, el vídeo y las capturas); la de la vista previa,
 * solo en draft mode.
 */
export function SitePageView({ page, preview }: { page: SitePageDoc; preview: boolean }) {
  return (
    <div>
      {preview && <PreviewBar slug={page.slug} />}
      <main id="contenido" className="quest">
        <article>
          <Breadcrumb {...sitePageBreadcrumb(page, SITE_URL)} />
          <header className="qhead">
            <h1 className="qhead__title">{page.title}</h1>
          </header>
          <GuideSections
            content={guideContent(page)}
            introClassName="quest__intro"
            outroClassName="quest__outro"
          />
        </article>
      </main>
      <PageEnhancements />
      {preview && <LivePreviewRefresh />}
    </div>
  )
}
