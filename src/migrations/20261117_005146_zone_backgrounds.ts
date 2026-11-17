import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "quest_guides" ADD COLUMN "background_id" integer;
  ALTER TABLE "_quest_guides_v" ADD COLUMN "version_background_id" integer;
  ALTER TABLE "achievement_pages" ADD COLUMN "background_id" integer;
  ALTER TABLE "_achievement_pages_v" ADD COLUMN "version_background_id" integer;
  ALTER TABLE "quests_start_positions" ADD COLUMN "sub_area_id" numeric;
  ALTER TABLE "subareas" ADD COLUMN "background_id" integer;
  ALTER TABLE "subareas" ADD COLUMN "background_map_id" numeric;
  ALTER TABLE "quest_guides" ADD CONSTRAINT "quest_guides_background_id_media_id_fk" FOREIGN KEY ("background_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_quest_guides_v" ADD CONSTRAINT "_quest_guides_v_version_background_id_media_id_fk" FOREIGN KEY ("version_background_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "achievement_pages" ADD CONSTRAINT "achievement_pages_background_id_media_id_fk" FOREIGN KEY ("background_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_achievement_pages_v" ADD CONSTRAINT "_achievement_pages_v_version_background_id_media_id_fk" FOREIGN KEY ("version_background_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "subareas" ADD CONSTRAINT "subareas_background_id_media_id_fk" FOREIGN KEY ("background_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "quest_guides_background_idx" ON "quest_guides" USING btree ("background_id");
  CREATE INDEX "_quest_guides_v_version_version_background_idx" ON "_quest_guides_v" USING btree ("version_background_id");
  CREATE INDEX "achievement_pages_background_idx" ON "achievement_pages" USING btree ("background_id");
  CREATE INDEX "_achievement_pages_v_version_version_background_idx" ON "_achievement_pages_v" USING btree ("version_background_id");
  CREATE INDEX "subareas_background_idx" ON "subareas" USING btree ("background_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "quest_guides" DROP CONSTRAINT "quest_guides_background_id_media_id_fk";
  
  ALTER TABLE "_quest_guides_v" DROP CONSTRAINT "_quest_guides_v_version_background_id_media_id_fk";
  
  ALTER TABLE "achievement_pages" DROP CONSTRAINT "achievement_pages_background_id_media_id_fk";
  
  ALTER TABLE "_achievement_pages_v" DROP CONSTRAINT "_achievement_pages_v_version_background_id_media_id_fk";
  
  ALTER TABLE "subareas" DROP CONSTRAINT "subareas_background_id_media_id_fk";
  
  DROP INDEX "quest_guides_background_idx";
  DROP INDEX "_quest_guides_v_version_version_background_idx";
  DROP INDEX "achievement_pages_background_idx";
  DROP INDEX "_achievement_pages_v_version_version_background_idx";
  DROP INDEX "subareas_background_idx";
  ALTER TABLE "quest_guides" DROP COLUMN "background_id";
  ALTER TABLE "_quest_guides_v" DROP COLUMN "version_background_id";
  ALTER TABLE "achievement_pages" DROP COLUMN "background_id";
  ALTER TABLE "_achievement_pages_v" DROP COLUMN "version_background_id";
  ALTER TABLE "quests_start_positions" DROP COLUMN "sub_area_id";
  ALTER TABLE "subareas" DROP COLUMN "background_id";
  ALTER TABLE "subareas" DROP COLUMN "background_map_id";`)
}
