import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "quest_guides_blocks_step" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"x" numeric,
  	"y" numeric,
  	"block_name" varchar
  );
  
  CREATE TABLE "quest_guides_blocks_step_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_quest_guides_v_blocks_step" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"x" numeric,
  	"y" numeric,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_quest_guides_v_blocks_step_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "quest_guides_blocks_step" ADD CONSTRAINT "quest_guides_blocks_step_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quest_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quest_guides_blocks_step_locales" ADD CONSTRAINT "quest_guides_blocks_step_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quest_guides_blocks_step"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_quest_guides_v_blocks_step" ADD CONSTRAINT "_quest_guides_v_blocks_step_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_quest_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_quest_guides_v_blocks_step_locales" ADD CONSTRAINT "_quest_guides_v_blocks_step_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_quest_guides_v_blocks_step"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "quest_guides_blocks_step_order_idx" ON "quest_guides_blocks_step" USING btree ("_order");
  CREATE INDEX "quest_guides_blocks_step_parent_id_idx" ON "quest_guides_blocks_step" USING btree ("_parent_id");
  CREATE INDEX "quest_guides_blocks_step_path_idx" ON "quest_guides_blocks_step" USING btree ("_path");
  CREATE UNIQUE INDEX "quest_guides_blocks_step_locales_locale_parent_id_unique" ON "quest_guides_blocks_step_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "quest_guides_blocks_step_locales_parent_id_idx" ON "quest_guides_blocks_step_locales" USING btree ("_parent_id");
  CREATE INDEX "_quest_guides_v_blocks_step_order_idx" ON "_quest_guides_v_blocks_step" USING btree ("_order");
  CREATE INDEX "_quest_guides_v_blocks_step_parent_id_idx" ON "_quest_guides_v_blocks_step" USING btree ("_parent_id");
  CREATE INDEX "_quest_guides_v_blocks_step_path_idx" ON "_quest_guides_v_blocks_step" USING btree ("_path");
  CREATE UNIQUE INDEX "_quest_guides_v_blocks_step_locales_locale_parent_id_unique" ON "_quest_guides_v_blocks_step_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_quest_guides_v_blocks_step_locales_parent_id_idx" ON "_quest_guides_v_blocks_step_locales" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "quest_guides_blocks_step" CASCADE;
  DROP TABLE "quest_guides_blocks_step_locales" CASCADE;
  DROP TABLE "_quest_guides_v_blocks_step" CASCADE;
  DROP TABLE "_quest_guides_v_blocks_step_locales" CASCADE;`)
}
