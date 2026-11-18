import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Las colecciones con página en /<slug> que dicen «Actualizado el» (backlog D-03).
export const CONTENT_DATE_TABLES = [
  'quest_guides',
  'achievement_pages',
  'dofus_guides',
  'checklists',
  'pages',
] as const

/**
 * La fecha de partida (AGENTS.md, Content date). Las versiones no guardan quién las escribió,
 * así que aquí no se distingue a Torre de un script: cada documento publicado toma la fecha de
 * su última versión publicada, o la de su fila si ya no le queda ninguna, y sus versiones la
 * misma, para que la vista previa diga lo mismo. Desde aquí solo la mueve una persona al publicar.
 */
export function backfillContentDate(table: (typeof CONTENT_DATE_TABLES)[number]) {
  const main = sql.identifier(table)
  const versions = sql.identifier(`_${table}_v`)
  return sql`
    UPDATE ${main} AS doc
    SET content_updated_at = COALESCE(
      (
        SELECT max(v.updated_at) FROM ${versions} AS v
        WHERE v.parent_id = doc.id AND v.version__status = 'published'
      ),
      doc.updated_at
    )
    WHERE doc._status = 'published';
    UPDATE ${versions} AS v
    SET version_content_updated_at = doc.content_updated_at
    FROM ${main} AS doc
    WHERE v.parent_id = doc.id;
  `
}

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "quest_guides" ADD COLUMN "content_updated_at" timestamp(3) with time zone;
  ALTER TABLE "_quest_guides_v" ADD COLUMN "version_content_updated_at" timestamp(3) with time zone;
  ALTER TABLE "achievement_pages" ADD COLUMN "content_updated_at" timestamp(3) with time zone;
  ALTER TABLE "_achievement_pages_v" ADD COLUMN "version_content_updated_at" timestamp(3) with time zone;
  ALTER TABLE "dofus_guides" ADD COLUMN "content_updated_at" timestamp(3) with time zone;
  ALTER TABLE "_dofus_guides_v" ADD COLUMN "version_content_updated_at" timestamp(3) with time zone;
  ALTER TABLE "checklists" ADD COLUMN "content_updated_at" timestamp(3) with time zone;
  ALTER TABLE "_checklists_v" ADD COLUMN "version_content_updated_at" timestamp(3) with time zone;
  ALTER TABLE "pages" ADD COLUMN "content_updated_at" timestamp(3) with time zone;
  ALTER TABLE "_pages_v" ADD COLUMN "version_content_updated_at" timestamp(3) with time zone;`)

  for (const table of CONTENT_DATE_TABLES) await db.execute(backfillContentDate(table))
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "quest_guides" DROP COLUMN "content_updated_at";
  ALTER TABLE "_quest_guides_v" DROP COLUMN "version_content_updated_at";
  ALTER TABLE "achievement_pages" DROP COLUMN "content_updated_at";
  ALTER TABLE "_achievement_pages_v" DROP COLUMN "version_content_updated_at";
  ALTER TABLE "dofus_guides" DROP COLUMN "content_updated_at";
  ALTER TABLE "_dofus_guides_v" DROP COLUMN "version_content_updated_at";
  ALTER TABLE "checklists" DROP COLUMN "content_updated_at";
  ALTER TABLE "_checklists_v" DROP COLUMN "version_content_updated_at";
  ALTER TABLE "pages" DROP COLUMN "content_updated_at";
  ALTER TABLE "_pages_v" DROP COLUMN "version_content_updated_at";`)
}
