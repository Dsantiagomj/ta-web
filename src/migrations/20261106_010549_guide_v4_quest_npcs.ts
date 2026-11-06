import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "npcs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"dofus_id" numeric NOT NULL,
  	"look" varchar,
  	"render_right_id" integer,
  	"render_left_id" integer,
  	"refreshed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "npcs_locales" (
  	"name" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "media" ADD COLUMN "game_asset" varchar;
  ALTER TABLE "quests" ADD COLUMN "achievement_dofus_id" numeric;
  ALTER TABLE "quests" ADD COLUMN "achievement_slug" varchar;
  ALTER TABLE "quests" ADD COLUMN "achievement_position" numeric;
  ALTER TABLE "quests" ADD COLUMN "achievement_total" numeric;
  ALTER TABLE "quests" ADD COLUMN "rewards_experience_min" numeric;
  ALTER TABLE "quests_locales" ADD COLUMN "zone" varchar;
  ALTER TABLE "quests_locales" ADD COLUMN "achievement_name" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "npcs_id" integer;
  ALTER TABLE "npcs" ADD CONSTRAINT "npcs_render_right_id_media_id_fk" FOREIGN KEY ("render_right_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "npcs" ADD CONSTRAINT "npcs_render_left_id_media_id_fk" FOREIGN KEY ("render_left_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "npcs_locales" ADD CONSTRAINT "npcs_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."npcs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "npcs_dofus_id_idx" ON "npcs" USING btree ("dofus_id");
  CREATE INDEX "npcs_render_right_idx" ON "npcs" USING btree ("render_right_id");
  CREATE INDEX "npcs_render_left_idx" ON "npcs" USING btree ("render_left_id");
  CREATE INDEX "npcs_updated_at_idx" ON "npcs" USING btree ("updated_at");
  CREATE INDEX "npcs_created_at_idx" ON "npcs" USING btree ("created_at");
  CREATE UNIQUE INDEX "npcs_locales_locale_parent_id_unique" ON "npcs_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "npcs_locales_parent_id_idx" ON "npcs_locales" USING btree ("_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_npcs_fk" FOREIGN KEY ("npcs_id") REFERENCES "public"."npcs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "media_game_asset_idx" ON "media" USING btree ("game_asset");
  CREATE INDEX "payload_locked_documents_rels_npcs_id_idx" ON "payload_locked_documents_rels" USING btree ("npcs_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "npcs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "npcs_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "npcs" CASCADE;
  DROP TABLE "npcs_locales" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_npcs_fk";
  
  DROP INDEX "media_game_asset_idx";
  DROP INDEX "payload_locked_documents_rels_npcs_id_idx";
  ALTER TABLE "media" DROP COLUMN "game_asset";
  ALTER TABLE "quests" DROP COLUMN "achievement_dofus_id";
  ALTER TABLE "quests" DROP COLUMN "achievement_slug";
  ALTER TABLE "quests" DROP COLUMN "achievement_position";
  ALTER TABLE "quests" DROP COLUMN "achievement_total";
  ALTER TABLE "quests" DROP COLUMN "rewards_experience_min";
  ALTER TABLE "quests_locales" DROP COLUMN "zone";
  ALTER TABLE "quests_locales" DROP COLUMN "achievement_name";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "npcs_id";`)
}
