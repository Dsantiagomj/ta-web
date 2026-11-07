import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_achievement_pages_state" AS ENUM('published', 'preparing');
  CREATE TYPE "public"."enum_achievement_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__achievement_pages_v_version_state" AS ENUM('published', 'preparing');
  CREATE TYPE "public"."enum__achievement_pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__achievement_pages_v_published_locale" AS ENUM('es');
  CREATE TYPE "public"."enum_achievement_groups_state" AS ENUM('published', 'preparing');
  CREATE TYPE "public"."enum_achievement_groups_section" AS ENUM('stories', 'zones', 'seasonal');
  CREATE TYPE "public"."enum_achievement_groups_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__achievement_groups_v_version_state" AS ENUM('published', 'preparing');
  CREATE TYPE "public"."enum__achievement_groups_v_version_section" AS ENUM('stories', 'zones', 'seasonal');
  CREATE TYPE "public"."enum__achievement_groups_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__achievement_groups_v_published_locale" AS ENUM('es');
  CREATE TABLE "achievement_pages_quests" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "achievement_pages_quests_locales" (
  	"name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "achievement_pages_rewards_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item_id" integer,
  	"quantity" numeric
  );
  
  CREATE TABLE "achievement_pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"achievement_id" integer,
  	"slug" varchar,
  	"state" "enum_achievement_pages_state" DEFAULT 'preparing',
  	"group_id" integer,
  	"order" numeric,
  	"points" numeric,
  	"rewards_experience" numeric,
  	"rewards_kamas" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_achievement_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "achievement_pages_locales" (
  	"name" varchar,
  	"intro" jsonb,
  	"outro" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "achievement_pages_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"quests_id" integer
  );
  
  CREATE TABLE "_achievement_pages_v_version_quests" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_achievement_pages_v_version_quests_locales" (
  	"name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_achievement_pages_v_version_rewards_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"item_id" integer,
  	"quantity" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_achievement_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_achievement_id" integer,
  	"version_slug" varchar,
  	"version_state" "enum__achievement_pages_v_version_state" DEFAULT 'preparing',
  	"version_group_id" integer,
  	"version_order" numeric,
  	"version_points" numeric,
  	"version_rewards_experience" numeric,
  	"version_rewards_kamas" numeric,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__achievement_pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__achievement_pages_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_achievement_pages_v_locales" (
  	"version_name" varchar,
  	"version_intro" jsonb,
  	"version_outro" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_achievement_pages_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"quests_id" integer
  );
  
  CREATE TABLE "achievement_groups" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"category_id" integer,
  	"slug" varchar,
  	"state" "enum_achievement_groups_state" DEFAULT 'preparing',
  	"section" "enum_achievement_groups_section",
  	"order" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_achievement_groups_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "achievement_groups_locales" (
  	"name" varchar,
  	"intro" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "achievement_groups_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"npcs_id" integer,
  	"monsters_id" integer,
  	"quest_guides_id" integer
  );
  
  CREATE TABLE "_achievement_groups_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_category_id" integer,
  	"version_slug" varchar,
  	"version_state" "enum__achievement_groups_v_version_state" DEFAULT 'preparing',
  	"version_section" "enum__achievement_groups_v_version_section",
  	"version_order" numeric,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__achievement_groups_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__achievement_groups_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_achievement_groups_v_locales" (
  	"version_name" varchar,
  	"version_intro" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_achievement_groups_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"npcs_id" integer,
  	"monsters_id" integer,
  	"quest_guides_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "achievement_pages_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "achievement_groups_id" integer;
  ALTER TABLE "achievement_pages_quests" ADD CONSTRAINT "achievement_pages_quests_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."achievement_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "achievement_pages_quests_locales" ADD CONSTRAINT "achievement_pages_quests_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."achievement_pages_quests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "achievement_pages_rewards_items" ADD CONSTRAINT "achievement_pages_rewards_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "achievement_pages_rewards_items" ADD CONSTRAINT "achievement_pages_rewards_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."achievement_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "achievement_pages" ADD CONSTRAINT "achievement_pages_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "achievement_pages" ADD CONSTRAINT "achievement_pages_group_id_achievement_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."achievement_groups"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "achievement_pages_locales" ADD CONSTRAINT "achievement_pages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."achievement_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "achievement_pages_rels" ADD CONSTRAINT "achievement_pages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."achievement_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "achievement_pages_rels" ADD CONSTRAINT "achievement_pages_rels_quests_fk" FOREIGN KEY ("quests_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_achievement_pages_v_version_quests" ADD CONSTRAINT "_achievement_pages_v_version_quests_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_achievement_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_achievement_pages_v_version_quests_locales" ADD CONSTRAINT "_achievement_pages_v_version_quests_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_achievement_pages_v_version_quests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_achievement_pages_v_version_rewards_items" ADD CONSTRAINT "_achievement_pages_v_version_rewards_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_achievement_pages_v_version_rewards_items" ADD CONSTRAINT "_achievement_pages_v_version_rewards_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_achievement_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_achievement_pages_v" ADD CONSTRAINT "_achievement_pages_v_parent_id_achievement_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."achievement_pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_achievement_pages_v" ADD CONSTRAINT "_achievement_pages_v_version_achievement_id_achievements_id_fk" FOREIGN KEY ("version_achievement_id") REFERENCES "public"."achievements"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_achievement_pages_v" ADD CONSTRAINT "_achievement_pages_v_version_group_id_achievement_groups_id_fk" FOREIGN KEY ("version_group_id") REFERENCES "public"."achievement_groups"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_achievement_pages_v_locales" ADD CONSTRAINT "_achievement_pages_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_achievement_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_achievement_pages_v_rels" ADD CONSTRAINT "_achievement_pages_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_achievement_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_achievement_pages_v_rels" ADD CONSTRAINT "_achievement_pages_v_rels_quests_fk" FOREIGN KEY ("quests_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "achievement_groups" ADD CONSTRAINT "achievement_groups_category_id_achievement_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."achievement_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "achievement_groups_locales" ADD CONSTRAINT "achievement_groups_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."achievement_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "achievement_groups_rels" ADD CONSTRAINT "achievement_groups_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."achievement_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "achievement_groups_rels" ADD CONSTRAINT "achievement_groups_rels_npcs_fk" FOREIGN KEY ("npcs_id") REFERENCES "public"."npcs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "achievement_groups_rels" ADD CONSTRAINT "achievement_groups_rels_monsters_fk" FOREIGN KEY ("monsters_id") REFERENCES "public"."monsters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "achievement_groups_rels" ADD CONSTRAINT "achievement_groups_rels_quest_guides_fk" FOREIGN KEY ("quest_guides_id") REFERENCES "public"."quest_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_achievement_groups_v" ADD CONSTRAINT "_achievement_groups_v_parent_id_achievement_groups_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."achievement_groups"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_achievement_groups_v" ADD CONSTRAINT "_achievement_groups_v_version_category_id_achievement_categories_id_fk" FOREIGN KEY ("version_category_id") REFERENCES "public"."achievement_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_achievement_groups_v_locales" ADD CONSTRAINT "_achievement_groups_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_achievement_groups_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_achievement_groups_v_rels" ADD CONSTRAINT "_achievement_groups_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_achievement_groups_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_achievement_groups_v_rels" ADD CONSTRAINT "_achievement_groups_v_rels_npcs_fk" FOREIGN KEY ("npcs_id") REFERENCES "public"."npcs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_achievement_groups_v_rels" ADD CONSTRAINT "_achievement_groups_v_rels_monsters_fk" FOREIGN KEY ("monsters_id") REFERENCES "public"."monsters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_achievement_groups_v_rels" ADD CONSTRAINT "_achievement_groups_v_rels_quest_guides_fk" FOREIGN KEY ("quest_guides_id") REFERENCES "public"."quest_guides"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "achievement_pages_quests_order_idx" ON "achievement_pages_quests" USING btree ("_order");
  CREATE INDEX "achievement_pages_quests_parent_id_idx" ON "achievement_pages_quests" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "achievement_pages_quests_locales_locale_parent_id_unique" ON "achievement_pages_quests_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "achievement_pages_quests_locales_parent_id_idx" ON "achievement_pages_quests_locales" USING btree ("_parent_id");
  CREATE INDEX "achievement_pages_rewards_items_order_idx" ON "achievement_pages_rewards_items" USING btree ("_order");
  CREATE INDEX "achievement_pages_rewards_items_parent_id_idx" ON "achievement_pages_rewards_items" USING btree ("_parent_id");
  CREATE INDEX "achievement_pages_rewards_items_item_idx" ON "achievement_pages_rewards_items" USING btree ("item_id");
  CREATE UNIQUE INDEX "achievement_pages_achievement_idx" ON "achievement_pages" USING btree ("achievement_id");
  CREATE UNIQUE INDEX "achievement_pages_slug_idx" ON "achievement_pages" USING btree ("slug");
  CREATE INDEX "achievement_pages_group_idx" ON "achievement_pages" USING btree ("group_id");
  CREATE INDEX "achievement_pages_updated_at_idx" ON "achievement_pages" USING btree ("updated_at");
  CREATE INDEX "achievement_pages_created_at_idx" ON "achievement_pages" USING btree ("created_at");
  CREATE INDEX "achievement_pages__status_idx" ON "achievement_pages" USING btree ("_status");
  CREATE UNIQUE INDEX "achievement_pages_locales_locale_parent_id_unique" ON "achievement_pages_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "achievement_pages_locales_parent_id_idx" ON "achievement_pages_locales" USING btree ("_parent_id");
  CREATE INDEX "achievement_pages_rels_order_idx" ON "achievement_pages_rels" USING btree ("order");
  CREATE INDEX "achievement_pages_rels_parent_idx" ON "achievement_pages_rels" USING btree ("parent_id");
  CREATE INDEX "achievement_pages_rels_path_idx" ON "achievement_pages_rels" USING btree ("path");
  CREATE INDEX "achievement_pages_rels_quests_id_idx" ON "achievement_pages_rels" USING btree ("quests_id");
  CREATE INDEX "_achievement_pages_v_version_quests_order_idx" ON "_achievement_pages_v_version_quests" USING btree ("_order");
  CREATE INDEX "_achievement_pages_v_version_quests_parent_id_idx" ON "_achievement_pages_v_version_quests" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_achievement_pages_v_version_quests_locales_locale_parent_id" ON "_achievement_pages_v_version_quests_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_achievement_pages_v_version_quests_locales_parent_id_idx" ON "_achievement_pages_v_version_quests_locales" USING btree ("_parent_id");
  CREATE INDEX "_achievement_pages_v_version_rewards_items_order_idx" ON "_achievement_pages_v_version_rewards_items" USING btree ("_order");
  CREATE INDEX "_achievement_pages_v_version_rewards_items_parent_id_idx" ON "_achievement_pages_v_version_rewards_items" USING btree ("_parent_id");
  CREATE INDEX "_achievement_pages_v_version_rewards_items_item_idx" ON "_achievement_pages_v_version_rewards_items" USING btree ("item_id");
  CREATE INDEX "_achievement_pages_v_parent_idx" ON "_achievement_pages_v" USING btree ("parent_id");
  CREATE INDEX "_achievement_pages_v_version_version_achievement_idx" ON "_achievement_pages_v" USING btree ("version_achievement_id");
  CREATE INDEX "_achievement_pages_v_version_version_slug_idx" ON "_achievement_pages_v" USING btree ("version_slug");
  CREATE INDEX "_achievement_pages_v_version_version_group_idx" ON "_achievement_pages_v" USING btree ("version_group_id");
  CREATE INDEX "_achievement_pages_v_version_version_updated_at_idx" ON "_achievement_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_achievement_pages_v_version_version_created_at_idx" ON "_achievement_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_achievement_pages_v_version_version__status_idx" ON "_achievement_pages_v" USING btree ("version__status");
  CREATE INDEX "_achievement_pages_v_created_at_idx" ON "_achievement_pages_v" USING btree ("created_at");
  CREATE INDEX "_achievement_pages_v_updated_at_idx" ON "_achievement_pages_v" USING btree ("updated_at");
  CREATE INDEX "_achievement_pages_v_snapshot_idx" ON "_achievement_pages_v" USING btree ("snapshot");
  CREATE INDEX "_achievement_pages_v_published_locale_idx" ON "_achievement_pages_v" USING btree ("published_locale");
  CREATE INDEX "_achievement_pages_v_latest_idx" ON "_achievement_pages_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_achievement_pages_v_locales_locale_parent_id_unique" ON "_achievement_pages_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_achievement_pages_v_locales_parent_id_idx" ON "_achievement_pages_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_achievement_pages_v_rels_order_idx" ON "_achievement_pages_v_rels" USING btree ("order");
  CREATE INDEX "_achievement_pages_v_rels_parent_idx" ON "_achievement_pages_v_rels" USING btree ("parent_id");
  CREATE INDEX "_achievement_pages_v_rels_path_idx" ON "_achievement_pages_v_rels" USING btree ("path");
  CREATE INDEX "_achievement_pages_v_rels_quests_id_idx" ON "_achievement_pages_v_rels" USING btree ("quests_id");
  CREATE UNIQUE INDEX "achievement_groups_category_idx" ON "achievement_groups" USING btree ("category_id");
  CREATE UNIQUE INDEX "achievement_groups_slug_idx" ON "achievement_groups" USING btree ("slug");
  CREATE INDEX "achievement_groups_updated_at_idx" ON "achievement_groups" USING btree ("updated_at");
  CREATE INDEX "achievement_groups_created_at_idx" ON "achievement_groups" USING btree ("created_at");
  CREATE INDEX "achievement_groups__status_idx" ON "achievement_groups" USING btree ("_status");
  CREATE UNIQUE INDEX "achievement_groups_locales_locale_parent_id_unique" ON "achievement_groups_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "achievement_groups_locales_parent_id_idx" ON "achievement_groups_locales" USING btree ("_parent_id");
  CREATE INDEX "achievement_groups_rels_order_idx" ON "achievement_groups_rels" USING btree ("order");
  CREATE INDEX "achievement_groups_rels_parent_idx" ON "achievement_groups_rels" USING btree ("parent_id");
  CREATE INDEX "achievement_groups_rels_path_idx" ON "achievement_groups_rels" USING btree ("path");
  CREATE INDEX "achievement_groups_rels_npcs_id_idx" ON "achievement_groups_rels" USING btree ("npcs_id");
  CREATE INDEX "achievement_groups_rels_monsters_id_idx" ON "achievement_groups_rels" USING btree ("monsters_id");
  CREATE INDEX "achievement_groups_rels_quest_guides_id_idx" ON "achievement_groups_rels" USING btree ("quest_guides_id");
  CREATE INDEX "_achievement_groups_v_parent_idx" ON "_achievement_groups_v" USING btree ("parent_id");
  CREATE INDEX "_achievement_groups_v_version_version_category_idx" ON "_achievement_groups_v" USING btree ("version_category_id");
  CREATE INDEX "_achievement_groups_v_version_version_slug_idx" ON "_achievement_groups_v" USING btree ("version_slug");
  CREATE INDEX "_achievement_groups_v_version_version_updated_at_idx" ON "_achievement_groups_v" USING btree ("version_updated_at");
  CREATE INDEX "_achievement_groups_v_version_version_created_at_idx" ON "_achievement_groups_v" USING btree ("version_created_at");
  CREATE INDEX "_achievement_groups_v_version_version__status_idx" ON "_achievement_groups_v" USING btree ("version__status");
  CREATE INDEX "_achievement_groups_v_created_at_idx" ON "_achievement_groups_v" USING btree ("created_at");
  CREATE INDEX "_achievement_groups_v_updated_at_idx" ON "_achievement_groups_v" USING btree ("updated_at");
  CREATE INDEX "_achievement_groups_v_snapshot_idx" ON "_achievement_groups_v" USING btree ("snapshot");
  CREATE INDEX "_achievement_groups_v_published_locale_idx" ON "_achievement_groups_v" USING btree ("published_locale");
  CREATE INDEX "_achievement_groups_v_latest_idx" ON "_achievement_groups_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_achievement_groups_v_locales_locale_parent_id_unique" ON "_achievement_groups_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_achievement_groups_v_locales_parent_id_idx" ON "_achievement_groups_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_achievement_groups_v_rels_order_idx" ON "_achievement_groups_v_rels" USING btree ("order");
  CREATE INDEX "_achievement_groups_v_rels_parent_idx" ON "_achievement_groups_v_rels" USING btree ("parent_id");
  CREATE INDEX "_achievement_groups_v_rels_path_idx" ON "_achievement_groups_v_rels" USING btree ("path");
  CREATE INDEX "_achievement_groups_v_rels_npcs_id_idx" ON "_achievement_groups_v_rels" USING btree ("npcs_id");
  CREATE INDEX "_achievement_groups_v_rels_monsters_id_idx" ON "_achievement_groups_v_rels" USING btree ("monsters_id");
  CREATE INDEX "_achievement_groups_v_rels_quest_guides_id_idx" ON "_achievement_groups_v_rels" USING btree ("quest_guides_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_achievement_pages_fk" FOREIGN KEY ("achievement_pages_id") REFERENCES "public"."achievement_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_achievement_groups_fk" FOREIGN KEY ("achievement_groups_id") REFERENCES "public"."achievement_groups"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_achievement_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("achievement_pages_id");
  CREATE INDEX "payload_locked_documents_rels_achievement_groups_id_idx" ON "payload_locked_documents_rels" USING btree ("achievement_groups_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "achievement_pages_quests" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "achievement_pages_quests_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "achievement_pages_rewards_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "achievement_pages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "achievement_pages_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "achievement_pages_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_achievement_pages_v_version_quests" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_achievement_pages_v_version_quests_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_achievement_pages_v_version_rewards_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_achievement_pages_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_achievement_pages_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_achievement_pages_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "achievement_groups" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "achievement_groups_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "achievement_groups_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_achievement_groups_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_achievement_groups_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_achievement_groups_v_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "achievement_pages_quests" CASCADE;
  DROP TABLE "achievement_pages_quests_locales" CASCADE;
  DROP TABLE "achievement_pages_rewards_items" CASCADE;
  DROP TABLE "achievement_pages" CASCADE;
  DROP TABLE "achievement_pages_locales" CASCADE;
  DROP TABLE "achievement_pages_rels" CASCADE;
  DROP TABLE "_achievement_pages_v_version_quests" CASCADE;
  DROP TABLE "_achievement_pages_v_version_quests_locales" CASCADE;
  DROP TABLE "_achievement_pages_v_version_rewards_items" CASCADE;
  DROP TABLE "_achievement_pages_v" CASCADE;
  DROP TABLE "_achievement_pages_v_locales" CASCADE;
  DROP TABLE "_achievement_pages_v_rels" CASCADE;
  DROP TABLE "achievement_groups" CASCADE;
  DROP TABLE "achievement_groups_locales" CASCADE;
  DROP TABLE "achievement_groups_rels" CASCADE;
  DROP TABLE "_achievement_groups_v" CASCADE;
  DROP TABLE "_achievement_groups_v_locales" CASCADE;
  DROP TABLE "_achievement_groups_v_rels" CASCADE;
  -- DROP TABLE "achievement_pages" CASCADE ya quita esta clave foránea.
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_achievement_pages_fk";
  
  -- DROP TABLE "achievement_groups" CASCADE ya quita esta clave foránea.
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_achievement_groups_fk";
  
  DROP INDEX "payload_locked_documents_rels_achievement_pages_id_idx";
  DROP INDEX "payload_locked_documents_rels_achievement_groups_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "achievement_pages_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "achievement_groups_id";
  DROP TYPE "public"."enum_achievement_pages_state";
  DROP TYPE "public"."enum_achievement_pages_status";
  DROP TYPE "public"."enum__achievement_pages_v_version_state";
  DROP TYPE "public"."enum__achievement_pages_v_version_status";
  DROP TYPE "public"."enum__achievement_pages_v_published_locale";
  DROP TYPE "public"."enum_achievement_groups_state";
  DROP TYPE "public"."enum_achievement_groups_section";
  DROP TYPE "public"."enum_achievement_groups_status";
  DROP TYPE "public"."enum__achievement_groups_v_version_state";
  DROP TYPE "public"."enum__achievement_groups_v_version_section";
  DROP TYPE "public"."enum__achievement_groups_v_version_status";
  DROP TYPE "public"."enum__achievement_groups_v_published_locale";`)
}
