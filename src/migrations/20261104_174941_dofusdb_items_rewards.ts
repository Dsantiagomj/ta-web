import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "quests_rewards_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item_id" integer NOT NULL,
  	"quantity" numeric NOT NULL
  );
  
  CREATE TABLE "quests_needs_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item_id" integer NOT NULL,
  	"quantity" numeric NOT NULL
  );
  
  CREATE TABLE "quests_needs_monsters" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"monster_id" integer NOT NULL,
  	"quantity" numeric NOT NULL
  );
  
  CREATE TABLE "quests_numbers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" numeric,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL
  );
  
  CREATE TABLE "items" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"dofus_id" numeric NOT NULL,
  	"level" numeric,
  	"type_id" numeric,
  	"icon_id" numeric,
  	"refreshed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "items_locales" (
  	"name" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "monsters" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"dofus_id" numeric NOT NULL,
  	"icon_id" numeric,
  	"refreshed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "monsters_locales" (
  	"name" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "quests" ADD COLUMN "rewards_experience" numeric;
  ALTER TABLE "quests" ADD COLUMN "rewards_kamas" numeric;
  ALTER TABLE "quests" ADD COLUMN "needs_walks_maps" boolean;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "items_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "monsters_id" integer;
  ALTER TABLE "quests_rewards_items" ADD CONSTRAINT "quests_rewards_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "quests_rewards_items" ADD CONSTRAINT "quests_rewards_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quests_needs_items" ADD CONSTRAINT "quests_needs_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "quests_needs_items" ADD CONSTRAINT "quests_needs_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quests_needs_monsters" ADD CONSTRAINT "quests_needs_monsters_monster_id_monsters_id_fk" FOREIGN KEY ("monster_id") REFERENCES "public"."monsters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "quests_needs_monsters" ADD CONSTRAINT "quests_needs_monsters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quests_numbers" ADD CONSTRAINT "quests_numbers_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "items_locales" ADD CONSTRAINT "items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "monsters_locales" ADD CONSTRAINT "monsters_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."monsters"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "quests_rewards_items_order_idx" ON "quests_rewards_items" USING btree ("_order");
  CREATE INDEX "quests_rewards_items_parent_id_idx" ON "quests_rewards_items" USING btree ("_parent_id");
  CREATE INDEX "quests_rewards_items_item_idx" ON "quests_rewards_items" USING btree ("item_id");
  CREATE INDEX "quests_needs_items_order_idx" ON "quests_needs_items" USING btree ("_order");
  CREATE INDEX "quests_needs_items_parent_id_idx" ON "quests_needs_items" USING btree ("_parent_id");
  CREATE INDEX "quests_needs_items_item_idx" ON "quests_needs_items" USING btree ("item_id");
  CREATE INDEX "quests_needs_monsters_order_idx" ON "quests_needs_monsters" USING btree ("_order");
  CREATE INDEX "quests_needs_monsters_parent_id_idx" ON "quests_needs_monsters" USING btree ("_parent_id");
  CREATE INDEX "quests_needs_monsters_monster_idx" ON "quests_needs_monsters" USING btree ("monster_id");
  CREATE INDEX "quests_numbers_order_parent_idx" ON "quests_numbers" USING btree ("order","parent_id");
  CREATE UNIQUE INDEX "items_dofus_id_idx" ON "items" USING btree ("dofus_id");
  CREATE INDEX "items_updated_at_idx" ON "items" USING btree ("updated_at");
  CREATE INDEX "items_created_at_idx" ON "items" USING btree ("created_at");
  CREATE UNIQUE INDEX "items_locales_locale_parent_id_unique" ON "items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "items_locales_parent_id_idx" ON "items_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "monsters_dofus_id_idx" ON "monsters" USING btree ("dofus_id");
  CREATE INDEX "monsters_updated_at_idx" ON "monsters" USING btree ("updated_at");
  CREATE INDEX "monsters_created_at_idx" ON "monsters" USING btree ("created_at");
  CREATE UNIQUE INDEX "monsters_locales_locale_parent_id_unique" ON "monsters_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "monsters_locales_parent_id_idx" ON "monsters_locales" USING btree ("_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_items_fk" FOREIGN KEY ("items_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_monsters_fk" FOREIGN KEY ("monsters_id") REFERENCES "public"."monsters"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_items_id_idx" ON "payload_locked_documents_rels" USING btree ("items_id");
  CREATE INDEX "payload_locked_documents_rels_monsters_id_idx" ON "payload_locked_documents_rels" USING btree ("monsters_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "quests_rewards_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "quests_needs_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "quests_needs_monsters" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "quests_numbers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "monsters" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "monsters_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "quests_rewards_items" CASCADE;
  DROP TABLE "quests_needs_items" CASCADE;
  DROP TABLE "quests_needs_monsters" CASCADE;
  DROP TABLE "quests_numbers" CASCADE;
  DROP TABLE "items" CASCADE;
  DROP TABLE "items_locales" CASCADE;
  DROP TABLE "monsters" CASCADE;
  DROP TABLE "monsters_locales" CASCADE;
  -- DROP TABLE "items" CASCADE y "monsters" CASCADE ya borraron
  -- payload_locked_documents_rels_items_fk y payload_locked_documents_rels_monsters_fk.
  DROP INDEX "payload_locked_documents_rels_items_id_idx";
  DROP INDEX "payload_locked_documents_rels_monsters_id_idx";
  ALTER TABLE "quests" DROP COLUMN "rewards_experience";
  ALTER TABLE "quests" DROP COLUMN "rewards_kamas";
  ALTER TABLE "quests" DROP COLUMN "needs_walks_maps";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "items_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "monsters_id";`)
}
