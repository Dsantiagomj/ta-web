import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "quests_rewards_by_level_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item_id" integer NOT NULL,
  	"quantity" numeric NOT NULL
  );
  
  CREATE TABLE "quests_rewards_by_level" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"level_min" numeric NOT NULL,
  	"level_max" numeric NOT NULL,
  	"experience" numeric,
  	"kamas" numeric
  );
  
  ALTER TABLE "quests_rewards_by_level_items" ADD CONSTRAINT "quests_rewards_by_level_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "quests_rewards_by_level_items" ADD CONSTRAINT "quests_rewards_by_level_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quests_rewards_by_level"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quests_rewards_by_level" ADD CONSTRAINT "quests_rewards_by_level_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "quests_rewards_by_level_items_order_idx" ON "quests_rewards_by_level_items" USING btree ("_order");
  CREATE INDEX "quests_rewards_by_level_items_parent_id_idx" ON "quests_rewards_by_level_items" USING btree ("_parent_id");
  CREATE INDEX "quests_rewards_by_level_items_item_idx" ON "quests_rewards_by_level_items" USING btree ("item_id");
  CREATE INDEX "quests_rewards_by_level_order_idx" ON "quests_rewards_by_level" USING btree ("_order");
  CREATE INDEX "quests_rewards_by_level_parent_id_idx" ON "quests_rewards_by_level" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "quests_rewards_by_level_items" CASCADE;
  DROP TABLE "quests_rewards_by_level" CASCADE;`)
}
