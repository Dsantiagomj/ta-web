import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "quests" ADD COLUMN "correction_level" numeric;
  ALTER TABLE "quests" ADD COLUMN "corrected" boolean DEFAULT false;
  ALTER TABLE "quests_locales" ADD COLUMN "correction_name" varchar;
  ALTER TABLE "items" ADD COLUMN "correction_level" numeric;
  ALTER TABLE "items" ADD COLUMN "correction_image_id" integer;
  ALTER TABLE "items" ADD COLUMN "correction_hidden" boolean;
  ALTER TABLE "items" ADD COLUMN "corrected" boolean DEFAULT false;
  ALTER TABLE "items_locales" ADD COLUMN "correction_name" varchar;
  ALTER TABLE "monsters" ADD COLUMN "correction_level" numeric;
  ALTER TABLE "monsters" ADD COLUMN "correction_image_id" integer;
  ALTER TABLE "monsters" ADD COLUMN "correction_hidden" boolean;
  ALTER TABLE "monsters" ADD COLUMN "corrected" boolean DEFAULT false;
  ALTER TABLE "monsters_locales" ADD COLUMN "correction_name" varchar;
  ALTER TABLE "dungeons" ADD COLUMN "correction_level" numeric;
  ALTER TABLE "dungeons" ADD COLUMN "correction_image_id" integer;
  ALTER TABLE "dungeons" ADD COLUMN "correction_hidden" boolean;
  ALTER TABLE "dungeons" ADD COLUMN "corrected" boolean DEFAULT false;
  ALTER TABLE "dungeons_locales" ADD COLUMN "correction_name" varchar;
  ALTER TABLE "npcs" ADD COLUMN "correction_image_id" integer;
  ALTER TABLE "npcs" ADD COLUMN "correction_hidden" boolean;
  ALTER TABLE "npcs" ADD COLUMN "corrected" boolean DEFAULT false;
  ALTER TABLE "npcs_locales" ADD COLUMN "correction_name" varchar;
  ALTER TABLE "achievements" ADD COLUMN "correction_level" numeric;
  ALTER TABLE "achievements" ADD COLUMN "correction_image_id" integer;
  ALTER TABLE "achievements" ADD COLUMN "correction_hidden" boolean;
  ALTER TABLE "achievements" ADD COLUMN "corrected" boolean DEFAULT false;
  ALTER TABLE "achievements_locales" ADD COLUMN "correction_name" varchar;
  ALTER TABLE "items" ADD CONSTRAINT "items_correction_image_id_media_id_fk" FOREIGN KEY ("correction_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "monsters" ADD CONSTRAINT "monsters_correction_image_id_media_id_fk" FOREIGN KEY ("correction_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "dungeons" ADD CONSTRAINT "dungeons_correction_image_id_media_id_fk" FOREIGN KEY ("correction_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "npcs" ADD CONSTRAINT "npcs_correction_image_id_media_id_fk" FOREIGN KEY ("correction_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "achievements" ADD CONSTRAINT "achievements_correction_image_id_media_id_fk" FOREIGN KEY ("correction_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "quests_corrected_idx" ON "quests" USING btree ("corrected");
  CREATE INDEX "items_correction_correction_image_idx" ON "items" USING btree ("correction_image_id");
  CREATE INDEX "items_corrected_idx" ON "items" USING btree ("corrected");
  CREATE INDEX "monsters_correction_correction_image_idx" ON "monsters" USING btree ("correction_image_id");
  CREATE INDEX "monsters_corrected_idx" ON "monsters" USING btree ("corrected");
  CREATE INDEX "dungeons_correction_correction_image_idx" ON "dungeons" USING btree ("correction_image_id");
  CREATE INDEX "dungeons_corrected_idx" ON "dungeons" USING btree ("corrected");
  CREATE INDEX "npcs_correction_correction_image_idx" ON "npcs" USING btree ("correction_image_id");
  CREATE INDEX "npcs_corrected_idx" ON "npcs" USING btree ("corrected");
  CREATE INDEX "achievements_correction_correction_image_idx" ON "achievements" USING btree ("correction_image_id");
  CREATE INDEX "achievements_corrected_idx" ON "achievements" USING btree ("corrected");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "items" DROP CONSTRAINT "items_correction_image_id_media_id_fk";
  
  ALTER TABLE "monsters" DROP CONSTRAINT "monsters_correction_image_id_media_id_fk";
  
  ALTER TABLE "dungeons" DROP CONSTRAINT "dungeons_correction_image_id_media_id_fk";
  
  ALTER TABLE "npcs" DROP CONSTRAINT "npcs_correction_image_id_media_id_fk";
  
  ALTER TABLE "achievements" DROP CONSTRAINT "achievements_correction_image_id_media_id_fk";
  
  DROP INDEX "quests_corrected_idx";
  DROP INDEX "items_correction_correction_image_idx";
  DROP INDEX "items_corrected_idx";
  DROP INDEX "monsters_correction_correction_image_idx";
  DROP INDEX "monsters_corrected_idx";
  DROP INDEX "dungeons_correction_correction_image_idx";
  DROP INDEX "dungeons_corrected_idx";
  DROP INDEX "npcs_correction_correction_image_idx";
  DROP INDEX "npcs_corrected_idx";
  DROP INDEX "achievements_correction_correction_image_idx";
  DROP INDEX "achievements_corrected_idx";
  ALTER TABLE "quests" DROP COLUMN "correction_level";
  ALTER TABLE "quests" DROP COLUMN "corrected";
  ALTER TABLE "quests_locales" DROP COLUMN "correction_name";
  ALTER TABLE "items" DROP COLUMN "correction_level";
  ALTER TABLE "items" DROP COLUMN "correction_image_id";
  ALTER TABLE "items" DROP COLUMN "correction_hidden";
  ALTER TABLE "items" DROP COLUMN "corrected";
  ALTER TABLE "items_locales" DROP COLUMN "correction_name";
  ALTER TABLE "monsters" DROP COLUMN "correction_level";
  ALTER TABLE "monsters" DROP COLUMN "correction_image_id";
  ALTER TABLE "monsters" DROP COLUMN "correction_hidden";
  ALTER TABLE "monsters" DROP COLUMN "corrected";
  ALTER TABLE "monsters_locales" DROP COLUMN "correction_name";
  ALTER TABLE "dungeons" DROP COLUMN "correction_level";
  ALTER TABLE "dungeons" DROP COLUMN "correction_image_id";
  ALTER TABLE "dungeons" DROP COLUMN "correction_hidden";
  ALTER TABLE "dungeons" DROP COLUMN "corrected";
  ALTER TABLE "dungeons_locales" DROP COLUMN "correction_name";
  ALTER TABLE "npcs" DROP COLUMN "correction_image_id";
  ALTER TABLE "npcs" DROP COLUMN "correction_hidden";
  ALTER TABLE "npcs" DROP COLUMN "corrected";
  ALTER TABLE "npcs_locales" DROP COLUMN "correction_name";
  ALTER TABLE "achievements" DROP COLUMN "correction_level";
  ALTER TABLE "achievements" DROP COLUMN "correction_image_id";
  ALTER TABLE "achievements" DROP COLUMN "correction_hidden";
  ALTER TABLE "achievements" DROP COLUMN "corrected";
  ALTER TABLE "achievements_locales" DROP COLUMN "correction_name";`)
}
