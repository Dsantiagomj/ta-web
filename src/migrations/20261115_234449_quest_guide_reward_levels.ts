import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "qg_reward_level_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item_id" integer,
  	"quantity" numeric DEFAULT 1
  );
  
  CREATE TABLE "quest_guides_summary_reward_levels" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"level_min" numeric,
  	"level_max" numeric,
  	"experience" numeric,
  	"kamas" numeric
  );
  
  CREATE TABLE "_qg_reward_level_items_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"item_id" integer,
  	"quantity" numeric DEFAULT 1,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_quest_guides_v_version_summary_reward_levels" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"level_min" numeric,
  	"level_max" numeric,
  	"experience" numeric,
  	"kamas" numeric,
  	"_uuid" varchar
  );
  
  ALTER TABLE "qg_reward_level_items" ADD CONSTRAINT "qg_reward_level_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "qg_reward_level_items" ADD CONSTRAINT "qg_reward_level_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quest_guides_summary_reward_levels"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quest_guides_summary_reward_levels" ADD CONSTRAINT "quest_guides_summary_reward_levels_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quest_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_qg_reward_level_items_v" ADD CONSTRAINT "_qg_reward_level_items_v_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_qg_reward_level_items_v" ADD CONSTRAINT "_qg_reward_level_items_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_quest_guides_v_version_summary_reward_levels"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_quest_guides_v_version_summary_reward_levels" ADD CONSTRAINT "_quest_guides_v_version_summary_reward_levels_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_quest_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "qg_reward_level_items_order_idx" ON "qg_reward_level_items" USING btree ("_order");
  CREATE INDEX "qg_reward_level_items_parent_id_idx" ON "qg_reward_level_items" USING btree ("_parent_id");
  CREATE INDEX "qg_reward_level_items_item_idx" ON "qg_reward_level_items" USING btree ("item_id");
  CREATE INDEX "quest_guides_summary_reward_levels_order_idx" ON "quest_guides_summary_reward_levels" USING btree ("_order");
  CREATE INDEX "quest_guides_summary_reward_levels_parent_id_idx" ON "quest_guides_summary_reward_levels" USING btree ("_parent_id");
  CREATE INDEX "_qg_reward_level_items_v_order_idx" ON "_qg_reward_level_items_v" USING btree ("_order");
  CREATE INDEX "_qg_reward_level_items_v_parent_id_idx" ON "_qg_reward_level_items_v" USING btree ("_parent_id");
  CREATE INDEX "_qg_reward_level_items_v_item_idx" ON "_qg_reward_level_items_v" USING btree ("item_id");
  CREATE INDEX "_quest_guides_v_version_summary_reward_levels_order_idx" ON "_quest_guides_v_version_summary_reward_levels" USING btree ("_order");
  CREATE INDEX "_quest_guides_v_version_summary_reward_levels_parent_id_idx" ON "_quest_guides_v_version_summary_reward_levels" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "qg_reward_level_items" CASCADE;
  DROP TABLE "quest_guides_summary_reward_levels" CASCADE;
  DROP TABLE "_qg_reward_level_items_v" CASCADE;
  DROP TABLE "_quest_guides_v_version_summary_reward_levels" CASCADE;`)
}
