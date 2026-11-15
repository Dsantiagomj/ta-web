import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "quest_guides" ADD COLUMN "import_snapshot" jsonb;
  ALTER TABLE "_quest_guides_v" ADD COLUMN "version_import_snapshot" jsonb;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "quest_guides" DROP COLUMN "import_snapshot";
  ALTER TABLE "_quest_guides_v" DROP COLUMN "version_import_snapshot";`)
}
