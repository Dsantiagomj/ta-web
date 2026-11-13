import { ChecklistIsland } from '@/components/checklist/ChecklistIsland'
import {
  ChecklistHeader,
  ChecklistTabs,
  eggStyle,
  Prerequisites,
  ProgressDialogs,
  ProgressStrip,
  StepDetail,
  StepList,
  StepSheet,
  Totals,
} from '@/components/checklist/ChecklistParts'
import { PageEnhancements } from '@/components/game/PageEnhancements'
import { Breadcrumb } from '@/components/site/Breadcrumb'
import { checklistView, type ChecklistData } from '@/lib/checklists/page'
import { checklistPageStrings as s } from '@/lib/checklists/strings'

import { LivePreviewRefresh } from './LivePreviewRefresh'
import { PreviewBar } from './PreviewBar'

/**
 * La checklist de un Dofus (prototipo A, tmp/mockups/checklist-a): las migas, la cabecera
 * con el huevo y la ventana con sus tres partes: el Diario (la lista de pasos y, al lado, el
 * paso abierto; en el móvil se abre en una hoja), Prerrequisitos y Objetos. Todo se pinta en
 * el servidor; sin JavaScript se ve todo, una parte detrás de otra.
 *
 * Dos islas: la de la checklist (pestañas, elegir paso, buscar, las coordenadas, que carga
 * después, y el progreso guardado en el navegador) y la de las guías (copiar nombres y
 * coordenadas).
 */
export function ChecklistView({ data, preview }: { data: ChecklistData; preview: boolean }) {
  const view = checklistView(data)
  const last = view.steps.length
  return (
    <div className="[--color-section:var(--color-sec-checklists)]" style={eggStyle(view.color)}>
      {preview && <PreviewBar slug={view.slug} />}
      <main id="contenido" className="ck">
        <Breadcrumb {...view.breadcrumb} />
        <ChecklistHeader view={view} />
        <section className="ck-win" aria-label={s.windowLabel}>
          <ProgressStrip view={view} />
          <ChecklistTabs view={view} />
          <div className="ck-panel" id="ck-p-diario" data-panel="diario" data-active="">
            <h2 className="sr-only">{s.tabs.diary}</h2>
            <div className="ck-diary">
              <StepList steps={view.steps} />
              <div className="ck-detail" data-ck-pane>
                {view.steps.map((step) => (
                  <StepDetail key={step.stepId} step={step} last={last} />
                ))}
              </div>
            </div>
          </div>
          {view.prerequisites.count > 0 && (
            <div className="ck-panel" id="ck-p-pre" data-panel="pre">
              <Prerequisites view={view} />
            </div>
          )}
          {view.totalsCount > 0 && (
            <div className="ck-panel" id="ck-p-obj" data-panel="obj">
              <Totals view={view} />
            </div>
          )}
        </section>
        <p className="ck-credit">{s.credit}</p>
      </main>
      <StepSheet />
      <ProgressDialogs />
      <ChecklistIsland data={view.island} />
      <PageEnhancements />
      {preview && <LivePreviewRefresh />}
    </div>
  )
}
