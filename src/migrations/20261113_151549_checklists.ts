import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_checklists_steps_segments_kind" AS ENUM('plain', 'stop', 'resolve');
  CREATE TYPE "public"."enum_checklists_step_ach_mode" AS ENUM('all', 'some');
  CREATE TYPE "public"."enum_checklists_steps_quests_kind" AS ENUM('mandatory', 'optional', 'take');
  CREATE TYPE "public"."enum_checklists_state" AS ENUM('published', 'preparing');
  CREATE TYPE "public"."enum_checklists_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__checklists_v_version_steps_segments_kind" AS ENUM('plain', 'stop', 'resolve');
  CREATE TYPE "public"."enum__checklists_step_ach_v_mode" AS ENUM('all', 'some');
  CREATE TYPE "public"."enum__checklists_v_version_steps_quests_kind" AS ENUM('mandatory', 'optional', 'take');
  CREATE TYPE "public"."enum__checklists_v_version_state" AS ENUM('published', 'preparing');
  CREATE TYPE "public"."enum__checklists_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__checklists_v_published_locale" AS ENUM('es');
  CREATE TABLE "checklists_prerequisites_groups_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar
  );
  
  CREATE TABLE "checklists_prerequisites_groups_rows_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "checklists_prerequisites_groups" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "checklists_prerequisites_groups_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "checklists_steps_segments" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kind" "enum_checklists_steps_segments_kind" DEFAULT 'plain',
  	"quest_id" integer,
  	"stop_objective" numeric
  );
  
  CREATE TABLE "checklists_steps_segments_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "checklists_step_ach" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"achievement_id" integer,
  	"mode" "enum_checklists_step_ach_mode" DEFAULT 'all'
  );
  
  CREATE TABLE "checklists_steps_quests" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"quest_id" integer,
  	"kind" "enum_checklists_steps_quests_kind" DEFAULT 'mandatory',
  	"optional_done_by" varchar
  );
  
  CREATE TABLE "checklists_steps_quests_locales" (
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "checklists_steps_needs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item_id" integer,
  	"quantity" numeric DEFAULT 1
  );
  
  CREATE TABLE "checklists_steps_needs_locales" (
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "checklists_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"step_id" varchar,
  	"legacy_number" numeric,
  	"figure_npc_id" integer,
  	"figure_image_id" integer,
  	"banner_id" integer
  );
  
  CREATE TABLE "checklists_steps_locales" (
  	"note" jsonb,
  	"figure_role" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "checklists" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"state" "enum_checklists_state" DEFAULT 'preparing',
  	"legacy_href" varchar,
  	"order" numeric,
  	"dofus_guide_id" integer,
  	"legacy_prefix" varchar,
  	"legacy_classic_keys" jsonb,
  	"legacy_guide_version" numeric,
  	"legacy_previous_steps" jsonb,
  	"import_snapshot" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_checklists_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "checklists_locales" (
  	"name" varchar,
  	"description" varchar,
  	"prerequisites_intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "checklists_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "checklists_numbers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" numeric,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL
  );
  
  CREATE TABLE "checklists_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"quests_id" integer,
  	"monsters_id" integer
  );
  
  CREATE TABLE "_checklists_v_version_prerequisites_groups_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_checklists_v_version_prerequisites_groups_rows_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_checklists_v_version_prerequisites_groups" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_checklists_v_version_prerequisites_groups_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_checklists_v_version_steps_segments" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum__checklists_v_version_steps_segments_kind" DEFAULT 'plain',
  	"quest_id" integer,
  	"stop_objective" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_checklists_v_version_steps_segments_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_checklists_step_ach_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"achievement_id" integer,
  	"mode" "enum__checklists_step_ach_v_mode" DEFAULT 'all',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_checklists_v_version_steps_quests" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"quest_id" integer,
  	"kind" "enum__checklists_v_version_steps_quests_kind" DEFAULT 'mandatory',
  	"optional_done_by" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_checklists_v_version_steps_quests_locales" (
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_checklists_v_version_steps_needs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"item_id" integer,
  	"quantity" numeric DEFAULT 1,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_checklists_v_version_steps_needs_locales" (
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_checklists_v_version_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"step_id" varchar,
  	"legacy_number" numeric,
  	"figure_npc_id" integer,
  	"figure_image_id" integer,
  	"banner_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_checklists_v_version_steps_locales" (
  	"note" jsonb,
  	"figure_role" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_checklists_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_state" "enum__checklists_v_version_state" DEFAULT 'preparing',
  	"version_legacy_href" varchar,
  	"version_order" numeric,
  	"version_dofus_guide_id" integer,
  	"version_legacy_prefix" varchar,
  	"version_legacy_classic_keys" jsonb,
  	"version_legacy_guide_version" numeric,
  	"version_legacy_previous_steps" jsonb,
  	"version_import_snapshot" jsonb,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__checklists_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__checklists_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_checklists_v_locales" (
  	"version_name" varchar,
  	"version_description" varchar,
  	"version_prerequisites_intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_checklists_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_checklists_v_numbers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" numeric,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL
  );
  
  CREATE TABLE "_checklists_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"quests_id" integer,
  	"monsters_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "checklists_id" integer;
  ALTER TABLE "checklists_prerequisites_groups_rows" ADD CONSTRAINT "checklists_prerequisites_groups_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."checklists_prerequisites_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "checklists_prerequisites_groups_rows_locales" ADD CONSTRAINT "checklists_prerequisites_groups_rows_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."checklists_prerequisites_groups_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "checklists_prerequisites_groups" ADD CONSTRAINT "checklists_prerequisites_groups_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."checklists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "checklists_prerequisites_groups_locales" ADD CONSTRAINT "checklists_prerequisites_groups_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."checklists_prerequisites_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "checklists_steps_segments" ADD CONSTRAINT "checklists_steps_segments_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "checklists_steps_segments" ADD CONSTRAINT "checklists_steps_segments_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."checklists_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "checklists_steps_segments_locales" ADD CONSTRAINT "checklists_steps_segments_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."checklists_steps_segments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "checklists_step_ach" ADD CONSTRAINT "checklists_step_ach_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "checklists_step_ach" ADD CONSTRAINT "checklists_step_ach_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."checklists_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "checklists_steps_quests" ADD CONSTRAINT "checklists_steps_quests_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "checklists_steps_quests" ADD CONSTRAINT "checklists_steps_quests_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."checklists_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "checklists_steps_quests_locales" ADD CONSTRAINT "checklists_steps_quests_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."checklists_steps_quests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "checklists_steps_needs" ADD CONSTRAINT "checklists_steps_needs_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "checklists_steps_needs" ADD CONSTRAINT "checklists_steps_needs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."checklists_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "checklists_steps_needs_locales" ADD CONSTRAINT "checklists_steps_needs_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."checklists_steps_needs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "checklists_steps" ADD CONSTRAINT "checklists_steps_figure_npc_id_npcs_id_fk" FOREIGN KEY ("figure_npc_id") REFERENCES "public"."npcs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "checklists_steps" ADD CONSTRAINT "checklists_steps_figure_image_id_media_id_fk" FOREIGN KEY ("figure_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "checklists_steps" ADD CONSTRAINT "checklists_steps_banner_id_media_id_fk" FOREIGN KEY ("banner_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "checklists_steps" ADD CONSTRAINT "checklists_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."checklists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "checklists_steps_locales" ADD CONSTRAINT "checklists_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."checklists_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "checklists" ADD CONSTRAINT "checklists_dofus_guide_id_dofus_guides_id_fk" FOREIGN KEY ("dofus_guide_id") REFERENCES "public"."dofus_guides"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "checklists_locales" ADD CONSTRAINT "checklists_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."checklists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "checklists_texts" ADD CONSTRAINT "checklists_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."checklists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "checklists_numbers" ADD CONSTRAINT "checklists_numbers_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."checklists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "checklists_rels" ADD CONSTRAINT "checklists_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."checklists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "checklists_rels" ADD CONSTRAINT "checklists_rels_quests_fk" FOREIGN KEY ("quests_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "checklists_rels" ADD CONSTRAINT "checklists_rels_monsters_fk" FOREIGN KEY ("monsters_id") REFERENCES "public"."monsters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_checklists_v_version_prerequisites_groups_rows" ADD CONSTRAINT "_checklists_v_version_prerequisites_groups_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_checklists_v_version_prerequisites_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_checklists_v_version_prerequisites_groups_rows_locales" ADD CONSTRAINT "_checklists_v_version_prerequisites_groups_rows_locales_p_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_checklists_v_version_prerequisites_groups_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_checklists_v_version_prerequisites_groups" ADD CONSTRAINT "_checklists_v_version_prerequisites_groups_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_checklists_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_checklists_v_version_prerequisites_groups_locales" ADD CONSTRAINT "_checklists_v_version_prerequisites_groups_locales_parent_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_checklists_v_version_prerequisites_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_checklists_v_version_steps_segments" ADD CONSTRAINT "_checklists_v_version_steps_segments_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_checklists_v_version_steps_segments" ADD CONSTRAINT "_checklists_v_version_steps_segments_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_checklists_v_version_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_checklists_v_version_steps_segments_locales" ADD CONSTRAINT "_checklists_v_version_steps_segments_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_checklists_v_version_steps_segments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_checklists_step_ach_v" ADD CONSTRAINT "_checklists_step_ach_v_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_checklists_step_ach_v" ADD CONSTRAINT "_checklists_step_ach_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_checklists_v_version_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_checklists_v_version_steps_quests" ADD CONSTRAINT "_checklists_v_version_steps_quests_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_checklists_v_version_steps_quests" ADD CONSTRAINT "_checklists_v_version_steps_quests_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_checklists_v_version_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_checklists_v_version_steps_quests_locales" ADD CONSTRAINT "_checklists_v_version_steps_quests_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_checklists_v_version_steps_quests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_checklists_v_version_steps_needs" ADD CONSTRAINT "_checklists_v_version_steps_needs_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_checklists_v_version_steps_needs" ADD CONSTRAINT "_checklists_v_version_steps_needs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_checklists_v_version_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_checklists_v_version_steps_needs_locales" ADD CONSTRAINT "_checklists_v_version_steps_needs_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_checklists_v_version_steps_needs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_checklists_v_version_steps" ADD CONSTRAINT "_checklists_v_version_steps_figure_npc_id_npcs_id_fk" FOREIGN KEY ("figure_npc_id") REFERENCES "public"."npcs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_checklists_v_version_steps" ADD CONSTRAINT "_checklists_v_version_steps_figure_image_id_media_id_fk" FOREIGN KEY ("figure_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_checklists_v_version_steps" ADD CONSTRAINT "_checklists_v_version_steps_banner_id_media_id_fk" FOREIGN KEY ("banner_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_checklists_v_version_steps" ADD CONSTRAINT "_checklists_v_version_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_checklists_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_checklists_v_version_steps_locales" ADD CONSTRAINT "_checklists_v_version_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_checklists_v_version_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_checklists_v" ADD CONSTRAINT "_checklists_v_parent_id_checklists_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."checklists"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_checklists_v" ADD CONSTRAINT "_checklists_v_version_dofus_guide_id_dofus_guides_id_fk" FOREIGN KEY ("version_dofus_guide_id") REFERENCES "public"."dofus_guides"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_checklists_v_locales" ADD CONSTRAINT "_checklists_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_checklists_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_checklists_v_texts" ADD CONSTRAINT "_checklists_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_checklists_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_checklists_v_numbers" ADD CONSTRAINT "_checklists_v_numbers_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_checklists_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_checklists_v_rels" ADD CONSTRAINT "_checklists_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_checklists_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_checklists_v_rels" ADD CONSTRAINT "_checklists_v_rels_quests_fk" FOREIGN KEY ("quests_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_checklists_v_rels" ADD CONSTRAINT "_checklists_v_rels_monsters_fk" FOREIGN KEY ("monsters_id") REFERENCES "public"."monsters"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "checklists_prerequisites_groups_rows_order_idx" ON "checklists_prerequisites_groups_rows" USING btree ("_order");
  CREATE INDEX "checklists_prerequisites_groups_rows_parent_id_idx" ON "checklists_prerequisites_groups_rows" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "checklists_prerequisites_groups_rows_locales_locale_parent_i" ON "checklists_prerequisites_groups_rows_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "checklists_prerequisites_groups_rows_locales_parent_id_idx" ON "checklists_prerequisites_groups_rows_locales" USING btree ("_parent_id");
  CREATE INDEX "checklists_prerequisites_groups_order_idx" ON "checklists_prerequisites_groups" USING btree ("_order");
  CREATE INDEX "checklists_prerequisites_groups_parent_id_idx" ON "checklists_prerequisites_groups" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "checklists_prerequisites_groups_locales_locale_parent_id_uni" ON "checklists_prerequisites_groups_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "checklists_prerequisites_groups_locales_parent_id_idx" ON "checklists_prerequisites_groups_locales" USING btree ("_parent_id");
  CREATE INDEX "checklists_steps_segments_order_idx" ON "checklists_steps_segments" USING btree ("_order");
  CREATE INDEX "checklists_steps_segments_parent_id_idx" ON "checklists_steps_segments" USING btree ("_parent_id");
  CREATE INDEX "checklists_steps_segments_quest_idx" ON "checklists_steps_segments" USING btree ("quest_id");
  CREATE UNIQUE INDEX "checklists_steps_segments_locales_locale_parent_id_unique" ON "checklists_steps_segments_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "checklists_steps_segments_locales_parent_id_idx" ON "checklists_steps_segments_locales" USING btree ("_parent_id");
  CREATE INDEX "checklists_step_ach_order_idx" ON "checklists_step_ach" USING btree ("_order");
  CREATE INDEX "checklists_step_ach_parent_id_idx" ON "checklists_step_ach" USING btree ("_parent_id");
  CREATE INDEX "checklists_step_ach_achievement_idx" ON "checklists_step_ach" USING btree ("achievement_id");
  CREATE INDEX "checklists_steps_quests_order_idx" ON "checklists_steps_quests" USING btree ("_order");
  CREATE INDEX "checklists_steps_quests_parent_id_idx" ON "checklists_steps_quests" USING btree ("_parent_id");
  CREATE INDEX "checklists_steps_quests_quest_idx" ON "checklists_steps_quests" USING btree ("quest_id");
  CREATE UNIQUE INDEX "checklists_steps_quests_locales_locale_parent_id_unique" ON "checklists_steps_quests_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "checklists_steps_quests_locales_parent_id_idx" ON "checklists_steps_quests_locales" USING btree ("_parent_id");
  CREATE INDEX "checklists_steps_needs_order_idx" ON "checklists_steps_needs" USING btree ("_order");
  CREATE INDEX "checklists_steps_needs_parent_id_idx" ON "checklists_steps_needs" USING btree ("_parent_id");
  CREATE INDEX "checklists_steps_needs_item_idx" ON "checklists_steps_needs" USING btree ("item_id");
  CREATE UNIQUE INDEX "checklists_steps_needs_locales_locale_parent_id_unique" ON "checklists_steps_needs_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "checklists_steps_needs_locales_parent_id_idx" ON "checklists_steps_needs_locales" USING btree ("_parent_id");
  CREATE INDEX "checklists_steps_order_idx" ON "checklists_steps" USING btree ("_order");
  CREATE INDEX "checklists_steps_parent_id_idx" ON "checklists_steps" USING btree ("_parent_id");
  CREATE INDEX "checklists_steps_step_id_idx" ON "checklists_steps" USING btree ("step_id");
  CREATE INDEX "checklists_steps_figure_figure_npc_idx" ON "checklists_steps" USING btree ("figure_npc_id");
  CREATE INDEX "checklists_steps_figure_figure_image_idx" ON "checklists_steps" USING btree ("figure_image_id");
  CREATE INDEX "checklists_steps_banner_idx" ON "checklists_steps" USING btree ("banner_id");
  CREATE UNIQUE INDEX "checklists_steps_locales_locale_parent_id_unique" ON "checklists_steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "checklists_steps_locales_parent_id_idx" ON "checklists_steps_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "checklists_slug_idx" ON "checklists" USING btree ("slug");
  CREATE INDEX "checklists_dofus_guide_idx" ON "checklists" USING btree ("dofus_guide_id");
  CREATE INDEX "checklists_updated_at_idx" ON "checklists" USING btree ("updated_at");
  CREATE INDEX "checklists_created_at_idx" ON "checklists" USING btree ("created_at");
  CREATE INDEX "checklists__status_idx" ON "checklists" USING btree ("_status");
  CREATE UNIQUE INDEX "checklists_locales_locale_parent_id_unique" ON "checklists_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "checklists_locales_parent_id_idx" ON "checklists_locales" USING btree ("_parent_id");
  CREATE INDEX "checklists_texts_order_parent" ON "checklists_texts" USING btree ("order","parent_id");
  CREATE INDEX "checklists_numbers_order_parent_idx" ON "checklists_numbers" USING btree ("order","parent_id");
  CREATE INDEX "checklists_rels_order_idx" ON "checklists_rels" USING btree ("order");
  CREATE INDEX "checklists_rels_parent_idx" ON "checklists_rels" USING btree ("parent_id");
  CREATE INDEX "checklists_rels_path_idx" ON "checklists_rels" USING btree ("path");
  CREATE INDEX "checklists_rels_quests_id_idx" ON "checklists_rels" USING btree ("quests_id");
  CREATE INDEX "checklists_rels_monsters_id_idx" ON "checklists_rels" USING btree ("monsters_id");
  CREATE INDEX "_checklists_v_version_prerequisites_groups_rows_order_idx" ON "_checklists_v_version_prerequisites_groups_rows" USING btree ("_order");
  CREATE INDEX "_checklists_v_version_prerequisites_groups_rows_parent_id_idx" ON "_checklists_v_version_prerequisites_groups_rows" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_checklists_v_version_prerequisites_groups_rows_locales_loca" ON "_checklists_v_version_prerequisites_groups_rows_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_checklists_v_version_prerequisites_groups_rows_locales__idx" ON "_checklists_v_version_prerequisites_groups_rows_locales" USING btree ("_parent_id");
  CREATE INDEX "_checklists_v_version_prerequisites_groups_order_idx" ON "_checklists_v_version_prerequisites_groups" USING btree ("_order");
  CREATE INDEX "_checklists_v_version_prerequisites_groups_parent_id_idx" ON "_checklists_v_version_prerequisites_groups" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_checklists_v_version_prerequisites_groups_locales_locale_pa" ON "_checklists_v_version_prerequisites_groups_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_checklists_v_version_prerequisites_groups_locales_paren_idx" ON "_checklists_v_version_prerequisites_groups_locales" USING btree ("_parent_id");
  CREATE INDEX "_checklists_v_version_steps_segments_order_idx" ON "_checklists_v_version_steps_segments" USING btree ("_order");
  CREATE INDEX "_checklists_v_version_steps_segments_parent_id_idx" ON "_checklists_v_version_steps_segments" USING btree ("_parent_id");
  CREATE INDEX "_checklists_v_version_steps_segments_quest_idx" ON "_checklists_v_version_steps_segments" USING btree ("quest_id");
  CREATE UNIQUE INDEX "_checklists_v_version_steps_segments_locales_locale_parent_i" ON "_checklists_v_version_steps_segments_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_checklists_v_version_steps_segments_locales_parent_id_idx" ON "_checklists_v_version_steps_segments_locales" USING btree ("_parent_id");
  CREATE INDEX "_checklists_step_ach_v_order_idx" ON "_checklists_step_ach_v" USING btree ("_order");
  CREATE INDEX "_checklists_step_ach_v_parent_id_idx" ON "_checklists_step_ach_v" USING btree ("_parent_id");
  CREATE INDEX "_checklists_step_ach_v_achievement_idx" ON "_checklists_step_ach_v" USING btree ("achievement_id");
  CREATE INDEX "_checklists_v_version_steps_quests_order_idx" ON "_checklists_v_version_steps_quests" USING btree ("_order");
  CREATE INDEX "_checklists_v_version_steps_quests_parent_id_idx" ON "_checklists_v_version_steps_quests" USING btree ("_parent_id");
  CREATE INDEX "_checklists_v_version_steps_quests_quest_idx" ON "_checklists_v_version_steps_quests" USING btree ("quest_id");
  CREATE UNIQUE INDEX "_checklists_v_version_steps_quests_locales_locale_parent_id_" ON "_checklists_v_version_steps_quests_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_checklists_v_version_steps_quests_locales_parent_id_idx" ON "_checklists_v_version_steps_quests_locales" USING btree ("_parent_id");
  CREATE INDEX "_checklists_v_version_steps_needs_order_idx" ON "_checklists_v_version_steps_needs" USING btree ("_order");
  CREATE INDEX "_checklists_v_version_steps_needs_parent_id_idx" ON "_checklists_v_version_steps_needs" USING btree ("_parent_id");
  CREATE INDEX "_checklists_v_version_steps_needs_item_idx" ON "_checklists_v_version_steps_needs" USING btree ("item_id");
  CREATE UNIQUE INDEX "_checklists_v_version_steps_needs_locales_locale_parent_id_u" ON "_checklists_v_version_steps_needs_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_checklists_v_version_steps_needs_locales_parent_id_idx" ON "_checklists_v_version_steps_needs_locales" USING btree ("_parent_id");
  CREATE INDEX "_checklists_v_version_steps_order_idx" ON "_checklists_v_version_steps" USING btree ("_order");
  CREATE INDEX "_checklists_v_version_steps_parent_id_idx" ON "_checklists_v_version_steps" USING btree ("_parent_id");
  CREATE INDEX "_checklists_v_version_steps_step_id_idx" ON "_checklists_v_version_steps" USING btree ("step_id");
  CREATE INDEX "_checklists_v_version_steps_figure_figure_npc_idx" ON "_checklists_v_version_steps" USING btree ("figure_npc_id");
  CREATE INDEX "_checklists_v_version_steps_figure_figure_image_idx" ON "_checklists_v_version_steps" USING btree ("figure_image_id");
  CREATE INDEX "_checklists_v_version_steps_banner_idx" ON "_checklists_v_version_steps" USING btree ("banner_id");
  CREATE UNIQUE INDEX "_checklists_v_version_steps_locales_locale_parent_id_unique" ON "_checklists_v_version_steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_checklists_v_version_steps_locales_parent_id_idx" ON "_checklists_v_version_steps_locales" USING btree ("_parent_id");
  CREATE INDEX "_checklists_v_parent_idx" ON "_checklists_v" USING btree ("parent_id");
  CREATE INDEX "_checklists_v_version_version_slug_idx" ON "_checklists_v" USING btree ("version_slug");
  CREATE INDEX "_checklists_v_version_version_dofus_guide_idx" ON "_checklists_v" USING btree ("version_dofus_guide_id");
  CREATE INDEX "_checklists_v_version_version_updated_at_idx" ON "_checklists_v" USING btree ("version_updated_at");
  CREATE INDEX "_checklists_v_version_version_created_at_idx" ON "_checklists_v" USING btree ("version_created_at");
  CREATE INDEX "_checklists_v_version_version__status_idx" ON "_checklists_v" USING btree ("version__status");
  CREATE INDEX "_checklists_v_created_at_idx" ON "_checklists_v" USING btree ("created_at");
  CREATE INDEX "_checklists_v_updated_at_idx" ON "_checklists_v" USING btree ("updated_at");
  CREATE INDEX "_checklists_v_snapshot_idx" ON "_checklists_v" USING btree ("snapshot");
  CREATE INDEX "_checklists_v_published_locale_idx" ON "_checklists_v" USING btree ("published_locale");
  CREATE INDEX "_checklists_v_latest_idx" ON "_checklists_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_checklists_v_locales_locale_parent_id_unique" ON "_checklists_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_checklists_v_locales_parent_id_idx" ON "_checklists_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_checklists_v_texts_order_parent" ON "_checklists_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_checklists_v_numbers_order_parent_idx" ON "_checklists_v_numbers" USING btree ("order","parent_id");
  CREATE INDEX "_checklists_v_rels_order_idx" ON "_checklists_v_rels" USING btree ("order");
  CREATE INDEX "_checklists_v_rels_parent_idx" ON "_checklists_v_rels" USING btree ("parent_id");
  CREATE INDEX "_checklists_v_rels_path_idx" ON "_checklists_v_rels" USING btree ("path");
  CREATE INDEX "_checklists_v_rels_quests_id_idx" ON "_checklists_v_rels" USING btree ("quests_id");
  CREATE INDEX "_checklists_v_rels_monsters_id_idx" ON "_checklists_v_rels" USING btree ("monsters_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_checklists_fk" FOREIGN KEY ("checklists_id") REFERENCES "public"."checklists"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_checklists_id_idx" ON "payload_locked_documents_rels" USING btree ("checklists_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "checklists_prerequisites_groups_rows" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "checklists_prerequisites_groups_rows_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "checklists_prerequisites_groups" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "checklists_prerequisites_groups_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "checklists_steps_segments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "checklists_steps_segments_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "checklists_step_ach" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "checklists_steps_quests" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "checklists_steps_quests_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "checklists_steps_needs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "checklists_steps_needs_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "checklists_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "checklists_steps_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "checklists" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "checklists_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "checklists_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "checklists_numbers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "checklists_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_checklists_v_version_prerequisites_groups_rows" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_checklists_v_version_prerequisites_groups_rows_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_checklists_v_version_prerequisites_groups" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_checklists_v_version_prerequisites_groups_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_checklists_v_version_steps_segments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_checklists_v_version_steps_segments_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_checklists_step_ach_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_checklists_v_version_steps_quests" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_checklists_v_version_steps_quests_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_checklists_v_version_steps_needs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_checklists_v_version_steps_needs_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_checklists_v_version_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_checklists_v_version_steps_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_checklists_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_checklists_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_checklists_v_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_checklists_v_numbers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_checklists_v_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "checklists_prerequisites_groups_rows" CASCADE;
  DROP TABLE "checklists_prerequisites_groups_rows_locales" CASCADE;
  DROP TABLE "checklists_prerequisites_groups" CASCADE;
  DROP TABLE "checklists_prerequisites_groups_locales" CASCADE;
  DROP TABLE "checklists_steps_segments" CASCADE;
  DROP TABLE "checklists_steps_segments_locales" CASCADE;
  DROP TABLE "checklists_step_ach" CASCADE;
  DROP TABLE "checklists_steps_quests" CASCADE;
  DROP TABLE "checklists_steps_quests_locales" CASCADE;
  DROP TABLE "checklists_steps_needs" CASCADE;
  DROP TABLE "checklists_steps_needs_locales" CASCADE;
  DROP TABLE "checklists_steps" CASCADE;
  DROP TABLE "checklists_steps_locales" CASCADE;
  DROP TABLE "checklists" CASCADE;
  DROP TABLE "checklists_locales" CASCADE;
  DROP TABLE "checklists_texts" CASCADE;
  DROP TABLE "checklists_numbers" CASCADE;
  DROP TABLE "checklists_rels" CASCADE;
  DROP TABLE "_checklists_v_version_prerequisites_groups_rows" CASCADE;
  DROP TABLE "_checklists_v_version_prerequisites_groups_rows_locales" CASCADE;
  DROP TABLE "_checklists_v_version_prerequisites_groups" CASCADE;
  DROP TABLE "_checklists_v_version_prerequisites_groups_locales" CASCADE;
  DROP TABLE "_checklists_v_version_steps_segments" CASCADE;
  DROP TABLE "_checklists_v_version_steps_segments_locales" CASCADE;
  DROP TABLE "_checklists_step_ach_v" CASCADE;
  DROP TABLE "_checklists_v_version_steps_quests" CASCADE;
  DROP TABLE "_checklists_v_version_steps_quests_locales" CASCADE;
  DROP TABLE "_checklists_v_version_steps_needs" CASCADE;
  DROP TABLE "_checklists_v_version_steps_needs_locales" CASCADE;
  DROP TABLE "_checklists_v_version_steps" CASCADE;
  DROP TABLE "_checklists_v_version_steps_locales" CASCADE;
  DROP TABLE "_checklists_v" CASCADE;
  DROP TABLE "_checklists_v_locales" CASCADE;
  DROP TABLE "_checklists_v_texts" CASCADE;
  DROP TABLE "_checklists_v_numbers" CASCADE;
  DROP TABLE "_checklists_v_rels" CASCADE;
  -- DROP TABLE … CASCADE ya se llevó esta clave ajena: IF EXISTS para que la vuelta atrás no falle.
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_checklists_fk";
  
  DROP INDEX "payload_locked_documents_rels_checklists_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "checklists_id";
  DROP TYPE "public"."enum_checklists_steps_segments_kind";
  DROP TYPE "public"."enum_checklists_step_ach_mode";
  DROP TYPE "public"."enum_checklists_steps_quests_kind";
  DROP TYPE "public"."enum_checklists_state";
  DROP TYPE "public"."enum_checklists_status";
  DROP TYPE "public"."enum__checklists_v_version_steps_segments_kind";
  DROP TYPE "public"."enum__checklists_step_ach_v_mode";
  DROP TYPE "public"."enum__checklists_v_version_steps_quests_kind";
  DROP TYPE "public"."enum__checklists_v_version_state";
  DROP TYPE "public"."enum__checklists_v_version_status";
  DROP TYPE "public"."enum__checklists_v_published_locale";`)
}
