import { Button } from '@/components/ui/Button'
import { EXIT_PREVIEW_PATH } from '@/lib/guides/preview'
import { guideStrings } from '@/lib/guides/strings'

const s = guideStrings.page.preview

/**
 * Aviso de la vista previa, encima de la cabecera (DESIGN.md, Quest guide: Draft preview), con
 * el botón fantasma para salir. Lo pinta el layout solo en draft mode; la salida vuelve a la
 * página desde la que se pulsa (src/app/(frontend)/vista-previa/salir/route.ts).
 */
export function PreviewBar() {
  return (
    <aside
      aria-label={s.label}
      className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-raised px-4 py-2.5 text-sm text-ink"
    >
      <p>{s.note}</p>
      <form method="post" action={EXIT_PREVIEW_PATH}>
        <Button type="submit" variant="ghost">
          {s.exit}
        </Button>
      </form>
    </aside>
  )
}
