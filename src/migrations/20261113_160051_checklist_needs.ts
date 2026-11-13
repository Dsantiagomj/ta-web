import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_checklists_steps_needs_category" AS ENUM('resources', 'consumables', 'equipment', 'souls', 'creatures', 'cosmetics');
  CREATE TYPE "public"."enum__checklists_v_version_steps_needs_category" AS ENUM('resources', 'consumables', 'equipment', 'souls', 'creatures', 'cosmetics');
  ALTER TABLE "checklists_steps_needs" ADD COLUMN "category" "enum_checklists_steps_needs_category";
  ALTER TABLE "checklists_steps_needs" ADD COLUMN "counts_in_total" boolean DEFAULT true;
  ALTER TABLE "checklists_steps_needs_locales" ADD COLUMN "label" varchar;
  ALTER TABLE "checklists_steps" ADD COLUMN "icon_id" integer;
  ALTER TABLE "_checklists_v_version_steps_needs" ADD COLUMN "category" "enum__checklists_v_version_steps_needs_category";
  ALTER TABLE "_checklists_v_version_steps_needs" ADD COLUMN "counts_in_total" boolean DEFAULT true;
  ALTER TABLE "_checklists_v_version_steps_needs_locales" ADD COLUMN "label" varchar;
  ALTER TABLE "_checklists_v_version_steps" ADD COLUMN "icon_id" integer;
  ALTER TABLE "checklists_steps" ADD CONSTRAINT "checklists_steps_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_checklists_v_version_steps" ADD CONSTRAINT "_checklists_v_version_steps_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "checklists_steps_icon_idx" ON "checklists_steps" USING btree ("icon_id");
  CREATE INDEX "_checklists_v_version_steps_icon_idx" ON "_checklists_v_version_steps" USING btree ("icon_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "checklists_steps" DROP CONSTRAINT "checklists_steps_icon_id_media_id_fk";
  
  ALTER TABLE "_checklists_v_version_steps" DROP CONSTRAINT "_checklists_v_version_steps_icon_id_media_id_fk";
  
  DROP INDEX "checklists_steps_icon_idx";
  DROP INDEX "_checklists_v_version_steps_icon_idx";
  ALTER TABLE "checklists_steps_needs" DROP COLUMN "category";
  ALTER TABLE "checklists_steps_needs" DROP COLUMN "counts_in_total";
  ALTER TABLE "checklists_steps_needs_locales" DROP COLUMN "label";
  ALTER TABLE "checklists_steps" DROP COLUMN "icon_id";
  ALTER TABLE "_checklists_v_version_steps_needs" DROP COLUMN "category";
  ALTER TABLE "_checklists_v_version_steps_needs" DROP COLUMN "counts_in_total";
  ALTER TABLE "_checklists_v_version_steps_needs_locales" DROP COLUMN "label";
  ALTER TABLE "_checklists_v_version_steps" DROP COLUMN "icon_id";
  DROP TYPE "public"."enum_checklists_steps_needs_category";
  DROP TYPE "public"."enum__checklists_v_version_steps_needs_category";`)
}
