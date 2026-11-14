import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "checklists_index" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"teaser_enabled" boolean DEFAULT true,
  	"teaser_scene_id" integer,
  	"teaser_egg_id" integer,
  	"import_snapshot" jsonb,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "checklists_index_locales" (
  	"teaser_label" varchar DEFAULT 'En camino',
  	"teaser_text" varchar DEFAULT '???',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "checklists" ADD COLUMN "card_scene_id" integer;
  ALTER TABLE "checklists" ADD COLUMN "card_npc_id" integer;
  ALTER TABLE "checklists" ADD COLUMN "card_npc_height" numeric;
  ALTER TABLE "checklists" ADD COLUMN "card_npc_right" numeric;
  ALTER TABLE "checklists" ADD COLUMN "card_npc_top" numeric;
  ALTER TABLE "checklists" ADD COLUMN "card_color" varchar;
  ALTER TABLE "_checklists_v" ADD COLUMN "version_card_scene_id" integer;
  ALTER TABLE "_checklists_v" ADD COLUMN "version_card_npc_id" integer;
  ALTER TABLE "_checklists_v" ADD COLUMN "version_card_npc_height" numeric;
  ALTER TABLE "_checklists_v" ADD COLUMN "version_card_npc_right" numeric;
  ALTER TABLE "_checklists_v" ADD COLUMN "version_card_npc_top" numeric;
  ALTER TABLE "_checklists_v" ADD COLUMN "version_card_color" varchar;
  ALTER TABLE "checklists_index" ADD CONSTRAINT "checklists_index_teaser_scene_id_media_id_fk" FOREIGN KEY ("teaser_scene_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "checklists_index" ADD CONSTRAINT "checklists_index_teaser_egg_id_media_id_fk" FOREIGN KEY ("teaser_egg_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "checklists_index_locales" ADD CONSTRAINT "checklists_index_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."checklists_index"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "checklists_index_teaser_teaser_scene_idx" ON "checklists_index" USING btree ("teaser_scene_id");
  CREATE INDEX "checklists_index_teaser_teaser_egg_idx" ON "checklists_index" USING btree ("teaser_egg_id");
  CREATE UNIQUE INDEX "checklists_index_locales_locale_parent_id_unique" ON "checklists_index_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "checklists_index_locales_parent_id_idx" ON "checklists_index_locales" USING btree ("_parent_id");
  ALTER TABLE "checklists" ADD CONSTRAINT "checklists_card_scene_id_media_id_fk" FOREIGN KEY ("card_scene_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "checklists" ADD CONSTRAINT "checklists_card_npc_id_media_id_fk" FOREIGN KEY ("card_npc_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_checklists_v" ADD CONSTRAINT "_checklists_v_version_card_scene_id_media_id_fk" FOREIGN KEY ("version_card_scene_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_checklists_v" ADD CONSTRAINT "_checklists_v_version_card_npc_id_media_id_fk" FOREIGN KEY ("version_card_npc_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "checklists_card_card_scene_idx" ON "checklists" USING btree ("card_scene_id");
  CREATE INDEX "checklists_card_card_npc_idx" ON "checklists" USING btree ("card_npc_id");
  CREATE INDEX "_checklists_v_version_card_version_card_scene_idx" ON "_checklists_v" USING btree ("version_card_scene_id");
  CREATE INDEX "_checklists_v_version_card_version_card_npc_idx" ON "_checklists_v" USING btree ("version_card_npc_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "checklists_index" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "checklists_index_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "checklists_index" CASCADE;
  DROP TABLE "checklists_index_locales" CASCADE;
  ALTER TABLE "checklists" DROP CONSTRAINT "checklists_card_scene_id_media_id_fk";
  
  ALTER TABLE "checklists" DROP CONSTRAINT "checklists_card_npc_id_media_id_fk";
  
  ALTER TABLE "_checklists_v" DROP CONSTRAINT "_checklists_v_version_card_scene_id_media_id_fk";
  
  ALTER TABLE "_checklists_v" DROP CONSTRAINT "_checklists_v_version_card_npc_id_media_id_fk";
  
  DROP INDEX "checklists_card_card_scene_idx";
  DROP INDEX "checklists_card_card_npc_idx";
  DROP INDEX "_checklists_v_version_card_version_card_scene_idx";
  DROP INDEX "_checklists_v_version_card_version_card_npc_idx";
  ALTER TABLE "checklists" DROP COLUMN "card_scene_id";
  ALTER TABLE "checklists" DROP COLUMN "card_npc_id";
  ALTER TABLE "checklists" DROP COLUMN "card_npc_height";
  ALTER TABLE "checklists" DROP COLUMN "card_npc_right";
  ALTER TABLE "checklists" DROP COLUMN "card_npc_top";
  ALTER TABLE "checklists" DROP COLUMN "card_color";
  ALTER TABLE "_checklists_v" DROP COLUMN "version_card_scene_id";
  ALTER TABLE "_checklists_v" DROP COLUMN "version_card_npc_id";
  ALTER TABLE "_checklists_v" DROP COLUMN "version_card_npc_height";
  ALTER TABLE "_checklists_v" DROP COLUMN "version_card_npc_right";
  ALTER TABLE "_checklists_v" DROP COLUMN "version_card_npc_top";
  ALTER TABLE "_checklists_v" DROP COLUMN "version_card_color";`)
}
