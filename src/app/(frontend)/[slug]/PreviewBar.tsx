import { Button } from '@/components/ui/Button'
import { EXIT_PREVIEW_PATH } from '@/lib/guides/preview'
import { guideStrings } from '@/lib/guides/strings'

const s = guideStrings.page.preview

/** Aviso de la vista previa, con el botón para salir. Solo se pinta en draft mode. */
export function PreviewBar({ slug }: { slug: string }) {
  return (
    <aside
      aria-label={s.label}
      className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-raised px-4 py-2.5 text-sm text-ink"
    >
      <p>{s.note}</p>
      <form method="post" action={EXIT_PREVIEW_PATH}>
        <input type="hidden" name="slug" value={slug} />
        <Button type="submit" variant="ghost">
          {s.exit}
        </Button>
      </form>
    </aside>
  )
}
