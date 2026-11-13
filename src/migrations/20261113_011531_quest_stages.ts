import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_quests_stages_objectives_kind" AS ENUM('free', 'npc', 'bring', 'fight', 'map', 'craft');
  CREATE TABLE "quests_stages_objectives" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"dofus_id" numeric NOT NULL,
  	"kind" "enum_quests_stages_objectives_kind" NOT NULL,
  	"npc_id" numeric,
  	"monster_id" numeric,
  	"item_id" numeric,
  	"quantity" numeric,
  	"map_id" numeric,
  	"x" numeric,
  	"y" numeric,
  	"sub_area_id" numeric
  );
  
  CREATE TABLE "quests_stages_objectives_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "quests_stages" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"dofus_id" numeric NOT NULL
  );
  
  CREATE TABLE "quests_stages_locales" (
  	"name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  ALTER TABLE "quests_stages_objectives" ADD CONSTRAINT "quests_stages_objectives_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quests_stages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quests_stages_objectives_locales" ADD CONSTRAINT "quests_stages_objectives_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quests_stages_objectives"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quests_stages" ADD CONSTRAINT "quests_stages_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quests_stages_locales" ADD CONSTRAINT "quests_stages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quests_stages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "quests_stages_objectives_order_idx" ON "quests_stages_objectives" USING btree ("_order");
  CREATE INDEX "quests_stages_objectives_parent_id_idx" ON "quests_stages_objectives" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "quests_stages_objectives_locales_locale_parent_id_unique" ON "quests_stages_objectives_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "quests_stages_objectives_locales_parent_id_idx" ON "quests_stages_objectives_locales" USING btree ("_parent_id");
  CREATE INDEX "quests_stages_order_idx" ON "quests_stages" USING btree ("_order");
  CREATE INDEX "quests_stages_parent_id_idx" ON "quests_stages" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "quests_stages_locales_locale_parent_id_unique" ON "quests_stages_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "quests_stages_locales_parent_id_idx" ON "quests_stages_locales" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "quests_stages_objectives" CASCADE;
  DROP TABLE "quests_stages_objectives_locales" CASCADE;
  DROP TABLE "quests_stages" CASCADE;
  DROP TABLE "quests_stages_locales" CASCADE;
  DROP TYPE "public"."enum_quests_stages_objectives_kind";`)
}
