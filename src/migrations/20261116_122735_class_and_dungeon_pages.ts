import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_class_pages_blocks_callout_variant" AS ENUM('tip', 'warning', 'stop');
  CREATE TYPE "public"."enum_class_pages_state" AS ENUM('published', 'preparing');
  CREATE TYPE "public"."enum_class_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__class_pages_v_blocks_callout_variant" AS ENUM('tip', 'warning', 'stop');
  CREATE TYPE "public"."enum__class_pages_v_version_state" AS ENUM('published', 'preparing');
  CREATE TYPE "public"."enum__class_pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__class_pages_v_published_locale" AS ENUM('es');
  CREATE TYPE "public"."enum_dungeon_pages_blocks_callout_variant" AS ENUM('tip', 'warning', 'stop');
  CREATE TYPE "public"."enum_dungeon_pages_state" AS ENUM('published', 'preparing');
  CREATE TYPE "public"."enum_dungeon_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__dungeon_pages_v_blocks_callout_variant" AS ENUM('tip', 'warning', 'stop');
  CREATE TYPE "public"."enum__dungeon_pages_v_version_state" AS ENUM('published', 'preparing');
  CREATE TYPE "public"."enum__dungeon_pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__dungeon_pages_v_published_locale" AS ENUM('es');
  CREATE TABLE "class_pages_pvm_builds" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"link" varchar
  );
  
  CREATE TABLE "class_pages_pvm_builds_locales" (
  	"name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "class_pages_pvp_builds" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"link" varchar
  );
  
  CREATE TABLE "class_pages_pvp_builds_locales" (
  	"name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "class_pages_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "class_pages_blocks_rich_text_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "class_pages_blocks_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "class_pages_blocks_image_locales" (
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "class_pages_blocks_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "class_pages_blocks_video_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "class_pages_blocks_callout" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_class_pages_blocks_callout_variant" DEFAULT 'tip',
  	"block_name" varchar
  );
  
  CREATE TABLE "class_pages_blocks_callout_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "class_pages_blocks_fight_monsters" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"monster_id" integer,
  	"quantity" numeric DEFAULT 1
  );
  
  CREATE TABLE "class_pages_blocks_fight" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "class_pages_blocks_step" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"x" numeric,
  	"y" numeric,
  	"block_name" varchar
  );
  
  CREATE TABLE "class_pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"state" "enum_class_pages_state" DEFAULT 'preparing',
  	"legacy_href" varchar,
  	"in_menu" boolean DEFAULT true,
  	"import_snapshot" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_class_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "class_pages_locales" (
  	"title" varchar,
  	"menu_name" varchar,
  	"seo_meta_title" varchar,
  	"seo_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_class_pages_v_version_pvm_builds" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"link" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_class_pages_v_version_pvm_builds_locales" (
  	"name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_class_pages_v_version_pvp_builds" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"link" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_class_pages_v_version_pvp_builds_locales" (
  	"name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_class_pages_v_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_class_pages_v_blocks_rich_text_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_class_pages_v_blocks_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_class_pages_v_blocks_image_locales" (
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_class_pages_v_blocks_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"url" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_class_pages_v_blocks_video_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_class_pages_v_blocks_callout" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__class_pages_v_blocks_callout_variant" DEFAULT 'tip',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_class_pages_v_blocks_callout_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_class_pages_v_blocks_fight_monsters" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"monster_id" integer,
  	"quantity" numeric DEFAULT 1,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_class_pages_v_blocks_fight" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_class_pages_v_blocks_step" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"x" numeric,
  	"y" numeric,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_class_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_state" "enum__class_pages_v_version_state" DEFAULT 'preparing',
  	"version_legacy_href" varchar,
  	"version_in_menu" boolean DEFAULT true,
  	"version_import_snapshot" jsonb,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__class_pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__class_pages_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_class_pages_v_locales" (
  	"version_title" varchar,
  	"version_menu_name" varchar,
  	"version_seo_meta_title" varchar,
  	"version_seo_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "dungeon_pages_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "dungeon_pages_blocks_rich_text_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "dungeon_pages_blocks_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "dungeon_pages_blocks_image_locales" (
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "dungeon_pages_blocks_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "dungeon_pages_blocks_video_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "dungeon_pages_blocks_callout" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_dungeon_pages_blocks_callout_variant" DEFAULT 'tip',
  	"block_name" varchar
  );
  
  CREATE TABLE "dungeon_pages_blocks_callout_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "dungeon_pages_blocks_fight_monsters" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"monster_id" integer,
  	"quantity" numeric DEFAULT 1
  );
  
  CREATE TABLE "dungeon_pages_blocks_fight" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "dungeon_pages_blocks_step" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"x" numeric,
  	"y" numeric,
  	"block_name" varchar
  );
  
  CREATE TABLE "dungeon_pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"state" "enum_dungeon_pages_state" DEFAULT 'preparing',
  	"legacy_href" varchar,
  	"in_menu" boolean DEFAULT true,
  	"dungeon_id" integer,
  	"import_snapshot" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_dungeon_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "dungeon_pages_locales" (
  	"title" varchar,
  	"menu_name" varchar,
  	"seo_meta_title" varchar,
  	"seo_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_dungeon_pages_v_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_dungeon_pages_v_blocks_rich_text_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_dungeon_pages_v_blocks_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_dungeon_pages_v_blocks_image_locales" (
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_dungeon_pages_v_blocks_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"url" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_dungeon_pages_v_blocks_video_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_dungeon_pages_v_blocks_callout" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__dungeon_pages_v_blocks_callout_variant" DEFAULT 'tip',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_dungeon_pages_v_blocks_callout_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_dungeon_pages_v_blocks_fight_monsters" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"monster_id" integer,
  	"quantity" numeric DEFAULT 1,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_dungeon_pages_v_blocks_fight" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_dungeon_pages_v_blocks_step" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"x" numeric,
  	"y" numeric,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_dungeon_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_state" "enum__dungeon_pages_v_version_state" DEFAULT 'preparing',
  	"version_legacy_href" varchar,
  	"version_in_menu" boolean DEFAULT true,
  	"version_dungeon_id" integer,
  	"version_import_snapshot" jsonb,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__dungeon_pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__dungeon_pages_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_dungeon_pages_v_locales" (
  	"version_title" varchar,
  	"version_menu_name" varchar,
  	"version_seo_meta_title" varchar,
  	"version_seo_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "class_pages_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "dungeon_pages_id" integer;
  ALTER TABLE "class_pages_pvm_builds" ADD CONSTRAINT "class_pages_pvm_builds_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "class_pages_pvm_builds" ADD CONSTRAINT "class_pages_pvm_builds_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."class_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "class_pages_pvm_builds_locales" ADD CONSTRAINT "class_pages_pvm_builds_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."class_pages_pvm_builds"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "class_pages_pvp_builds" ADD CONSTRAINT "class_pages_pvp_builds_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "class_pages_pvp_builds" ADD CONSTRAINT "class_pages_pvp_builds_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."class_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "class_pages_pvp_builds_locales" ADD CONSTRAINT "class_pages_pvp_builds_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."class_pages_pvp_builds"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "class_pages_blocks_rich_text" ADD CONSTRAINT "class_pages_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."class_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "class_pages_blocks_rich_text_locales" ADD CONSTRAINT "class_pages_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."class_pages_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "class_pages_blocks_image" ADD CONSTRAINT "class_pages_blocks_image_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "class_pages_blocks_image" ADD CONSTRAINT "class_pages_blocks_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."class_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "class_pages_blocks_image_locales" ADD CONSTRAINT "class_pages_blocks_image_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."class_pages_blocks_image"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "class_pages_blocks_video" ADD CONSTRAINT "class_pages_blocks_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."class_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "class_pages_blocks_video_locales" ADD CONSTRAINT "class_pages_blocks_video_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."class_pages_blocks_video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "class_pages_blocks_callout" ADD CONSTRAINT "class_pages_blocks_callout_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."class_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "class_pages_blocks_callout_locales" ADD CONSTRAINT "class_pages_blocks_callout_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."class_pages_blocks_callout"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "class_pages_blocks_fight_monsters" ADD CONSTRAINT "class_pages_blocks_fight_monsters_monster_id_monsters_id_fk" FOREIGN KEY ("monster_id") REFERENCES "public"."monsters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "class_pages_blocks_fight_monsters" ADD CONSTRAINT "class_pages_blocks_fight_monsters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."class_pages_blocks_fight"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "class_pages_blocks_fight" ADD CONSTRAINT "class_pages_blocks_fight_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."class_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "class_pages_blocks_step" ADD CONSTRAINT "class_pages_blocks_step_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."class_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "class_pages_locales" ADD CONSTRAINT "class_pages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."class_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_class_pages_v_version_pvm_builds" ADD CONSTRAINT "_class_pages_v_version_pvm_builds_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_class_pages_v_version_pvm_builds" ADD CONSTRAINT "_class_pages_v_version_pvm_builds_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_class_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_class_pages_v_version_pvm_builds_locales" ADD CONSTRAINT "_class_pages_v_version_pvm_builds_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_class_pages_v_version_pvm_builds"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_class_pages_v_version_pvp_builds" ADD CONSTRAINT "_class_pages_v_version_pvp_builds_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_class_pages_v_version_pvp_builds" ADD CONSTRAINT "_class_pages_v_version_pvp_builds_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_class_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_class_pages_v_version_pvp_builds_locales" ADD CONSTRAINT "_class_pages_v_version_pvp_builds_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_class_pages_v_version_pvp_builds"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_class_pages_v_blocks_rich_text" ADD CONSTRAINT "_class_pages_v_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_class_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_class_pages_v_blocks_rich_text_locales" ADD CONSTRAINT "_class_pages_v_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_class_pages_v_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_class_pages_v_blocks_image" ADD CONSTRAINT "_class_pages_v_blocks_image_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_class_pages_v_blocks_image" ADD CONSTRAINT "_class_pages_v_blocks_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_class_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_class_pages_v_blocks_image_locales" ADD CONSTRAINT "_class_pages_v_blocks_image_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_class_pages_v_blocks_image"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_class_pages_v_blocks_video" ADD CONSTRAINT "_class_pages_v_blocks_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_class_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_class_pages_v_blocks_video_locales" ADD CONSTRAINT "_class_pages_v_blocks_video_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_class_pages_v_blocks_video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_class_pages_v_blocks_callout" ADD CONSTRAINT "_class_pages_v_blocks_callout_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_class_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_class_pages_v_blocks_callout_locales" ADD CONSTRAINT "_class_pages_v_blocks_callout_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_class_pages_v_blocks_callout"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_class_pages_v_blocks_fight_monsters" ADD CONSTRAINT "_class_pages_v_blocks_fight_monsters_monster_id_monsters_id_fk" FOREIGN KEY ("monster_id") REFERENCES "public"."monsters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_class_pages_v_blocks_fight_monsters" ADD CONSTRAINT "_class_pages_v_blocks_fight_monsters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_class_pages_v_blocks_fight"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_class_pages_v_blocks_fight" ADD CONSTRAINT "_class_pages_v_blocks_fight_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_class_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_class_pages_v_blocks_step" ADD CONSTRAINT "_class_pages_v_blocks_step_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_class_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_class_pages_v" ADD CONSTRAINT "_class_pages_v_parent_id_class_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."class_pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_class_pages_v_locales" ADD CONSTRAINT "_class_pages_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_class_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dungeon_pages_blocks_rich_text" ADD CONSTRAINT "dungeon_pages_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dungeon_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dungeon_pages_blocks_rich_text_locales" ADD CONSTRAINT "dungeon_pages_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dungeon_pages_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dungeon_pages_blocks_image" ADD CONSTRAINT "dungeon_pages_blocks_image_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "dungeon_pages_blocks_image" ADD CONSTRAINT "dungeon_pages_blocks_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dungeon_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dungeon_pages_blocks_image_locales" ADD CONSTRAINT "dungeon_pages_blocks_image_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dungeon_pages_blocks_image"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dungeon_pages_blocks_video" ADD CONSTRAINT "dungeon_pages_blocks_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dungeon_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dungeon_pages_blocks_video_locales" ADD CONSTRAINT "dungeon_pages_blocks_video_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dungeon_pages_blocks_video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dungeon_pages_blocks_callout" ADD CONSTRAINT "dungeon_pages_blocks_callout_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dungeon_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dungeon_pages_blocks_callout_locales" ADD CONSTRAINT "dungeon_pages_blocks_callout_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dungeon_pages_blocks_callout"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dungeon_pages_blocks_fight_monsters" ADD CONSTRAINT "dungeon_pages_blocks_fight_monsters_monster_id_monsters_id_fk" FOREIGN KEY ("monster_id") REFERENCES "public"."monsters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "dungeon_pages_blocks_fight_monsters" ADD CONSTRAINT "dungeon_pages_blocks_fight_monsters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dungeon_pages_blocks_fight"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dungeon_pages_blocks_fight" ADD CONSTRAINT "dungeon_pages_blocks_fight_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dungeon_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dungeon_pages_blocks_step" ADD CONSTRAINT "dungeon_pages_blocks_step_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dungeon_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dungeon_pages" ADD CONSTRAINT "dungeon_pages_dungeon_id_dungeons_id_fk" FOREIGN KEY ("dungeon_id") REFERENCES "public"."dungeons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "dungeon_pages_locales" ADD CONSTRAINT "dungeon_pages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dungeon_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dungeon_pages_v_blocks_rich_text" ADD CONSTRAINT "_dungeon_pages_v_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dungeon_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dungeon_pages_v_blocks_rich_text_locales" ADD CONSTRAINT "_dungeon_pages_v_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dungeon_pages_v_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dungeon_pages_v_blocks_image" ADD CONSTRAINT "_dungeon_pages_v_blocks_image_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_dungeon_pages_v_blocks_image" ADD CONSTRAINT "_dungeon_pages_v_blocks_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dungeon_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dungeon_pages_v_blocks_image_locales" ADD CONSTRAINT "_dungeon_pages_v_blocks_image_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dungeon_pages_v_blocks_image"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dungeon_pages_v_blocks_video" ADD CONSTRAINT "_dungeon_pages_v_blocks_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dungeon_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dungeon_pages_v_blocks_video_locales" ADD CONSTRAINT "_dungeon_pages_v_blocks_video_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dungeon_pages_v_blocks_video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dungeon_pages_v_blocks_callout" ADD CONSTRAINT "_dungeon_pages_v_blocks_callout_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dungeon_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dungeon_pages_v_blocks_callout_locales" ADD CONSTRAINT "_dungeon_pages_v_blocks_callout_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dungeon_pages_v_blocks_callout"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dungeon_pages_v_blocks_fight_monsters" ADD CONSTRAINT "_dungeon_pages_v_blocks_fight_monsters_monster_id_monsters_id_fk" FOREIGN KEY ("monster_id") REFERENCES "public"."monsters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_dungeon_pages_v_blocks_fight_monsters" ADD CONSTRAINT "_dungeon_pages_v_blocks_fight_monsters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dungeon_pages_v_blocks_fight"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dungeon_pages_v_blocks_fight" ADD CONSTRAINT "_dungeon_pages_v_blocks_fight_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dungeon_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dungeon_pages_v_blocks_step" ADD CONSTRAINT "_dungeon_pages_v_blocks_step_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dungeon_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dungeon_pages_v" ADD CONSTRAINT "_dungeon_pages_v_parent_id_dungeon_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."dungeon_pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_dungeon_pages_v" ADD CONSTRAINT "_dungeon_pages_v_version_dungeon_id_dungeons_id_fk" FOREIGN KEY ("version_dungeon_id") REFERENCES "public"."dungeons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_dungeon_pages_v_locales" ADD CONSTRAINT "_dungeon_pages_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dungeon_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "class_pages_pvm_builds_order_idx" ON "class_pages_pvm_builds" USING btree ("_order");
  CREATE INDEX "class_pages_pvm_builds_parent_id_idx" ON "class_pages_pvm_builds" USING btree ("_parent_id");
  CREATE INDEX "class_pages_pvm_builds_image_idx" ON "class_pages_pvm_builds" USING btree ("image_id");
  CREATE UNIQUE INDEX "class_pages_pvm_builds_locales_locale_parent_id_unique" ON "class_pages_pvm_builds_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "class_pages_pvm_builds_locales_parent_id_idx" ON "class_pages_pvm_builds_locales" USING btree ("_parent_id");
  CREATE INDEX "class_pages_pvp_builds_order_idx" ON "class_pages_pvp_builds" USING btree ("_order");
  CREATE INDEX "class_pages_pvp_builds_parent_id_idx" ON "class_pages_pvp_builds" USING btree ("_parent_id");
  CREATE INDEX "class_pages_pvp_builds_image_idx" ON "class_pages_pvp_builds" USING btree ("image_id");
  CREATE UNIQUE INDEX "class_pages_pvp_builds_locales_locale_parent_id_unique" ON "class_pages_pvp_builds_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "class_pages_pvp_builds_locales_parent_id_idx" ON "class_pages_pvp_builds_locales" USING btree ("_parent_id");
  CREATE INDEX "class_pages_blocks_rich_text_order_idx" ON "class_pages_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "class_pages_blocks_rich_text_parent_id_idx" ON "class_pages_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "class_pages_blocks_rich_text_path_idx" ON "class_pages_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "class_pages_blocks_rich_text_locales_locale_parent_id_unique" ON "class_pages_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "class_pages_blocks_rich_text_locales_parent_id_idx" ON "class_pages_blocks_rich_text_locales" USING btree ("_parent_id");
  CREATE INDEX "class_pages_blocks_image_order_idx" ON "class_pages_blocks_image" USING btree ("_order");
  CREATE INDEX "class_pages_blocks_image_parent_id_idx" ON "class_pages_blocks_image" USING btree ("_parent_id");
  CREATE INDEX "class_pages_blocks_image_path_idx" ON "class_pages_blocks_image" USING btree ("_path");
  CREATE INDEX "class_pages_blocks_image_image_idx" ON "class_pages_blocks_image" USING btree ("image_id");
  CREATE UNIQUE INDEX "class_pages_blocks_image_locales_locale_parent_id_unique" ON "class_pages_blocks_image_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "class_pages_blocks_image_locales_parent_id_idx" ON "class_pages_blocks_image_locales" USING btree ("_parent_id");
  CREATE INDEX "class_pages_blocks_video_order_idx" ON "class_pages_blocks_video" USING btree ("_order");
  CREATE INDEX "class_pages_blocks_video_parent_id_idx" ON "class_pages_blocks_video" USING btree ("_parent_id");
  CREATE INDEX "class_pages_blocks_video_path_idx" ON "class_pages_blocks_video" USING btree ("_path");
  CREATE UNIQUE INDEX "class_pages_blocks_video_locales_locale_parent_id_unique" ON "class_pages_blocks_video_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "class_pages_blocks_video_locales_parent_id_idx" ON "class_pages_blocks_video_locales" USING btree ("_parent_id");
  CREATE INDEX "class_pages_blocks_callout_order_idx" ON "class_pages_blocks_callout" USING btree ("_order");
  CREATE INDEX "class_pages_blocks_callout_parent_id_idx" ON "class_pages_blocks_callout" USING btree ("_parent_id");
  CREATE INDEX "class_pages_blocks_callout_path_idx" ON "class_pages_blocks_callout" USING btree ("_path");
  CREATE UNIQUE INDEX "class_pages_blocks_callout_locales_locale_parent_id_unique" ON "class_pages_blocks_callout_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "class_pages_blocks_callout_locales_parent_id_idx" ON "class_pages_blocks_callout_locales" USING btree ("_parent_id");
  CREATE INDEX "class_pages_blocks_fight_monsters_order_idx" ON "class_pages_blocks_fight_monsters" USING btree ("_order");
  CREATE INDEX "class_pages_blocks_fight_monsters_parent_id_idx" ON "class_pages_blocks_fight_monsters" USING btree ("_parent_id");
  CREATE INDEX "class_pages_blocks_fight_monsters_monster_idx" ON "class_pages_blocks_fight_monsters" USING btree ("monster_id");
  CREATE INDEX "class_pages_blocks_fight_order_idx" ON "class_pages_blocks_fight" USING btree ("_order");
  CREATE INDEX "class_pages_blocks_fight_parent_id_idx" ON "class_pages_blocks_fight" USING btree ("_parent_id");
  CREATE INDEX "class_pages_blocks_fight_path_idx" ON "class_pages_blocks_fight" USING btree ("_path");
  CREATE INDEX "class_pages_blocks_step_order_idx" ON "class_pages_blocks_step" USING btree ("_order");
  CREATE INDEX "class_pages_blocks_step_parent_id_idx" ON "class_pages_blocks_step" USING btree ("_parent_id");
  CREATE INDEX "class_pages_blocks_step_path_idx" ON "class_pages_blocks_step" USING btree ("_path");
  CREATE UNIQUE INDEX "class_pages_slug_idx" ON "class_pages" USING btree ("slug");
  CREATE INDEX "class_pages_updated_at_idx" ON "class_pages" USING btree ("updated_at");
  CREATE INDEX "class_pages_created_at_idx" ON "class_pages" USING btree ("created_at");
  CREATE INDEX "class_pages__status_idx" ON "class_pages" USING btree ("_status");
  CREATE UNIQUE INDEX "class_pages_locales_locale_parent_id_unique" ON "class_pages_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "class_pages_locales_parent_id_idx" ON "class_pages_locales" USING btree ("_parent_id");
  CREATE INDEX "_class_pages_v_version_pvm_builds_order_idx" ON "_class_pages_v_version_pvm_builds" USING btree ("_order");
  CREATE INDEX "_class_pages_v_version_pvm_builds_parent_id_idx" ON "_class_pages_v_version_pvm_builds" USING btree ("_parent_id");
  CREATE INDEX "_class_pages_v_version_pvm_builds_image_idx" ON "_class_pages_v_version_pvm_builds" USING btree ("image_id");
  CREATE UNIQUE INDEX "_class_pages_v_version_pvm_builds_locales_locale_parent_id_u" ON "_class_pages_v_version_pvm_builds_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_class_pages_v_version_pvm_builds_locales_parent_id_idx" ON "_class_pages_v_version_pvm_builds_locales" USING btree ("_parent_id");
  CREATE INDEX "_class_pages_v_version_pvp_builds_order_idx" ON "_class_pages_v_version_pvp_builds" USING btree ("_order");
  CREATE INDEX "_class_pages_v_version_pvp_builds_parent_id_idx" ON "_class_pages_v_version_pvp_builds" USING btree ("_parent_id");
  CREATE INDEX "_class_pages_v_version_pvp_builds_image_idx" ON "_class_pages_v_version_pvp_builds" USING btree ("image_id");
  CREATE UNIQUE INDEX "_class_pages_v_version_pvp_builds_locales_locale_parent_id_u" ON "_class_pages_v_version_pvp_builds_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_class_pages_v_version_pvp_builds_locales_parent_id_idx" ON "_class_pages_v_version_pvp_builds_locales" USING btree ("_parent_id");
  CREATE INDEX "_class_pages_v_blocks_rich_text_order_idx" ON "_class_pages_v_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "_class_pages_v_blocks_rich_text_parent_id_idx" ON "_class_pages_v_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "_class_pages_v_blocks_rich_text_path_idx" ON "_class_pages_v_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "_class_pages_v_blocks_rich_text_locales_locale_parent_id_uni" ON "_class_pages_v_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_class_pages_v_blocks_rich_text_locales_parent_id_idx" ON "_class_pages_v_blocks_rich_text_locales" USING btree ("_parent_id");
  CREATE INDEX "_class_pages_v_blocks_image_order_idx" ON "_class_pages_v_blocks_image" USING btree ("_order");
  CREATE INDEX "_class_pages_v_blocks_image_parent_id_idx" ON "_class_pages_v_blocks_image" USING btree ("_parent_id");
  CREATE INDEX "_class_pages_v_blocks_image_path_idx" ON "_class_pages_v_blocks_image" USING btree ("_path");
  CREATE INDEX "_class_pages_v_blocks_image_image_idx" ON "_class_pages_v_blocks_image" USING btree ("image_id");
  CREATE UNIQUE INDEX "_class_pages_v_blocks_image_locales_locale_parent_id_unique" ON "_class_pages_v_blocks_image_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_class_pages_v_blocks_image_locales_parent_id_idx" ON "_class_pages_v_blocks_image_locales" USING btree ("_parent_id");
  CREATE INDEX "_class_pages_v_blocks_video_order_idx" ON "_class_pages_v_blocks_video" USING btree ("_order");
  CREATE INDEX "_class_pages_v_blocks_video_parent_id_idx" ON "_class_pages_v_blocks_video" USING btree ("_parent_id");
  CREATE INDEX "_class_pages_v_blocks_video_path_idx" ON "_class_pages_v_blocks_video" USING btree ("_path");
  CREATE UNIQUE INDEX "_class_pages_v_blocks_video_locales_locale_parent_id_unique" ON "_class_pages_v_blocks_video_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_class_pages_v_blocks_video_locales_parent_id_idx" ON "_class_pages_v_blocks_video_locales" USING btree ("_parent_id");
  CREATE INDEX "_class_pages_v_blocks_callout_order_idx" ON "_class_pages_v_blocks_callout" USING btree ("_order");
  CREATE INDEX "_class_pages_v_blocks_callout_parent_id_idx" ON "_class_pages_v_blocks_callout" USING btree ("_parent_id");
  CREATE INDEX "_class_pages_v_blocks_callout_path_idx" ON "_class_pages_v_blocks_callout" USING btree ("_path");
  CREATE UNIQUE INDEX "_class_pages_v_blocks_callout_locales_locale_parent_id_uniqu" ON "_class_pages_v_blocks_callout_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_class_pages_v_blocks_callout_locales_parent_id_idx" ON "_class_pages_v_blocks_callout_locales" USING btree ("_parent_id");
  CREATE INDEX "_class_pages_v_blocks_fight_monsters_order_idx" ON "_class_pages_v_blocks_fight_monsters" USING btree ("_order");
  CREATE INDEX "_class_pages_v_blocks_fight_monsters_parent_id_idx" ON "_class_pages_v_blocks_fight_monsters" USING btree ("_parent_id");
  CREATE INDEX "_class_pages_v_blocks_fight_monsters_monster_idx" ON "_class_pages_v_blocks_fight_monsters" USING btree ("monster_id");
  CREATE INDEX "_class_pages_v_blocks_fight_order_idx" ON "_class_pages_v_blocks_fight" USING btree ("_order");
  CREATE INDEX "_class_pages_v_blocks_fight_parent_id_idx" ON "_class_pages_v_blocks_fight" USING btree ("_parent_id");
  CREATE INDEX "_class_pages_v_blocks_fight_path_idx" ON "_class_pages_v_blocks_fight" USING btree ("_path");
  CREATE INDEX "_class_pages_v_blocks_step_order_idx" ON "_class_pages_v_blocks_step" USING btree ("_order");
  CREATE INDEX "_class_pages_v_blocks_step_parent_id_idx" ON "_class_pages_v_blocks_step" USING btree ("_parent_id");
  CREATE INDEX "_class_pages_v_blocks_step_path_idx" ON "_class_pages_v_blocks_step" USING btree ("_path");
  CREATE INDEX "_class_pages_v_parent_idx" ON "_class_pages_v" USING btree ("parent_id");
  CREATE INDEX "_class_pages_v_version_version_slug_idx" ON "_class_pages_v" USING btree ("version_slug");
  CREATE INDEX "_class_pages_v_version_version_updated_at_idx" ON "_class_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_class_pages_v_version_version_created_at_idx" ON "_class_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_class_pages_v_version_version__status_idx" ON "_class_pages_v" USING btree ("version__status");
  CREATE INDEX "_class_pages_v_created_at_idx" ON "_class_pages_v" USING btree ("created_at");
  CREATE INDEX "_class_pages_v_updated_at_idx" ON "_class_pages_v" USING btree ("updated_at");
  CREATE INDEX "_class_pages_v_snapshot_idx" ON "_class_pages_v" USING btree ("snapshot");
  CREATE INDEX "_class_pages_v_published_locale_idx" ON "_class_pages_v" USING btree ("published_locale");
  CREATE INDEX "_class_pages_v_latest_idx" ON "_class_pages_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_class_pages_v_locales_locale_parent_id_unique" ON "_class_pages_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_class_pages_v_locales_parent_id_idx" ON "_class_pages_v_locales" USING btree ("_parent_id");
  CREATE INDEX "dungeon_pages_blocks_rich_text_order_idx" ON "dungeon_pages_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "dungeon_pages_blocks_rich_text_parent_id_idx" ON "dungeon_pages_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "dungeon_pages_blocks_rich_text_path_idx" ON "dungeon_pages_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "dungeon_pages_blocks_rich_text_locales_locale_parent_id_uniq" ON "dungeon_pages_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "dungeon_pages_blocks_rich_text_locales_parent_id_idx" ON "dungeon_pages_blocks_rich_text_locales" USING btree ("_parent_id");
  CREATE INDEX "dungeon_pages_blocks_image_order_idx" ON "dungeon_pages_blocks_image" USING btree ("_order");
  CREATE INDEX "dungeon_pages_blocks_image_parent_id_idx" ON "dungeon_pages_blocks_image" USING btree ("_parent_id");
  CREATE INDEX "dungeon_pages_blocks_image_path_idx" ON "dungeon_pages_blocks_image" USING btree ("_path");
  CREATE INDEX "dungeon_pages_blocks_image_image_idx" ON "dungeon_pages_blocks_image" USING btree ("image_id");
  CREATE UNIQUE INDEX "dungeon_pages_blocks_image_locales_locale_parent_id_unique" ON "dungeon_pages_blocks_image_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "dungeon_pages_blocks_image_locales_parent_id_idx" ON "dungeon_pages_blocks_image_locales" USING btree ("_parent_id");
  CREATE INDEX "dungeon_pages_blocks_video_order_idx" ON "dungeon_pages_blocks_video" USING btree ("_order");
  CREATE INDEX "dungeon_pages_blocks_video_parent_id_idx" ON "dungeon_pages_blocks_video" USING btree ("_parent_id");
  CREATE INDEX "dungeon_pages_blocks_video_path_idx" ON "dungeon_pages_blocks_video" USING btree ("_path");
  CREATE UNIQUE INDEX "dungeon_pages_blocks_video_locales_locale_parent_id_unique" ON "dungeon_pages_blocks_video_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "dungeon_pages_blocks_video_locales_parent_id_idx" ON "dungeon_pages_blocks_video_locales" USING btree ("_parent_id");
  CREATE INDEX "dungeon_pages_blocks_callout_order_idx" ON "dungeon_pages_blocks_callout" USING btree ("_order");
  CREATE INDEX "dungeon_pages_blocks_callout_parent_id_idx" ON "dungeon_pages_blocks_callout" USING btree ("_parent_id");
  CREATE INDEX "dungeon_pages_blocks_callout_path_idx" ON "dungeon_pages_blocks_callout" USING btree ("_path");
  CREATE UNIQUE INDEX "dungeon_pages_blocks_callout_locales_locale_parent_id_unique" ON "dungeon_pages_blocks_callout_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "dungeon_pages_blocks_callout_locales_parent_id_idx" ON "dungeon_pages_blocks_callout_locales" USING btree ("_parent_id");
  CREATE INDEX "dungeon_pages_blocks_fight_monsters_order_idx" ON "dungeon_pages_blocks_fight_monsters" USING btree ("_order");
  CREATE INDEX "dungeon_pages_blocks_fight_monsters_parent_id_idx" ON "dungeon_pages_blocks_fight_monsters" USING btree ("_parent_id");
  CREATE INDEX "dungeon_pages_blocks_fight_monsters_monster_idx" ON "dungeon_pages_blocks_fight_monsters" USING btree ("monster_id");
  CREATE INDEX "dungeon_pages_blocks_fight_order_idx" ON "dungeon_pages_blocks_fight" USING btree ("_order");
  CREATE INDEX "dungeon_pages_blocks_fight_parent_id_idx" ON "dungeon_pages_blocks_fight" USING btree ("_parent_id");
  CREATE INDEX "dungeon_pages_blocks_fight_path_idx" ON "dungeon_pages_blocks_fight" USING btree ("_path");
  CREATE INDEX "dungeon_pages_blocks_step_order_idx" ON "dungeon_pages_blocks_step" USING btree ("_order");
  CREATE INDEX "dungeon_pages_blocks_step_parent_id_idx" ON "dungeon_pages_blocks_step" USING btree ("_parent_id");
  CREATE INDEX "dungeon_pages_blocks_step_path_idx" ON "dungeon_pages_blocks_step" USING btree ("_path");
  CREATE UNIQUE INDEX "dungeon_pages_slug_idx" ON "dungeon_pages" USING btree ("slug");
  CREATE INDEX "dungeon_pages_dungeon_idx" ON "dungeon_pages" USING btree ("dungeon_id");
  CREATE INDEX "dungeon_pages_updated_at_idx" ON "dungeon_pages" USING btree ("updated_at");
  CREATE INDEX "dungeon_pages_created_at_idx" ON "dungeon_pages" USING btree ("created_at");
  CREATE INDEX "dungeon_pages__status_idx" ON "dungeon_pages" USING btree ("_status");
  CREATE UNIQUE INDEX "dungeon_pages_locales_locale_parent_id_unique" ON "dungeon_pages_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "dungeon_pages_locales_parent_id_idx" ON "dungeon_pages_locales" USING btree ("_parent_id");
  CREATE INDEX "_dungeon_pages_v_blocks_rich_text_order_idx" ON "_dungeon_pages_v_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "_dungeon_pages_v_blocks_rich_text_parent_id_idx" ON "_dungeon_pages_v_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "_dungeon_pages_v_blocks_rich_text_path_idx" ON "_dungeon_pages_v_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "_dungeon_pages_v_blocks_rich_text_locales_locale_parent_id_u" ON "_dungeon_pages_v_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_dungeon_pages_v_blocks_rich_text_locales_parent_id_idx" ON "_dungeon_pages_v_blocks_rich_text_locales" USING btree ("_parent_id");
  CREATE INDEX "_dungeon_pages_v_blocks_image_order_idx" ON "_dungeon_pages_v_blocks_image" USING btree ("_order");
  CREATE INDEX "_dungeon_pages_v_blocks_image_parent_id_idx" ON "_dungeon_pages_v_blocks_image" USING btree ("_parent_id");
  CREATE INDEX "_dungeon_pages_v_blocks_image_path_idx" ON "_dungeon_pages_v_blocks_image" USING btree ("_path");
  CREATE INDEX "_dungeon_pages_v_blocks_image_image_idx" ON "_dungeon_pages_v_blocks_image" USING btree ("image_id");
  CREATE UNIQUE INDEX "_dungeon_pages_v_blocks_image_locales_locale_parent_id_uniqu" ON "_dungeon_pages_v_blocks_image_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_dungeon_pages_v_blocks_image_locales_parent_id_idx" ON "_dungeon_pages_v_blocks_image_locales" USING btree ("_parent_id");
  CREATE INDEX "_dungeon_pages_v_blocks_video_order_idx" ON "_dungeon_pages_v_blocks_video" USING btree ("_order");
  CREATE INDEX "_dungeon_pages_v_blocks_video_parent_id_idx" ON "_dungeon_pages_v_blocks_video" USING btree ("_parent_id");
  CREATE INDEX "_dungeon_pages_v_blocks_video_path_idx" ON "_dungeon_pages_v_blocks_video" USING btree ("_path");
  CREATE UNIQUE INDEX "_dungeon_pages_v_blocks_video_locales_locale_parent_id_uniqu" ON "_dungeon_pages_v_blocks_video_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_dungeon_pages_v_blocks_video_locales_parent_id_idx" ON "_dungeon_pages_v_blocks_video_locales" USING btree ("_parent_id");
  CREATE INDEX "_dungeon_pages_v_blocks_callout_order_idx" ON "_dungeon_pages_v_blocks_callout" USING btree ("_order");
  CREATE INDEX "_dungeon_pages_v_blocks_callout_parent_id_idx" ON "_dungeon_pages_v_blocks_callout" USING btree ("_parent_id");
  CREATE INDEX "_dungeon_pages_v_blocks_callout_path_idx" ON "_dungeon_pages_v_blocks_callout" USING btree ("_path");
  CREATE UNIQUE INDEX "_dungeon_pages_v_blocks_callout_locales_locale_parent_id_uni" ON "_dungeon_pages_v_blocks_callout_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_dungeon_pages_v_blocks_callout_locales_parent_id_idx" ON "_dungeon_pages_v_blocks_callout_locales" USING btree ("_parent_id");
  CREATE INDEX "_dungeon_pages_v_blocks_fight_monsters_order_idx" ON "_dungeon_pages_v_blocks_fight_monsters" USING btree ("_order");
  CREATE INDEX "_dungeon_pages_v_blocks_fight_monsters_parent_id_idx" ON "_dungeon_pages_v_blocks_fight_monsters" USING btree ("_parent_id");
  CREATE INDEX "_dungeon_pages_v_blocks_fight_monsters_monster_idx" ON "_dungeon_pages_v_blocks_fight_monsters" USING btree ("monster_id");
  CREATE INDEX "_dungeon_pages_v_blocks_fight_order_idx" ON "_dungeon_pages_v_blocks_fight" USING btree ("_order");
  CREATE INDEX "_dungeon_pages_v_blocks_fight_parent_id_idx" ON "_dungeon_pages_v_blocks_fight" USING btree ("_parent_id");
  CREATE INDEX "_dungeon_pages_v_blocks_fight_path_idx" ON "_dungeon_pages_v_blocks_fight" USING btree ("_path");
  CREATE INDEX "_dungeon_pages_v_blocks_step_order_idx" ON "_dungeon_pages_v_blocks_step" USING btree ("_order");
  CREATE INDEX "_dungeon_pages_v_blocks_step_parent_id_idx" ON "_dungeon_pages_v_blocks_step" USING btree ("_parent_id");
  CREATE INDEX "_dungeon_pages_v_blocks_step_path_idx" ON "_dungeon_pages_v_blocks_step" USING btree ("_path");
  CREATE INDEX "_dungeon_pages_v_parent_idx" ON "_dungeon_pages_v" USING btree ("parent_id");
  CREATE INDEX "_dungeon_pages_v_version_version_slug_idx" ON "_dungeon_pages_v" USING btree ("version_slug");
  CREATE INDEX "_dungeon_pages_v_version_version_dungeon_idx" ON "_dungeon_pages_v" USING btree ("version_dungeon_id");
  CREATE INDEX "_dungeon_pages_v_version_version_updated_at_idx" ON "_dungeon_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_dungeon_pages_v_version_version_created_at_idx" ON "_dungeon_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_dungeon_pages_v_version_version__status_idx" ON "_dungeon_pages_v" USING btree ("version__status");
  CREATE INDEX "_dungeon_pages_v_created_at_idx" ON "_dungeon_pages_v" USING btree ("created_at");
  CREATE INDEX "_dungeon_pages_v_updated_at_idx" ON "_dungeon_pages_v" USING btree ("updated_at");
  CREATE INDEX "_dungeon_pages_v_snapshot_idx" ON "_dungeon_pages_v" USING btree ("snapshot");
  CREATE INDEX "_dungeon_pages_v_published_locale_idx" ON "_dungeon_pages_v" USING btree ("published_locale");
  CREATE INDEX "_dungeon_pages_v_latest_idx" ON "_dungeon_pages_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_dungeon_pages_v_locales_locale_parent_id_unique" ON "_dungeon_pages_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_dungeon_pages_v_locales_parent_id_idx" ON "_dungeon_pages_v_locales" USING btree ("_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_class_pages_fk" FOREIGN KEY ("class_pages_id") REFERENCES "public"."class_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_dungeon_pages_fk" FOREIGN KEY ("dungeon_pages_id") REFERENCES "public"."dungeon_pages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_class_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("class_pages_id");
  CREATE INDEX "payload_locked_documents_rels_dungeon_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("dungeon_pages_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "class_pages_pvm_builds" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "class_pages_pvm_builds_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "class_pages_pvp_builds" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "class_pages_pvp_builds_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "class_pages_blocks_rich_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "class_pages_blocks_rich_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "class_pages_blocks_image" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "class_pages_blocks_image_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "class_pages_blocks_video" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "class_pages_blocks_video_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "class_pages_blocks_callout" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "class_pages_blocks_callout_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "class_pages_blocks_fight_monsters" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "class_pages_blocks_fight" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "class_pages_blocks_step" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "class_pages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "class_pages_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_class_pages_v_version_pvm_builds" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_class_pages_v_version_pvm_builds_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_class_pages_v_version_pvp_builds" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_class_pages_v_version_pvp_builds_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_class_pages_v_blocks_rich_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_class_pages_v_blocks_rich_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_class_pages_v_blocks_image" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_class_pages_v_blocks_image_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_class_pages_v_blocks_video" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_class_pages_v_blocks_video_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_class_pages_v_blocks_callout" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_class_pages_v_blocks_callout_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_class_pages_v_blocks_fight_monsters" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_class_pages_v_blocks_fight" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_class_pages_v_blocks_step" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_class_pages_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_class_pages_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dungeon_pages_blocks_rich_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dungeon_pages_blocks_rich_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dungeon_pages_blocks_image" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dungeon_pages_blocks_image_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dungeon_pages_blocks_video" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dungeon_pages_blocks_video_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dungeon_pages_blocks_callout" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dungeon_pages_blocks_callout_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dungeon_pages_blocks_fight_monsters" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dungeon_pages_blocks_fight" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dungeon_pages_blocks_step" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dungeon_pages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dungeon_pages_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dungeon_pages_v_blocks_rich_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dungeon_pages_v_blocks_rich_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dungeon_pages_v_blocks_image" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dungeon_pages_v_blocks_image_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dungeon_pages_v_blocks_video" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dungeon_pages_v_blocks_video_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dungeon_pages_v_blocks_callout" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dungeon_pages_v_blocks_callout_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dungeon_pages_v_blocks_fight_monsters" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dungeon_pages_v_blocks_fight" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dungeon_pages_v_blocks_step" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dungeon_pages_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dungeon_pages_v_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "class_pages_pvm_builds" CASCADE;
  DROP TABLE "class_pages_pvm_builds_locales" CASCADE;
  DROP TABLE "class_pages_pvp_builds" CASCADE;
  DROP TABLE "class_pages_pvp_builds_locales" CASCADE;
  DROP TABLE "class_pages_blocks_rich_text" CASCADE;
  DROP TABLE "class_pages_blocks_rich_text_locales" CASCADE;
  DROP TABLE "class_pages_blocks_image" CASCADE;
  DROP TABLE "class_pages_blocks_image_locales" CASCADE;
  DROP TABLE "class_pages_blocks_video" CASCADE;
  DROP TABLE "class_pages_blocks_video_locales" CASCADE;
  DROP TABLE "class_pages_blocks_callout" CASCADE;
  DROP TABLE "class_pages_blocks_callout_locales" CASCADE;
  DROP TABLE "class_pages_blocks_fight_monsters" CASCADE;
  DROP TABLE "class_pages_blocks_fight" CASCADE;
  DROP TABLE "class_pages_blocks_step" CASCADE;
  DROP TABLE "class_pages" CASCADE;
  DROP TABLE "class_pages_locales" CASCADE;
  DROP TABLE "_class_pages_v_version_pvm_builds" CASCADE;
  DROP TABLE "_class_pages_v_version_pvm_builds_locales" CASCADE;
  DROP TABLE "_class_pages_v_version_pvp_builds" CASCADE;
  DROP TABLE "_class_pages_v_version_pvp_builds_locales" CASCADE;
  DROP TABLE "_class_pages_v_blocks_rich_text" CASCADE;
  DROP TABLE "_class_pages_v_blocks_rich_text_locales" CASCADE;
  DROP TABLE "_class_pages_v_blocks_image" CASCADE;
  DROP TABLE "_class_pages_v_blocks_image_locales" CASCADE;
  DROP TABLE "_class_pages_v_blocks_video" CASCADE;
  DROP TABLE "_class_pages_v_blocks_video_locales" CASCADE;
  DROP TABLE "_class_pages_v_blocks_callout" CASCADE;
  DROP TABLE "_class_pages_v_blocks_callout_locales" CASCADE;
  DROP TABLE "_class_pages_v_blocks_fight_monsters" CASCADE;
  DROP TABLE "_class_pages_v_blocks_fight" CASCADE;
  DROP TABLE "_class_pages_v_blocks_step" CASCADE;
  DROP TABLE "_class_pages_v" CASCADE;
  DROP TABLE "_class_pages_v_locales" CASCADE;
  DROP TABLE "dungeon_pages_blocks_rich_text" CASCADE;
  DROP TABLE "dungeon_pages_blocks_rich_text_locales" CASCADE;
  DROP TABLE "dungeon_pages_blocks_image" CASCADE;
  DROP TABLE "dungeon_pages_blocks_image_locales" CASCADE;
  DROP TABLE "dungeon_pages_blocks_video" CASCADE;
  DROP TABLE "dungeon_pages_blocks_video_locales" CASCADE;
  DROP TABLE "dungeon_pages_blocks_callout" CASCADE;
  DROP TABLE "dungeon_pages_blocks_callout_locales" CASCADE;
  DROP TABLE "dungeon_pages_blocks_fight_monsters" CASCADE;
  DROP TABLE "dungeon_pages_blocks_fight" CASCADE;
  DROP TABLE "dungeon_pages_blocks_step" CASCADE;
  DROP TABLE "dungeon_pages" CASCADE;
  DROP TABLE "dungeon_pages_locales" CASCADE;
  DROP TABLE "_dungeon_pages_v_blocks_rich_text" CASCADE;
  DROP TABLE "_dungeon_pages_v_blocks_rich_text_locales" CASCADE;
  DROP TABLE "_dungeon_pages_v_blocks_image" CASCADE;
  DROP TABLE "_dungeon_pages_v_blocks_image_locales" CASCADE;
  DROP TABLE "_dungeon_pages_v_blocks_video" CASCADE;
  DROP TABLE "_dungeon_pages_v_blocks_video_locales" CASCADE;
  DROP TABLE "_dungeon_pages_v_blocks_callout" CASCADE;
  DROP TABLE "_dungeon_pages_v_blocks_callout_locales" CASCADE;
  DROP TABLE "_dungeon_pages_v_blocks_fight_monsters" CASCADE;
  DROP TABLE "_dungeon_pages_v_blocks_fight" CASCADE;
  DROP TABLE "_dungeon_pages_v_blocks_step" CASCADE;
  DROP TABLE "_dungeon_pages_v" CASCADE;
  DROP TABLE "_dungeon_pages_v_locales" CASCADE;
  -- DROP TABLE … CASCADE ya se llevó estas claves ajenas: IF EXISTS para que la vuelta atrás no falle.
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_class_pages_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_dungeon_pages_fk";
  
  DROP INDEX "payload_locked_documents_rels_class_pages_id_idx";
  DROP INDEX "payload_locked_documents_rels_dungeon_pages_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "class_pages_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "dungeon_pages_id";
  DROP TYPE "public"."enum_class_pages_blocks_callout_variant";
  DROP TYPE "public"."enum_class_pages_state";
  DROP TYPE "public"."enum_class_pages_status";
  DROP TYPE "public"."enum__class_pages_v_blocks_callout_variant";
  DROP TYPE "public"."enum__class_pages_v_version_state";
  DROP TYPE "public"."enum__class_pages_v_version_status";
  DROP TYPE "public"."enum__class_pages_v_published_locale";
  DROP TYPE "public"."enum_dungeon_pages_blocks_callout_variant";
  DROP TYPE "public"."enum_dungeon_pages_state";
  DROP TYPE "public"."enum_dungeon_pages_status";
  DROP TYPE "public"."enum__dungeon_pages_v_blocks_callout_variant";
  DROP TYPE "public"."enum__dungeon_pages_v_version_state";
  DROP TYPE "public"."enum__dungeon_pages_v_version_status";
  DROP TYPE "public"."enum__dungeon_pages_v_published_locale";`)
}
