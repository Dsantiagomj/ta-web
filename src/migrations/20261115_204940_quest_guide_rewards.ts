import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "quest_guides_summary_reward_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item_id" integer,
  	"quantity" numeric DEFAULT 1
  );
  
  CREATE TABLE "_quest_guides_v_version_summary_reward_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"item_id" integer,
  	"quantity" numeric DEFAULT 1,
  	"_uuid" varchar
  );
  
  ALTER TABLE "quest_guides" ADD COLUMN "summary_reward_experience" numeric;
  ALTER TABLE "quest_guides" ADD COLUMN "summary_reward_experience_min" numeric;
  ALTER TABLE "quest_guides" ADD COLUMN "summary_reward_kamas" numeric;
  ALTER TABLE "quest_guides_locales" ADD COLUMN "summary_reward_notes" varchar;
  ALTER TABLE "_quest_guides_v" ADD COLUMN "version_summary_reward_experience" numeric;
  ALTER TABLE "_quest_guides_v" ADD COLUMN "version_summary_reward_experience_min" numeric;
  ALTER TABLE "_quest_guides_v" ADD COLUMN "version_summary_reward_kamas" numeric;
  ALTER TABLE "_quest_guides_v_locales" ADD COLUMN "version_summary_reward_notes" varchar;
  ALTER TABLE "quest_guides_summary_reward_items" ADD CONSTRAINT "quest_guides_summary_reward_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "quest_guides_summary_reward_items" ADD CONSTRAINT "quest_guides_summary_reward_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quest_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_quest_guides_v_version_summary_reward_items" ADD CONSTRAINT "_quest_guides_v_version_summary_reward_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_quest_guides_v_version_summary_reward_items" ADD CONSTRAINT "_quest_guides_v_version_summary_reward_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_quest_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "quest_guides_summary_reward_items_order_idx" ON "quest_guides_summary_reward_items" USING btree ("_order");
  CREATE INDEX "quest_guides_summary_reward_items_parent_id_idx" ON "quest_guides_summary_reward_items" USING btree ("_parent_id");
  CREATE INDEX "quest_guides_summary_reward_items_item_idx" ON "quest_guides_summary_reward_items" USING btree ("item_id");
  CREATE INDEX "_quest_guides_v_version_summary_reward_items_order_idx" ON "_quest_guides_v_version_summary_reward_items" USING btree ("_order");
  CREATE INDEX "_quest_guides_v_version_summary_reward_items_parent_id_idx" ON "_quest_guides_v_version_summary_reward_items" USING btree ("_parent_id");
  CREATE INDEX "_quest_guides_v_version_summary_reward_items_item_idx" ON "_quest_guides_v_version_summary_reward_items" USING btree ("item_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "quest_guides_summary_reward_items" CASCADE;
  DROP TABLE "_quest_guides_v_version_summary_reward_items" CASCADE;
  ALTER TABLE "quest_guides" DROP COLUMN "summary_reward_experience";
  ALTER TABLE "quest_guides" DROP COLUMN "summary_reward_experience_min";
  ALTER TABLE "quest_guides" DROP COLUMN "summary_reward_kamas";
  ALTER TABLE "quest_guides_locales" DROP COLUMN "summary_reward_notes";
  ALTER TABLE "_quest_guides_v" DROP COLUMN "version_summary_reward_experience";
  ALTER TABLE "_quest_guides_v" DROP COLUMN "version_summary_reward_experience_min";
  ALTER TABLE "_quest_guides_v" DROP COLUMN "version_summary_reward_kamas";
  ALTER TABLE "_quest_guides_v_locales" DROP COLUMN "version_summary_reward_notes";`)
}
