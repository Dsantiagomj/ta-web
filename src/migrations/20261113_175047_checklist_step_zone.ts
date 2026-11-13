import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "checklists_steps_locales" ADD COLUMN "zone" varchar;
  ALTER TABLE "_checklists_v_version_steps_locales" ADD COLUMN "zone" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "checklists_steps_locales" DROP COLUMN "zone";
  ALTER TABLE "_checklists_v_version_steps_locales" DROP COLUMN "zone";`)
}
