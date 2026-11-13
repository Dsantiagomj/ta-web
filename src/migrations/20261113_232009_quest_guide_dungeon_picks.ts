import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "quest_guides_summary_needs_dungeons" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"dungeon_id" integer
  );
  
  CREATE TABLE "quest_guides_summary_needs_dungeons_locales" (
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_quest_guides_v_version_summary_needs_dungeons" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"dungeon_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_quest_guides_v_version_summary_needs_dungeons_locales" (
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "quest_guides_summary_needs_dungeons" ADD CONSTRAINT "quest_guides_summary_needs_dungeons_dungeon_id_dungeons_id_fk" FOREIGN KEY ("dungeon_id") REFERENCES "public"."dungeons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "quest_guides_summary_needs_dungeons" ADD CONSTRAINT "quest_guides_summary_needs_dungeons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quest_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quest_guides_summary_needs_dungeons_locales" ADD CONSTRAINT "quest_guides_summary_needs_dungeons_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quest_guides_summary_needs_dungeons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_quest_guides_v_version_summary_needs_dungeons" ADD CONSTRAINT "_quest_guides_v_version_summary_needs_dungeons_dungeon_id_dungeons_id_fk" FOREIGN KEY ("dungeon_id") REFERENCES "public"."dungeons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_quest_guides_v_version_summary_needs_dungeons" ADD CONSTRAINT "_quest_guides_v_version_summary_needs_dungeons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_quest_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_quest_guides_v_version_summary_needs_dungeons_locales" ADD CONSTRAINT "_quest_guides_v_version_summary_needs_dungeons_locales_pa_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_quest_guides_v_version_summary_needs_dungeons"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "quest_guides_summary_needs_dungeons_order_idx" ON "quest_guides_summary_needs_dungeons" USING btree ("_order");
  CREATE INDEX "quest_guides_summary_needs_dungeons_parent_id_idx" ON "quest_guides_summary_needs_dungeons" USING btree ("_parent_id");
  CREATE INDEX "quest_guides_summary_needs_dungeons_dungeon_idx" ON "quest_guides_summary_needs_dungeons" USING btree ("dungeon_id");
  CREATE UNIQUE INDEX "quest_guides_summary_needs_dungeons_locales_locale_parent_id" ON "quest_guides_summary_needs_dungeons_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "quest_guides_summary_needs_dungeons_locales_parent_id_idx" ON "quest_guides_summary_needs_dungeons_locales" USING btree ("_parent_id");
  CREATE INDEX "_quest_guides_v_version_summary_needs_dungeons_order_idx" ON "_quest_guides_v_version_summary_needs_dungeons" USING btree ("_order");
  CREATE INDEX "_quest_guides_v_version_summary_needs_dungeons_parent_id_idx" ON "_quest_guides_v_version_summary_needs_dungeons" USING btree ("_parent_id");
  CREATE INDEX "_quest_guides_v_version_summary_needs_dungeons_dungeon_idx" ON "_quest_guides_v_version_summary_needs_dungeons" USING btree ("dungeon_id");
  CREATE UNIQUE INDEX "_quest_guides_v_version_summary_needs_dungeons_locales_local" ON "_quest_guides_v_version_summary_needs_dungeons_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_quest_guides_v_version_summary_needs_dungeons_locales_p_idx" ON "_quest_guides_v_version_summary_needs_dungeons_locales" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "quest_guides_summary_needs_dungeons" CASCADE;
  DROP TABLE "quest_guides_summary_needs_dungeons_locales" CASCADE;
  DROP TABLE "_quest_guides_v_version_summary_needs_dungeons" CASCADE;
  DROP TABLE "_quest_guides_v_version_summary_needs_dungeons_locales" CASCADE;`)
}
