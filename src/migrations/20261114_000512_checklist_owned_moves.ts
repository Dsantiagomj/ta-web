import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "checklists" ADD COLUMN "legacy_owned_moves" jsonb;
  ALTER TABLE "_checklists_v" ADD COLUMN "version_legacy_owned_moves" jsonb;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "checklists" DROP COLUMN "legacy_owned_moves";
  ALTER TABLE "_checklists_v" DROP COLUMN "version_legacy_owned_moves";`)
}
