import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "checklists_steps_locales" ADD COLUMN "figure_name" varchar;
  ALTER TABLE "_checklists_v_version_steps_locales" ADD COLUMN "figure_name" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "checklists_steps_locales" DROP COLUMN "figure_name";
  ALTER TABLE "_checklists_v_version_steps_locales" DROP COLUMN "figure_name";`)
}
