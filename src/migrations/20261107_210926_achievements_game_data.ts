import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "achievement_categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"dofus_id" numeric NOT NULL,
  	"parent_id" integer,
  	"order" numeric,
  	"refreshed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "achievement_categories_locales" (
  	"name" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "achievements_quests" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "achievements_quests_locales" (
  	"name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "achievements_rewards_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item_id" integer NOT NULL,
  	"quantity" numeric NOT NULL
  );
  
  CREATE TABLE "achievements_counts_for" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"dofus_id" numeric,
  	"points" numeric,
  	"achievements" numeric,
  	"icon_id" integer
  );
  
  CREATE TABLE "achievements_counts_for_locales" (
  	"name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "achievements" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"dofus_id" numeric NOT NULL,
  	"icon_id" integer,
  	"points" numeric,
  	"level" numeric,
  	"order" numeric,
  	"category_id" integer,
  	"rewards_experience" numeric,
  	"rewards_kamas" numeric,
  	"refreshed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "achievements_locales" (
  	"name" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "achievements_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"quests_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "achievement_categories_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "achievements_id" integer;
  ALTER TABLE "achievement_categories" ADD CONSTRAINT "achievement_categories_parent_id_achievement_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."achievement_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "achievement_categories_locales" ADD CONSTRAINT "achievement_categories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."achievement_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "achievements_quests" ADD CONSTRAINT "achievements_quests_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "achievements_quests_locales" ADD CONSTRAINT "achievements_quests_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."achievements_quests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "achievements_rewards_items" ADD CONSTRAINT "achievements_rewards_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "achievements_rewards_items" ADD CONSTRAINT "achievements_rewards_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "achievements_counts_for" ADD CONSTRAINT "achievements_counts_for_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "achievements_counts_for" ADD CONSTRAINT "achievements_counts_for_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "achievements_counts_for_locales" ADD CONSTRAINT "achievements_counts_for_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."achievements_counts_for"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "achievements" ADD CONSTRAINT "achievements_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "achievements" ADD CONSTRAINT "achievements_category_id_achievement_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."achievement_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "achievements_locales" ADD CONSTRAINT "achievements_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "achievements_rels" ADD CONSTRAINT "achievements_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "achievements_rels" ADD CONSTRAINT "achievements_rels_quests_fk" FOREIGN KEY ("quests_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "achievement_categories_dofus_id_idx" ON "achievement_categories" USING btree ("dofus_id");
  CREATE INDEX "achievement_categories_parent_idx" ON "achievement_categories" USING btree ("parent_id");
  CREATE INDEX "achievement_categories_updated_at_idx" ON "achievement_categories" USING btree ("updated_at");
  CREATE INDEX "achievement_categories_created_at_idx" ON "achievement_categories" USING btree ("created_at");
  CREATE UNIQUE INDEX "achievement_categories_locales_locale_parent_id_unique" ON "achievement_categories_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "achievement_categories_locales_parent_id_idx" ON "achievement_categories_locales" USING btree ("_parent_id");
  CREATE INDEX "achievements_quests_order_idx" ON "achievements_quests" USING btree ("_order");
  CREATE INDEX "achievements_quests_parent_id_idx" ON "achievements_quests" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "achievements_quests_locales_locale_parent_id_unique" ON "achievements_quests_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "achievements_quests_locales_parent_id_idx" ON "achievements_quests_locales" USING btree ("_parent_id");
  CREATE INDEX "achievements_rewards_items_order_idx" ON "achievements_rewards_items" USING btree ("_order");
  CREATE INDEX "achievements_rewards_items_parent_id_idx" ON "achievements_rewards_items" USING btree ("_parent_id");
  CREATE INDEX "achievements_rewards_items_item_idx" ON "achievements_rewards_items" USING btree ("item_id");
  CREATE INDEX "achievements_counts_for_order_idx" ON "achievements_counts_for" USING btree ("_order");
  CREATE INDEX "achievements_counts_for_parent_id_idx" ON "achievements_counts_for" USING btree ("_parent_id");
  CREATE INDEX "achievements_counts_for_icon_idx" ON "achievements_counts_for" USING btree ("icon_id");
  CREATE UNIQUE INDEX "achievements_counts_for_locales_locale_parent_id_unique" ON "achievements_counts_for_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "achievements_counts_for_locales_parent_id_idx" ON "achievements_counts_for_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "achievements_dofus_id_idx" ON "achievements" USING btree ("dofus_id");
  CREATE INDEX "achievements_icon_idx" ON "achievements" USING btree ("icon_id");
  CREATE INDEX "achievements_category_idx" ON "achievements" USING btree ("category_id");
  CREATE INDEX "achievements_updated_at_idx" ON "achievements" USING btree ("updated_at");
  CREATE INDEX "achievements_created_at_idx" ON "achievements" USING btree ("created_at");
  CREATE UNIQUE INDEX "achievements_locales_locale_parent_id_unique" ON "achievements_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "achievements_locales_parent_id_idx" ON "achievements_locales" USING btree ("_parent_id");
  CREATE INDEX "achievements_rels_order_idx" ON "achievements_rels" USING btree ("order");
  CREATE INDEX "achievements_rels_parent_idx" ON "achievements_rels" USING btree ("parent_id");
  CREATE INDEX "achievements_rels_path_idx" ON "achievements_rels" USING btree ("path");
  CREATE INDEX "achievements_rels_quests_id_idx" ON "achievements_rels" USING btree ("quests_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_achievement_categories_fk" FOREIGN KEY ("achievement_categories_id") REFERENCES "public"."achievement_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_achievements_fk" FOREIGN KEY ("achievements_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_achievement_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("achievement_categories_id");
  CREATE INDEX "payload_locked_documents_rels_achievements_id_idx" ON "payload_locked_documents_rels" USING btree ("achievements_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "achievement_categories" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "achievement_categories_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "achievements_quests" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "achievements_quests_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "achievements_rewards_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "achievements_counts_for" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "achievements_counts_for_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "achievements" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "achievements_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "achievements_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "achievement_categories" CASCADE;
  DROP TABLE "achievement_categories_locales" CASCADE;
  DROP TABLE "achievements_quests" CASCADE;
  DROP TABLE "achievements_quests_locales" CASCADE;
  DROP TABLE "achievements_rewards_items" CASCADE;
  DROP TABLE "achievements_counts_for" CASCADE;
  DROP TABLE "achievements_counts_for_locales" CASCADE;
  DROP TABLE "achievements" CASCADE;
  DROP TABLE "achievements_locales" CASCADE;
  DROP TABLE "achievements_rels" CASCADE;
  -- DROP TABLE "achievement_categories" CASCADE ya quita esta clave foránea.
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_achievement_categories_fk";
  
  -- DROP TABLE "achievements" CASCADE ya quita esta clave foránea.
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_achievements_fk";
  
  DROP INDEX "payload_locked_documents_rels_achievement_categories_id_idx";
  DROP INDEX "payload_locked_documents_rels_achievements_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "achievement_categories_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "achievements_id";`)
}
