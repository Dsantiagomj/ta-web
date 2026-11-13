import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "achievement_pages" ADD COLUMN "import_snapshot" jsonb;
  ALTER TABLE "_achievement_pages_v" ADD COLUMN "version_import_snapshot" jsonb;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "achievement_pages" DROP COLUMN "import_snapshot";
  ALTER TABLE "_achievement_pages_v" DROP COLUMN "version_import_snapshot";`)
}
