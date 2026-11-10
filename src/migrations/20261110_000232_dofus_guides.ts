import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_dofus_guides_blocks_callout_variant" AS ENUM('tip', 'warning', 'stop');
  CREATE TYPE "public"."enum_dofus_guides_state" AS ENUM('published', 'preparing');
  CREATE TYPE "public"."enum_dofus_guides_tag" AS ENUM('primordial', 'event');
  CREATE TYPE "public"."enum_dofus_guides_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__dofus_guides_v_blocks_callout_variant" AS ENUM('tip', 'warning', 'stop');
  CREATE TYPE "public"."enum__dofus_guides_v_version_state" AS ENUM('published', 'preparing');
  CREATE TYPE "public"."enum__dofus_guides_v_version_tag" AS ENUM('primordial', 'event');
  CREATE TYPE "public"."enum__dofus_guides_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__dofus_guides_v_published_locale" AS ENUM('es');
  CREATE TABLE "dofus_guides_blocks_need_item" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item_id" integer,
  	"quantity" numeric DEFAULT 1,
  	"block_name" varchar
  );
  
  CREATE TABLE "dofus_guides_blocks_need_item_locales" (
  	"name" varchar,
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "dofus_guides_blocks_need_note" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "dofus_guides_blocks_need_note_locales" (
  	"text" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "dofus_guides_needs_groups" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "dofus_guides_needs_groups_locales" (
  	"name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "dofus_guides_blocks_dofus_achievement" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"achievement_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "dofus_guides_blocks_dofus_achievement_locales" (
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "dofus_meta_ach" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"achievement_id" integer
  );
  
  CREATE TABLE "dofus_meta_ach_locales" (
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "dofus_guides_blocks_dofus_metalogro" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "dofus_guides_blocks_dofus_metalogro_locales" (
  	"name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "dofus_guides_blocks_dofus_quests_quests" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"guide_id" integer
  );
  
  CREATE TABLE "dofus_guides_blocks_dofus_quests_quests_locales" (
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "dofus_guides_blocks_dofus_quests" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "dofus_guides_blocks_dofus_quests_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "dofus_guides_blocks_dofus_quest" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"guide_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "dofus_guides_blocks_dofus_quest_locales" (
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "dofus_guides_blocks_dofus_note" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "dofus_guides_blocks_dofus_note_locales" (
  	"text" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "dofus_guides_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "dofus_guides_blocks_rich_text_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "dofus_guides_blocks_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "dofus_guides_blocks_image_locales" (
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "dofus_guides_blocks_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "dofus_guides_blocks_video_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "dofus_guides_blocks_callout" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_dofus_guides_blocks_callout_variant" DEFAULT 'tip',
  	"block_name" varchar
  );
  
  CREATE TABLE "dofus_guides_blocks_callout_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "dofus_guides_blocks_fight_monsters" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"monster_id" integer,
  	"quantity" numeric DEFAULT 1
  );
  
  CREATE TABLE "dofus_guides_blocks_fight" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "dofus_guides_blocks_step" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"x" numeric,
  	"y" numeric,
  	"block_name" varchar
  );
  
  CREATE TABLE "dofus_guides" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"dofus_id" integer,
  	"slug" varchar,
  	"state" "enum_dofus_guides_state" DEFAULT 'preparing',
  	"order" numeric,
  	"level" numeric,
  	"tag" "enum_dofus_guides_tag",
  	"color" varchar,
  	"video" varchar,
  	"checklist_url" varchar,
  	"original_url" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_dofus_guides_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "dofus_guides_locales" (
  	"name" varchar,
  	"aliases" varchar,
  	"prerequisites" jsonb,
  	"needs_title" varchar,
  	"rewards" jsonb,
  	"intro" jsonb,
  	"outro" jsonb,
  	"checklist_name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_need_item" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"item_id" integer,
  	"quantity" numeric DEFAULT 1,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_need_item_locales" (
  	"name" varchar,
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_need_note" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_need_note_locales" (
  	"text" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_dofus_guides_v_version_needs_groups" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_dofus_guides_v_version_needs_groups_locales" (
  	"name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_dofus_achievement" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"achievement_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_dofus_achievement_locales" (
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_dofus_meta_ach_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"achievement_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_dofus_meta_ach_v_locales" (
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_dofus_metalogro" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_dofus_metalogro_locales" (
  	"name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_dofus_quests_quests" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"guide_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_dofus_quests_quests_locales" (
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_dofus_quests" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_dofus_quests_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_dofus_quest" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"guide_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_dofus_quest_locales" (
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_dofus_note" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_dofus_note_locales" (
  	"text" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_rich_text_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_image_locales" (
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"url" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_video_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_callout" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__dofus_guides_v_blocks_callout_variant" DEFAULT 'tip',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_callout_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_fight_monsters" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"monster_id" integer,
  	"quantity" numeric DEFAULT 1,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_fight" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_step" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"x" numeric,
  	"y" numeric,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_dofus_guides_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_dofus_id" integer,
  	"version_slug" varchar,
  	"version_state" "enum__dofus_guides_v_version_state" DEFAULT 'preparing',
  	"version_order" numeric,
  	"version_level" numeric,
  	"version_tag" "enum__dofus_guides_v_version_tag",
  	"version_color" varchar,
  	"version_video" varchar,
  	"version_checklist_url" varchar,
  	"version_original_url" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__dofus_guides_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__dofus_guides_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_dofus_guides_v_locales" (
  	"version_name" varchar,
  	"version_aliases" varchar,
  	"version_prerequisites" jsonb,
  	"version_needs_title" varchar,
  	"version_rewards" jsonb,
  	"version_intro" jsonb,
  	"version_outro" jsonb,
  	"version_checklist_name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "dofus_guides_id" integer;
  ALTER TABLE "dofus_guides_blocks_need_item" ADD CONSTRAINT "dofus_guides_blocks_need_item_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_need_item" ADD CONSTRAINT "dofus_guides_blocks_need_item_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_need_item_locales" ADD CONSTRAINT "dofus_guides_blocks_need_item_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides_blocks_need_item"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_need_note" ADD CONSTRAINT "dofus_guides_blocks_need_note_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_need_note_locales" ADD CONSTRAINT "dofus_guides_blocks_need_note_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides_blocks_need_note"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_needs_groups" ADD CONSTRAINT "dofus_guides_needs_groups_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_needs_groups_locales" ADD CONSTRAINT "dofus_guides_needs_groups_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides_needs_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_dofus_achievement" ADD CONSTRAINT "dofus_guides_blocks_dofus_achievement_achievement_id_achievement_pages_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievement_pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_dofus_achievement" ADD CONSTRAINT "dofus_guides_blocks_dofus_achievement_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_dofus_achievement_locales" ADD CONSTRAINT "dofus_guides_blocks_dofus_achievement_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides_blocks_dofus_achievement"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_meta_ach" ADD CONSTRAINT "dofus_meta_ach_achievement_id_achievement_pages_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievement_pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "dofus_meta_ach" ADD CONSTRAINT "dofus_meta_ach_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides_blocks_dofus_metalogro"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_meta_ach_locales" ADD CONSTRAINT "dofus_meta_ach_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_meta_ach"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_dofus_metalogro" ADD CONSTRAINT "dofus_guides_blocks_dofus_metalogro_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_dofus_metalogro_locales" ADD CONSTRAINT "dofus_guides_blocks_dofus_metalogro_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides_blocks_dofus_metalogro"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_dofus_quests_quests" ADD CONSTRAINT "dofus_guides_blocks_dofus_quests_quests_guide_id_quest_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."quest_guides"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_dofus_quests_quests" ADD CONSTRAINT "dofus_guides_blocks_dofus_quests_quests_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides_blocks_dofus_quests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_dofus_quests_quests_locales" ADD CONSTRAINT "dofus_guides_blocks_dofus_quests_quests_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides_blocks_dofus_quests_quests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_dofus_quests" ADD CONSTRAINT "dofus_guides_blocks_dofus_quests_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_dofus_quests_locales" ADD CONSTRAINT "dofus_guides_blocks_dofus_quests_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides_blocks_dofus_quests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_dofus_quest" ADD CONSTRAINT "dofus_guides_blocks_dofus_quest_guide_id_quest_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."quest_guides"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_dofus_quest" ADD CONSTRAINT "dofus_guides_blocks_dofus_quest_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_dofus_quest_locales" ADD CONSTRAINT "dofus_guides_blocks_dofus_quest_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides_blocks_dofus_quest"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_dofus_note" ADD CONSTRAINT "dofus_guides_blocks_dofus_note_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_dofus_note_locales" ADD CONSTRAINT "dofus_guides_blocks_dofus_note_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides_blocks_dofus_note"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_rich_text" ADD CONSTRAINT "dofus_guides_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_rich_text_locales" ADD CONSTRAINT "dofus_guides_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_image" ADD CONSTRAINT "dofus_guides_blocks_image_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_image" ADD CONSTRAINT "dofus_guides_blocks_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_image_locales" ADD CONSTRAINT "dofus_guides_blocks_image_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides_blocks_image"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_video" ADD CONSTRAINT "dofus_guides_blocks_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_video_locales" ADD CONSTRAINT "dofus_guides_blocks_video_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides_blocks_video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_callout" ADD CONSTRAINT "dofus_guides_blocks_callout_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_callout_locales" ADD CONSTRAINT "dofus_guides_blocks_callout_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides_blocks_callout"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_fight_monsters" ADD CONSTRAINT "dofus_guides_blocks_fight_monsters_monster_id_monsters_id_fk" FOREIGN KEY ("monster_id") REFERENCES "public"."monsters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_fight_monsters" ADD CONSTRAINT "dofus_guides_blocks_fight_monsters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides_blocks_fight"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_fight" ADD CONSTRAINT "dofus_guides_blocks_fight_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_step" ADD CONSTRAINT "dofus_guides_blocks_step_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides" ADD CONSTRAINT "dofus_guides_dofus_id_items_id_fk" FOREIGN KEY ("dofus_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "dofus_guides_locales" ADD CONSTRAINT "dofus_guides_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_need_item" ADD CONSTRAINT "_dofus_guides_v_blocks_need_item_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_need_item" ADD CONSTRAINT "_dofus_guides_v_blocks_need_item_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_need_item_locales" ADD CONSTRAINT "_dofus_guides_v_blocks_need_item_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v_blocks_need_item"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_need_note" ADD CONSTRAINT "_dofus_guides_v_blocks_need_note_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_need_note_locales" ADD CONSTRAINT "_dofus_guides_v_blocks_need_note_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v_blocks_need_note"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_version_needs_groups" ADD CONSTRAINT "_dofus_guides_v_version_needs_groups_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_version_needs_groups_locales" ADD CONSTRAINT "_dofus_guides_v_version_needs_groups_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v_version_needs_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_dofus_achievement" ADD CONSTRAINT "_dofus_guides_v_blocks_dofus_achievement_achievement_id_achievement_pages_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievement_pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_dofus_achievement" ADD CONSTRAINT "_dofus_guides_v_blocks_dofus_achievement_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_dofus_achievement_locales" ADD CONSTRAINT "_dofus_guides_v_blocks_dofus_achievement_locales_parent_i_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v_blocks_dofus_achievement"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_meta_ach_v" ADD CONSTRAINT "_dofus_meta_ach_v_achievement_id_achievement_pages_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievement_pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_dofus_meta_ach_v" ADD CONSTRAINT "_dofus_meta_ach_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v_blocks_dofus_metalogro"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_meta_ach_v_locales" ADD CONSTRAINT "_dofus_meta_ach_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_meta_ach_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_dofus_metalogro" ADD CONSTRAINT "_dofus_guides_v_blocks_dofus_metalogro_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_dofus_metalogro_locales" ADD CONSTRAINT "_dofus_guides_v_blocks_dofus_metalogro_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v_blocks_dofus_metalogro"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_dofus_quests_quests" ADD CONSTRAINT "_dofus_guides_v_blocks_dofus_quests_quests_guide_id_quest_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."quest_guides"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_dofus_quests_quests" ADD CONSTRAINT "_dofus_guides_v_blocks_dofus_quests_quests_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v_blocks_dofus_quests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_dofus_quests_quests_locales" ADD CONSTRAINT "_dofus_guides_v_blocks_dofus_quests_quests_locales_parent_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v_blocks_dofus_quests_quests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_dofus_quests" ADD CONSTRAINT "_dofus_guides_v_blocks_dofus_quests_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_dofus_quests_locales" ADD CONSTRAINT "_dofus_guides_v_blocks_dofus_quests_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v_blocks_dofus_quests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_dofus_quest" ADD CONSTRAINT "_dofus_guides_v_blocks_dofus_quest_guide_id_quest_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."quest_guides"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_dofus_quest" ADD CONSTRAINT "_dofus_guides_v_blocks_dofus_quest_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_dofus_quest_locales" ADD CONSTRAINT "_dofus_guides_v_blocks_dofus_quest_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v_blocks_dofus_quest"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_dofus_note" ADD CONSTRAINT "_dofus_guides_v_blocks_dofus_note_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_dofus_note_locales" ADD CONSTRAINT "_dofus_guides_v_blocks_dofus_note_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v_blocks_dofus_note"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_rich_text" ADD CONSTRAINT "_dofus_guides_v_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_rich_text_locales" ADD CONSTRAINT "_dofus_guides_v_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_image" ADD CONSTRAINT "_dofus_guides_v_blocks_image_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_image" ADD CONSTRAINT "_dofus_guides_v_blocks_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_image_locales" ADD CONSTRAINT "_dofus_guides_v_blocks_image_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v_blocks_image"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_video" ADD CONSTRAINT "_dofus_guides_v_blocks_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_video_locales" ADD CONSTRAINT "_dofus_guides_v_blocks_video_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v_blocks_video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_callout" ADD CONSTRAINT "_dofus_guides_v_blocks_callout_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_callout_locales" ADD CONSTRAINT "_dofus_guides_v_blocks_callout_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v_blocks_callout"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_fight_monsters" ADD CONSTRAINT "_dofus_guides_v_blocks_fight_monsters_monster_id_monsters_id_fk" FOREIGN KEY ("monster_id") REFERENCES "public"."monsters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_fight_monsters" ADD CONSTRAINT "_dofus_guides_v_blocks_fight_monsters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v_blocks_fight"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_fight" ADD CONSTRAINT "_dofus_guides_v_blocks_fight_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_step" ADD CONSTRAINT "_dofus_guides_v_blocks_step_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v" ADD CONSTRAINT "_dofus_guides_v_parent_id_dofus_guides_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."dofus_guides"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v" ADD CONSTRAINT "_dofus_guides_v_version_dofus_id_items_id_fk" FOREIGN KEY ("version_dofus_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_locales" ADD CONSTRAINT "_dofus_guides_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "dofus_guides_blocks_need_item_order_idx" ON "dofus_guides_blocks_need_item" USING btree ("_order");
  CREATE INDEX "dofus_guides_blocks_need_item_parent_id_idx" ON "dofus_guides_blocks_need_item" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_blocks_need_item_path_idx" ON "dofus_guides_blocks_need_item" USING btree ("_path");
  CREATE INDEX "dofus_guides_blocks_need_item_item_idx" ON "dofus_guides_blocks_need_item" USING btree ("item_id");
  CREATE UNIQUE INDEX "dofus_guides_blocks_need_item_locales_locale_parent_id_uniqu" ON "dofus_guides_blocks_need_item_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "dofus_guides_blocks_need_item_locales_parent_id_idx" ON "dofus_guides_blocks_need_item_locales" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_blocks_need_note_order_idx" ON "dofus_guides_blocks_need_note" USING btree ("_order");
  CREATE INDEX "dofus_guides_blocks_need_note_parent_id_idx" ON "dofus_guides_blocks_need_note" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_blocks_need_note_path_idx" ON "dofus_guides_blocks_need_note" USING btree ("_path");
  CREATE UNIQUE INDEX "dofus_guides_blocks_need_note_locales_locale_parent_id_uniqu" ON "dofus_guides_blocks_need_note_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "dofus_guides_blocks_need_note_locales_parent_id_idx" ON "dofus_guides_blocks_need_note_locales" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_needs_groups_order_idx" ON "dofus_guides_needs_groups" USING btree ("_order");
  CREATE INDEX "dofus_guides_needs_groups_parent_id_idx" ON "dofus_guides_needs_groups" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "dofus_guides_needs_groups_locales_locale_parent_id_unique" ON "dofus_guides_needs_groups_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "dofus_guides_needs_groups_locales_parent_id_idx" ON "dofus_guides_needs_groups_locales" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_blocks_dofus_achievement_order_idx" ON "dofus_guides_blocks_dofus_achievement" USING btree ("_order");
  CREATE INDEX "dofus_guides_blocks_dofus_achievement_parent_id_idx" ON "dofus_guides_blocks_dofus_achievement" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_blocks_dofus_achievement_path_idx" ON "dofus_guides_blocks_dofus_achievement" USING btree ("_path");
  CREATE INDEX "dofus_guides_blocks_dofus_achievement_achievement_idx" ON "dofus_guides_blocks_dofus_achievement" USING btree ("achievement_id");
  CREATE UNIQUE INDEX "dofus_guides_blocks_dofus_achievement_locales_locale_parent_" ON "dofus_guides_blocks_dofus_achievement_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "dofus_guides_blocks_dofus_achievement_locales_parent_id_idx" ON "dofus_guides_blocks_dofus_achievement_locales" USING btree ("_parent_id");
  CREATE INDEX "dofus_meta_ach_order_idx" ON "dofus_meta_ach" USING btree ("_order");
  CREATE INDEX "dofus_meta_ach_parent_id_idx" ON "dofus_meta_ach" USING btree ("_parent_id");
  CREATE INDEX "dofus_meta_ach_achievement_idx" ON "dofus_meta_ach" USING btree ("achievement_id");
  CREATE UNIQUE INDEX "dofus_meta_ach_locales_locale_parent_id_unique" ON "dofus_meta_ach_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "dofus_meta_ach_locales_parent_id_idx" ON "dofus_meta_ach_locales" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_blocks_dofus_metalogro_order_idx" ON "dofus_guides_blocks_dofus_metalogro" USING btree ("_order");
  CREATE INDEX "dofus_guides_blocks_dofus_metalogro_parent_id_idx" ON "dofus_guides_blocks_dofus_metalogro" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_blocks_dofus_metalogro_path_idx" ON "dofus_guides_blocks_dofus_metalogro" USING btree ("_path");
  CREATE UNIQUE INDEX "dofus_guides_blocks_dofus_metalogro_locales_locale_parent_id" ON "dofus_guides_blocks_dofus_metalogro_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "dofus_guides_blocks_dofus_metalogro_locales_parent_id_idx" ON "dofus_guides_blocks_dofus_metalogro_locales" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_blocks_dofus_quests_quests_order_idx" ON "dofus_guides_blocks_dofus_quests_quests" USING btree ("_order");
  CREATE INDEX "dofus_guides_blocks_dofus_quests_quests_parent_id_idx" ON "dofus_guides_blocks_dofus_quests_quests" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_blocks_dofus_quests_quests_guide_idx" ON "dofus_guides_blocks_dofus_quests_quests" USING btree ("guide_id");
  CREATE UNIQUE INDEX "dofus_guides_blocks_dofus_quests_quests_locales_locale_paren" ON "dofus_guides_blocks_dofus_quests_quests_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "dofus_guides_blocks_dofus_quests_quests_locales_parent_i_idx" ON "dofus_guides_blocks_dofus_quests_quests_locales" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_blocks_dofus_quests_order_idx" ON "dofus_guides_blocks_dofus_quests" USING btree ("_order");
  CREATE INDEX "dofus_guides_blocks_dofus_quests_parent_id_idx" ON "dofus_guides_blocks_dofus_quests" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_blocks_dofus_quests_path_idx" ON "dofus_guides_blocks_dofus_quests" USING btree ("_path");
  CREATE UNIQUE INDEX "dofus_guides_blocks_dofus_quests_locales_locale_parent_id_un" ON "dofus_guides_blocks_dofus_quests_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "dofus_guides_blocks_dofus_quests_locales_parent_id_idx" ON "dofus_guides_blocks_dofus_quests_locales" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_blocks_dofus_quest_order_idx" ON "dofus_guides_blocks_dofus_quest" USING btree ("_order");
  CREATE INDEX "dofus_guides_blocks_dofus_quest_parent_id_idx" ON "dofus_guides_blocks_dofus_quest" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_blocks_dofus_quest_path_idx" ON "dofus_guides_blocks_dofus_quest" USING btree ("_path");
  CREATE INDEX "dofus_guides_blocks_dofus_quest_guide_idx" ON "dofus_guides_blocks_dofus_quest" USING btree ("guide_id");
  CREATE UNIQUE INDEX "dofus_guides_blocks_dofus_quest_locales_locale_parent_id_uni" ON "dofus_guides_blocks_dofus_quest_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "dofus_guides_blocks_dofus_quest_locales_parent_id_idx" ON "dofus_guides_blocks_dofus_quest_locales" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_blocks_dofus_note_order_idx" ON "dofus_guides_blocks_dofus_note" USING btree ("_order");
  CREATE INDEX "dofus_guides_blocks_dofus_note_parent_id_idx" ON "dofus_guides_blocks_dofus_note" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_blocks_dofus_note_path_idx" ON "dofus_guides_blocks_dofus_note" USING btree ("_path");
  CREATE UNIQUE INDEX "dofus_guides_blocks_dofus_note_locales_locale_parent_id_uniq" ON "dofus_guides_blocks_dofus_note_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "dofus_guides_blocks_dofus_note_locales_parent_id_idx" ON "dofus_guides_blocks_dofus_note_locales" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_blocks_rich_text_order_idx" ON "dofus_guides_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "dofus_guides_blocks_rich_text_parent_id_idx" ON "dofus_guides_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_blocks_rich_text_path_idx" ON "dofus_guides_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "dofus_guides_blocks_rich_text_locales_locale_parent_id_uniqu" ON "dofus_guides_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "dofus_guides_blocks_rich_text_locales_parent_id_idx" ON "dofus_guides_blocks_rich_text_locales" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_blocks_image_order_idx" ON "dofus_guides_blocks_image" USING btree ("_order");
  CREATE INDEX "dofus_guides_blocks_image_parent_id_idx" ON "dofus_guides_blocks_image" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_blocks_image_path_idx" ON "dofus_guides_blocks_image" USING btree ("_path");
  CREATE INDEX "dofus_guides_blocks_image_image_idx" ON "dofus_guides_blocks_image" USING btree ("image_id");
  CREATE UNIQUE INDEX "dofus_guides_blocks_image_locales_locale_parent_id_unique" ON "dofus_guides_blocks_image_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "dofus_guides_blocks_image_locales_parent_id_idx" ON "dofus_guides_blocks_image_locales" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_blocks_video_order_idx" ON "dofus_guides_blocks_video" USING btree ("_order");
  CREATE INDEX "dofus_guides_blocks_video_parent_id_idx" ON "dofus_guides_blocks_video" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_blocks_video_path_idx" ON "dofus_guides_blocks_video" USING btree ("_path");
  CREATE UNIQUE INDEX "dofus_guides_blocks_video_locales_locale_parent_id_unique" ON "dofus_guides_blocks_video_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "dofus_guides_blocks_video_locales_parent_id_idx" ON "dofus_guides_blocks_video_locales" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_blocks_callout_order_idx" ON "dofus_guides_blocks_callout" USING btree ("_order");
  CREATE INDEX "dofus_guides_blocks_callout_parent_id_idx" ON "dofus_guides_blocks_callout" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_blocks_callout_path_idx" ON "dofus_guides_blocks_callout" USING btree ("_path");
  CREATE UNIQUE INDEX "dofus_guides_blocks_callout_locales_locale_parent_id_unique" ON "dofus_guides_blocks_callout_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "dofus_guides_blocks_callout_locales_parent_id_idx" ON "dofus_guides_blocks_callout_locales" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_blocks_fight_monsters_order_idx" ON "dofus_guides_blocks_fight_monsters" USING btree ("_order");
  CREATE INDEX "dofus_guides_blocks_fight_monsters_parent_id_idx" ON "dofus_guides_blocks_fight_monsters" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_blocks_fight_monsters_monster_idx" ON "dofus_guides_blocks_fight_monsters" USING btree ("monster_id");
  CREATE INDEX "dofus_guides_blocks_fight_order_idx" ON "dofus_guides_blocks_fight" USING btree ("_order");
  CREATE INDEX "dofus_guides_blocks_fight_parent_id_idx" ON "dofus_guides_blocks_fight" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_blocks_fight_path_idx" ON "dofus_guides_blocks_fight" USING btree ("_path");
  CREATE INDEX "dofus_guides_blocks_step_order_idx" ON "dofus_guides_blocks_step" USING btree ("_order");
  CREATE INDEX "dofus_guides_blocks_step_parent_id_idx" ON "dofus_guides_blocks_step" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_blocks_step_path_idx" ON "dofus_guides_blocks_step" USING btree ("_path");
  CREATE UNIQUE INDEX "dofus_guides_dofus_idx" ON "dofus_guides" USING btree ("dofus_id");
  CREATE UNIQUE INDEX "dofus_guides_slug_idx" ON "dofus_guides" USING btree ("slug");
  CREATE INDEX "dofus_guides_updated_at_idx" ON "dofus_guides" USING btree ("updated_at");
  CREATE INDEX "dofus_guides_created_at_idx" ON "dofus_guides" USING btree ("created_at");
  CREATE INDEX "dofus_guides__status_idx" ON "dofus_guides" USING btree ("_status");
  CREATE UNIQUE INDEX "dofus_guides_locales_locale_parent_id_unique" ON "dofus_guides_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "dofus_guides_locales_parent_id_idx" ON "dofus_guides_locales" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_need_item_order_idx" ON "_dofus_guides_v_blocks_need_item" USING btree ("_order");
  CREATE INDEX "_dofus_guides_v_blocks_need_item_parent_id_idx" ON "_dofus_guides_v_blocks_need_item" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_need_item_path_idx" ON "_dofus_guides_v_blocks_need_item" USING btree ("_path");
  CREATE INDEX "_dofus_guides_v_blocks_need_item_item_idx" ON "_dofus_guides_v_blocks_need_item" USING btree ("item_id");
  CREATE UNIQUE INDEX "_dofus_guides_v_blocks_need_item_locales_locale_parent_id_un" ON "_dofus_guides_v_blocks_need_item_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_need_item_locales_parent_id_idx" ON "_dofus_guides_v_blocks_need_item_locales" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_need_note_order_idx" ON "_dofus_guides_v_blocks_need_note" USING btree ("_order");
  CREATE INDEX "_dofus_guides_v_blocks_need_note_parent_id_idx" ON "_dofus_guides_v_blocks_need_note" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_need_note_path_idx" ON "_dofus_guides_v_blocks_need_note" USING btree ("_path");
  CREATE UNIQUE INDEX "_dofus_guides_v_blocks_need_note_locales_locale_parent_id_un" ON "_dofus_guides_v_blocks_need_note_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_need_note_locales_parent_id_idx" ON "_dofus_guides_v_blocks_need_note_locales" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_version_needs_groups_order_idx" ON "_dofus_guides_v_version_needs_groups" USING btree ("_order");
  CREATE INDEX "_dofus_guides_v_version_needs_groups_parent_id_idx" ON "_dofus_guides_v_version_needs_groups" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_dofus_guides_v_version_needs_groups_locales_locale_parent_i" ON "_dofus_guides_v_version_needs_groups_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_dofus_guides_v_version_needs_groups_locales_parent_id_idx" ON "_dofus_guides_v_version_needs_groups_locales" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_dofus_achievement_order_idx" ON "_dofus_guides_v_blocks_dofus_achievement" USING btree ("_order");
  CREATE INDEX "_dofus_guides_v_blocks_dofus_achievement_parent_id_idx" ON "_dofus_guides_v_blocks_dofus_achievement" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_dofus_achievement_path_idx" ON "_dofus_guides_v_blocks_dofus_achievement" USING btree ("_path");
  CREATE INDEX "_dofus_guides_v_blocks_dofus_achievement_achievement_idx" ON "_dofus_guides_v_blocks_dofus_achievement" USING btree ("achievement_id");
  CREATE UNIQUE INDEX "_dofus_guides_v_blocks_dofus_achievement_locales_locale_pare" ON "_dofus_guides_v_blocks_dofus_achievement_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_dofus_achievement_locales_parent__idx" ON "_dofus_guides_v_blocks_dofus_achievement_locales" USING btree ("_parent_id");
  CREATE INDEX "_dofus_meta_ach_v_order_idx" ON "_dofus_meta_ach_v" USING btree ("_order");
  CREATE INDEX "_dofus_meta_ach_v_parent_id_idx" ON "_dofus_meta_ach_v" USING btree ("_parent_id");
  CREATE INDEX "_dofus_meta_ach_v_achievement_idx" ON "_dofus_meta_ach_v" USING btree ("achievement_id");
  CREATE UNIQUE INDEX "_dofus_meta_ach_v_locales_locale_parent_id_unique" ON "_dofus_meta_ach_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_dofus_meta_ach_v_locales_parent_id_idx" ON "_dofus_meta_ach_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_dofus_metalogro_order_idx" ON "_dofus_guides_v_blocks_dofus_metalogro" USING btree ("_order");
  CREATE INDEX "_dofus_guides_v_blocks_dofus_metalogro_parent_id_idx" ON "_dofus_guides_v_blocks_dofus_metalogro" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_dofus_metalogro_path_idx" ON "_dofus_guides_v_blocks_dofus_metalogro" USING btree ("_path");
  CREATE UNIQUE INDEX "_dofus_guides_v_blocks_dofus_metalogro_locales_locale_parent" ON "_dofus_guides_v_blocks_dofus_metalogro_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_dofus_metalogro_locales_parent_id_idx" ON "_dofus_guides_v_blocks_dofus_metalogro_locales" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_dofus_quests_quests_order_idx" ON "_dofus_guides_v_blocks_dofus_quests_quests" USING btree ("_order");
  CREATE INDEX "_dofus_guides_v_blocks_dofus_quests_quests_parent_id_idx" ON "_dofus_guides_v_blocks_dofus_quests_quests" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_dofus_quests_quests_guide_idx" ON "_dofus_guides_v_blocks_dofus_quests_quests" USING btree ("guide_id");
  CREATE UNIQUE INDEX "_dofus_guides_v_blocks_dofus_quests_quests_locales_locale_pa" ON "_dofus_guides_v_blocks_dofus_quests_quests_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_dofus_quests_quests_locales_paren_idx" ON "_dofus_guides_v_blocks_dofus_quests_quests_locales" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_dofus_quests_order_idx" ON "_dofus_guides_v_blocks_dofus_quests" USING btree ("_order");
  CREATE INDEX "_dofus_guides_v_blocks_dofus_quests_parent_id_idx" ON "_dofus_guides_v_blocks_dofus_quests" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_dofus_quests_path_idx" ON "_dofus_guides_v_blocks_dofus_quests" USING btree ("_path");
  CREATE UNIQUE INDEX "_dofus_guides_v_blocks_dofus_quests_locales_locale_parent_id" ON "_dofus_guides_v_blocks_dofus_quests_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_dofus_quests_locales_parent_id_idx" ON "_dofus_guides_v_blocks_dofus_quests_locales" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_dofus_quest_order_idx" ON "_dofus_guides_v_blocks_dofus_quest" USING btree ("_order");
  CREATE INDEX "_dofus_guides_v_blocks_dofus_quest_parent_id_idx" ON "_dofus_guides_v_blocks_dofus_quest" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_dofus_quest_path_idx" ON "_dofus_guides_v_blocks_dofus_quest" USING btree ("_path");
  CREATE INDEX "_dofus_guides_v_blocks_dofus_quest_guide_idx" ON "_dofus_guides_v_blocks_dofus_quest" USING btree ("guide_id");
  CREATE UNIQUE INDEX "_dofus_guides_v_blocks_dofus_quest_locales_locale_parent_id_" ON "_dofus_guides_v_blocks_dofus_quest_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_dofus_quest_locales_parent_id_idx" ON "_dofus_guides_v_blocks_dofus_quest_locales" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_dofus_note_order_idx" ON "_dofus_guides_v_blocks_dofus_note" USING btree ("_order");
  CREATE INDEX "_dofus_guides_v_blocks_dofus_note_parent_id_idx" ON "_dofus_guides_v_blocks_dofus_note" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_dofus_note_path_idx" ON "_dofus_guides_v_blocks_dofus_note" USING btree ("_path");
  CREATE UNIQUE INDEX "_dofus_guides_v_blocks_dofus_note_locales_locale_parent_id_u" ON "_dofus_guides_v_blocks_dofus_note_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_dofus_note_locales_parent_id_idx" ON "_dofus_guides_v_blocks_dofus_note_locales" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_rich_text_order_idx" ON "_dofus_guides_v_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "_dofus_guides_v_blocks_rich_text_parent_id_idx" ON "_dofus_guides_v_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_rich_text_path_idx" ON "_dofus_guides_v_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "_dofus_guides_v_blocks_rich_text_locales_locale_parent_id_un" ON "_dofus_guides_v_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_rich_text_locales_parent_id_idx" ON "_dofus_guides_v_blocks_rich_text_locales" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_image_order_idx" ON "_dofus_guides_v_blocks_image" USING btree ("_order");
  CREATE INDEX "_dofus_guides_v_blocks_image_parent_id_idx" ON "_dofus_guides_v_blocks_image" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_image_path_idx" ON "_dofus_guides_v_blocks_image" USING btree ("_path");
  CREATE INDEX "_dofus_guides_v_blocks_image_image_idx" ON "_dofus_guides_v_blocks_image" USING btree ("image_id");
  CREATE UNIQUE INDEX "_dofus_guides_v_blocks_image_locales_locale_parent_id_unique" ON "_dofus_guides_v_blocks_image_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_image_locales_parent_id_idx" ON "_dofus_guides_v_blocks_image_locales" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_video_order_idx" ON "_dofus_guides_v_blocks_video" USING btree ("_order");
  CREATE INDEX "_dofus_guides_v_blocks_video_parent_id_idx" ON "_dofus_guides_v_blocks_video" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_video_path_idx" ON "_dofus_guides_v_blocks_video" USING btree ("_path");
  CREATE UNIQUE INDEX "_dofus_guides_v_blocks_video_locales_locale_parent_id_unique" ON "_dofus_guides_v_blocks_video_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_video_locales_parent_id_idx" ON "_dofus_guides_v_blocks_video_locales" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_callout_order_idx" ON "_dofus_guides_v_blocks_callout" USING btree ("_order");
  CREATE INDEX "_dofus_guides_v_blocks_callout_parent_id_idx" ON "_dofus_guides_v_blocks_callout" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_callout_path_idx" ON "_dofus_guides_v_blocks_callout" USING btree ("_path");
  CREATE UNIQUE INDEX "_dofus_guides_v_blocks_callout_locales_locale_parent_id_uniq" ON "_dofus_guides_v_blocks_callout_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_callout_locales_parent_id_idx" ON "_dofus_guides_v_blocks_callout_locales" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_fight_monsters_order_idx" ON "_dofus_guides_v_blocks_fight_monsters" USING btree ("_order");
  CREATE INDEX "_dofus_guides_v_blocks_fight_monsters_parent_id_idx" ON "_dofus_guides_v_blocks_fight_monsters" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_fight_monsters_monster_idx" ON "_dofus_guides_v_blocks_fight_monsters" USING btree ("monster_id");
  CREATE INDEX "_dofus_guides_v_blocks_fight_order_idx" ON "_dofus_guides_v_blocks_fight" USING btree ("_order");
  CREATE INDEX "_dofus_guides_v_blocks_fight_parent_id_idx" ON "_dofus_guides_v_blocks_fight" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_fight_path_idx" ON "_dofus_guides_v_blocks_fight" USING btree ("_path");
  CREATE INDEX "_dofus_guides_v_blocks_step_order_idx" ON "_dofus_guides_v_blocks_step" USING btree ("_order");
  CREATE INDEX "_dofus_guides_v_blocks_step_parent_id_idx" ON "_dofus_guides_v_blocks_step" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_step_path_idx" ON "_dofus_guides_v_blocks_step" USING btree ("_path");
  CREATE INDEX "_dofus_guides_v_parent_idx" ON "_dofus_guides_v" USING btree ("parent_id");
  CREATE INDEX "_dofus_guides_v_version_version_dofus_idx" ON "_dofus_guides_v" USING btree ("version_dofus_id");
  CREATE INDEX "_dofus_guides_v_version_version_slug_idx" ON "_dofus_guides_v" USING btree ("version_slug");
  CREATE INDEX "_dofus_guides_v_version_version_updated_at_idx" ON "_dofus_guides_v" USING btree ("version_updated_at");
  CREATE INDEX "_dofus_guides_v_version_version_created_at_idx" ON "_dofus_guides_v" USING btree ("version_created_at");
  CREATE INDEX "_dofus_guides_v_version_version__status_idx" ON "_dofus_guides_v" USING btree ("version__status");
  CREATE INDEX "_dofus_guides_v_created_at_idx" ON "_dofus_guides_v" USING btree ("created_at");
  CREATE INDEX "_dofus_guides_v_updated_at_idx" ON "_dofus_guides_v" USING btree ("updated_at");
  CREATE INDEX "_dofus_guides_v_snapshot_idx" ON "_dofus_guides_v" USING btree ("snapshot");
  CREATE INDEX "_dofus_guides_v_published_locale_idx" ON "_dofus_guides_v" USING btree ("published_locale");
  CREATE INDEX "_dofus_guides_v_latest_idx" ON "_dofus_guides_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_dofus_guides_v_locales_locale_parent_id_unique" ON "_dofus_guides_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_dofus_guides_v_locales_parent_id_idx" ON "_dofus_guides_v_locales" USING btree ("_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_dofus_guides_fk" FOREIGN KEY ("dofus_guides_id") REFERENCES "public"."dofus_guides"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_dofus_guides_id_idx" ON "payload_locked_documents_rels" USING btree ("dofus_guides_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "dofus_guides_blocks_need_item" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dofus_guides_blocks_need_item_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dofus_guides_blocks_need_note" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dofus_guides_blocks_need_note_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dofus_guides_needs_groups" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dofus_guides_needs_groups_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dofus_guides_blocks_dofus_achievement" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dofus_guides_blocks_dofus_achievement_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dofus_meta_ach" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dofus_meta_ach_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dofus_guides_blocks_dofus_metalogro" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dofus_guides_blocks_dofus_metalogro_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dofus_guides_blocks_dofus_quests_quests" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dofus_guides_blocks_dofus_quests_quests_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dofus_guides_blocks_dofus_quests" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dofus_guides_blocks_dofus_quests_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dofus_guides_blocks_dofus_quest" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dofus_guides_blocks_dofus_quest_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dofus_guides_blocks_dofus_note" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dofus_guides_blocks_dofus_note_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dofus_guides_blocks_rich_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dofus_guides_blocks_rich_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dofus_guides_blocks_image" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dofus_guides_blocks_image_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dofus_guides_blocks_video" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dofus_guides_blocks_video_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dofus_guides_blocks_callout" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dofus_guides_blocks_callout_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dofus_guides_blocks_fight_monsters" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dofus_guides_blocks_fight" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dofus_guides_blocks_step" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dofus_guides" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dofus_guides_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dofus_guides_v_blocks_need_item" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dofus_guides_v_blocks_need_item_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dofus_guides_v_blocks_need_note" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dofus_guides_v_blocks_need_note_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dofus_guides_v_version_needs_groups" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dofus_guides_v_version_needs_groups_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dofus_guides_v_blocks_dofus_achievement" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dofus_guides_v_blocks_dofus_achievement_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dofus_meta_ach_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dofus_meta_ach_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dofus_guides_v_blocks_dofus_metalogro" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dofus_guides_v_blocks_dofus_metalogro_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dofus_guides_v_blocks_dofus_quests_quests" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dofus_guides_v_blocks_dofus_quests_quests_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dofus_guides_v_blocks_dofus_quests" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dofus_guides_v_blocks_dofus_quests_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dofus_guides_v_blocks_dofus_quest" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dofus_guides_v_blocks_dofus_quest_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dofus_guides_v_blocks_dofus_note" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dofus_guides_v_blocks_dofus_note_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dofus_guides_v_blocks_rich_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dofus_guides_v_blocks_rich_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dofus_guides_v_blocks_image" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dofus_guides_v_blocks_image_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dofus_guides_v_blocks_video" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dofus_guides_v_blocks_video_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dofus_guides_v_blocks_callout" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dofus_guides_v_blocks_callout_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dofus_guides_v_blocks_fight_monsters" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dofus_guides_v_blocks_fight" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dofus_guides_v_blocks_step" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dofus_guides_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dofus_guides_v_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "dofus_guides_blocks_need_item" CASCADE;
  DROP TABLE "dofus_guides_blocks_need_item_locales" CASCADE;
  DROP TABLE "dofus_guides_blocks_need_note" CASCADE;
  DROP TABLE "dofus_guides_blocks_need_note_locales" CASCADE;
  DROP TABLE "dofus_guides_needs_groups" CASCADE;
  DROP TABLE "dofus_guides_needs_groups_locales" CASCADE;
  DROP TABLE "dofus_guides_blocks_dofus_achievement" CASCADE;
  DROP TABLE "dofus_guides_blocks_dofus_achievement_locales" CASCADE;
  DROP TABLE "dofus_meta_ach" CASCADE;
  DROP TABLE "dofus_meta_ach_locales" CASCADE;
  DROP TABLE "dofus_guides_blocks_dofus_metalogro" CASCADE;
  DROP TABLE "dofus_guides_blocks_dofus_metalogro_locales" CASCADE;
  DROP TABLE "dofus_guides_blocks_dofus_quests_quests" CASCADE;
  DROP TABLE "dofus_guides_blocks_dofus_quests_quests_locales" CASCADE;
  DROP TABLE "dofus_guides_blocks_dofus_quests" CASCADE;
  DROP TABLE "dofus_guides_blocks_dofus_quests_locales" CASCADE;
  DROP TABLE "dofus_guides_blocks_dofus_quest" CASCADE;
  DROP TABLE "dofus_guides_blocks_dofus_quest_locales" CASCADE;
  DROP TABLE "dofus_guides_blocks_dofus_note" CASCADE;
  DROP TABLE "dofus_guides_blocks_dofus_note_locales" CASCADE;
  DROP TABLE "dofus_guides_blocks_rich_text" CASCADE;
  DROP TABLE "dofus_guides_blocks_rich_text_locales" CASCADE;
  DROP TABLE "dofus_guides_blocks_image" CASCADE;
  DROP TABLE "dofus_guides_blocks_image_locales" CASCADE;
  DROP TABLE "dofus_guides_blocks_video" CASCADE;
  DROP TABLE "dofus_guides_blocks_video_locales" CASCADE;
  DROP TABLE "dofus_guides_blocks_callout" CASCADE;
  DROP TABLE "dofus_guides_blocks_callout_locales" CASCADE;
  DROP TABLE "dofus_guides_blocks_fight_monsters" CASCADE;
  DROP TABLE "dofus_guides_blocks_fight" CASCADE;
  DROP TABLE "dofus_guides_blocks_step" CASCADE;
  DROP TABLE "dofus_guides" CASCADE;
  DROP TABLE "dofus_guides_locales" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_need_item" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_need_item_locales" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_need_note" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_need_note_locales" CASCADE;
  DROP TABLE "_dofus_guides_v_version_needs_groups" CASCADE;
  DROP TABLE "_dofus_guides_v_version_needs_groups_locales" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_dofus_achievement" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_dofus_achievement_locales" CASCADE;
  DROP TABLE "_dofus_meta_ach_v" CASCADE;
  DROP TABLE "_dofus_meta_ach_v_locales" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_dofus_metalogro" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_dofus_metalogro_locales" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_dofus_quests_quests" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_dofus_quests_quests_locales" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_dofus_quests" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_dofus_quests_locales" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_dofus_quest" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_dofus_quest_locales" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_dofus_note" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_dofus_note_locales" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_rich_text" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_rich_text_locales" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_image" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_image_locales" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_video" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_video_locales" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_callout" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_callout_locales" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_fight_monsters" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_fight" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_step" CASCADE;
  DROP TABLE "_dofus_guides_v" CASCADE;
  DROP TABLE "_dofus_guides_v_locales" CASCADE;
  -- DROP TABLE … CASCADE ya se llevó esta clave ajena: IF EXISTS para que la vuelta atrás no falle.
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_dofus_guides_fk";
  
  DROP INDEX "payload_locked_documents_rels_dofus_guides_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "dofus_guides_id";
  DROP TYPE "public"."enum_dofus_guides_blocks_callout_variant";
  DROP TYPE "public"."enum_dofus_guides_state";
  DROP TYPE "public"."enum_dofus_guides_tag";
  DROP TYPE "public"."enum_dofus_guides_status";
  DROP TYPE "public"."enum__dofus_guides_v_blocks_callout_variant";
  DROP TYPE "public"."enum__dofus_guides_v_version_state";
  DROP TYPE "public"."enum__dofus_guides_v_version_tag";
  DROP TYPE "public"."enum__dofus_guides_v_version_status";
  DROP TYPE "public"."enum__dofus_guides_v_published_locale";`)
}
