import { ChecklistHeader, eggStyle, ProgressDialogs } from '@/components/checklist/ChecklistParts'
import { progressStrings as p } from '@/components/checklist/progress-strings'
import { SoulsIntro, SoulsList, SoulsStrip, SoulsTools } from '@/components/checklist/SoulsParts'
import { SoulsIsland } from '@/components/checklist/SoulsIsland'
import { Breadcrumb } from '@/components/site/Breadcrumb'
import type { ChecklistData } from '@/lib/checklists/page'
import { soulsView } from '@/lib/checklists/souls'
import { soulsStrings as o } from '@/lib/checklists/strings'

import { LivePreviewRefresh } from './LivePreviewRefresh'
import { PreviewBar } from './PreviewBar'

/**
 * Una checklist de almas (el Ocre, «La eterna cosecha»): las migas, la cabecera con el huevo,
 * los avisos de Torre y la ventana con el progreso, las herramientas (agrupar por etapa o por
 * región, el tipo, el buscador y el menú «⋯») y las almas. Todo se pinta en el servidor, por
 * etapa; la isla marca, agrupa por región, filtra y guarda (souls-ui.ts).
 */
export function SoulsView({ data, preview }: { data: ChecklistData; preview: boolean }) {
  const view = soulsView({
    checklist: data.checklist,
    stages: data.souls?.stages ?? [],
    monsters: data.souls?.monsters ?? {},
    subareas: data.souls?.subareas ?? {},
    dungeons: data.souls?.dungeons ?? [],
    siteUrl: data.siteUrl,
  })
  return (
    <div className="[--color-section:var(--color-sec-checklists)]" style={eggStyle(view.color)}>
      {preview && <PreviewBar slug={view.slug} />}
      <main id="contenido" className="ck sl">
        <Breadcrumb {...view.breadcrumb} />
        <ChecklistHeader view={view} />
        <SoulsIntro view={view} />
        <section className="ck-win sl-win" aria-label={o.listLabel}>
          <SoulsStrip view={view} />
          <SoulsTools view={view} />
          <SoulsList view={view} />
        </section>
      </main>
      <ProgressDialogs resets={[['souls', p.resetSouls]]} />
      <SoulsIsland data={view.island} />
      {preview && <LivePreviewRefresh />}
    </div>
  )
}
