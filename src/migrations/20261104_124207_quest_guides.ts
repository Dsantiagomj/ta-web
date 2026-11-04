import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_quest_guides_blocks_callout_variant" AS ENUM('tip', 'warning', 'stop');
  CREATE TYPE "public"."enum_quest_guides_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__quest_guides_v_blocks_callout_variant" AS ENUM('tip', 'warning', 'stop');
  CREATE TYPE "public"."enum__quest_guides_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__quest_guides_v_published_locale" AS ENUM('es');
  CREATE TABLE "quest_guides_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "quest_guides_blocks_rich_text_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "quest_guides_blocks_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "quest_guides_blocks_image_locales" (
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "quest_guides_blocks_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "quest_guides_blocks_video_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "quest_guides_blocks_callout" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_quest_guides_blocks_callout_variant" DEFAULT 'tip',
  	"block_name" varchar
  );
  
  CREATE TABLE "quest_guides_blocks_callout_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "quest_guides" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"summary_start_x" numeric,
  	"summary_start_y" numeric,
  	"original_url" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_quest_guides_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "quest_guides_locales" (
  	"title" varchar,
  	"summary_prerequisites" varchar,
  	"summary_needs" varchar,
  	"summary_rewards" varchar,
  	"summary_start_npc" varchar,
  	"seo_meta_title" varchar,
  	"seo_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "quest_guides_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"quests_id" integer
  );
  
  CREATE TABLE "_quest_guides_v_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_quest_guides_v_blocks_rich_text_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_quest_guides_v_blocks_image" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_quest_guides_v_blocks_image_locales" (
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_quest_guides_v_blocks_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"url" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_quest_guides_v_blocks_video_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_quest_guides_v_blocks_callout" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__quest_guides_v_blocks_callout_variant" DEFAULT 'tip',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_quest_guides_v_blocks_callout_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_quest_guides_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_summary_start_x" numeric,
  	"version_summary_start_y" numeric,
  	"version_original_url" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__quest_guides_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__quest_guides_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_quest_guides_v_locales" (
  	"version_title" varchar,
  	"version_summary_prerequisites" varchar,
  	"version_summary_needs" varchar,
  	"version_summary_rewards" varchar,
  	"version_summary_start_npc" varchar,
  	"version_seo_meta_title" varchar,
  	"version_seo_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_quest_guides_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"quests_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "quest_guides_id" integer;
  ALTER TABLE "quest_guides_blocks_rich_text" ADD CONSTRAINT "quest_guides_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quest_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quest_guides_blocks_rich_text_locales" ADD CONSTRAINT "quest_guides_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quest_guides_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quest_guides_blocks_image" ADD CONSTRAINT "quest_guides_blocks_image_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "quest_guides_blocks_image" ADD CONSTRAINT "quest_guides_blocks_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quest_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quest_guides_blocks_image_locales" ADD CONSTRAINT "quest_guides_blocks_image_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quest_guides_blocks_image"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quest_guides_blocks_video" ADD CONSTRAINT "quest_guides_blocks_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quest_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quest_guides_blocks_video_locales" ADD CONSTRAINT "quest_guides_blocks_video_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quest_guides_blocks_video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quest_guides_blocks_callout" ADD CONSTRAINT "quest_guides_blocks_callout_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quest_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quest_guides_blocks_callout_locales" ADD CONSTRAINT "quest_guides_blocks_callout_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quest_guides_blocks_callout"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quest_guides_locales" ADD CONSTRAINT "quest_guides_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quest_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quest_guides_rels" ADD CONSTRAINT "quest_guides_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."quest_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quest_guides_rels" ADD CONSTRAINT "quest_guides_rels_quests_fk" FOREIGN KEY ("quests_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_quest_guides_v_blocks_rich_text" ADD CONSTRAINT "_quest_guides_v_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_quest_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_quest_guides_v_blocks_rich_text_locales" ADD CONSTRAINT "_quest_guides_v_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_quest_guides_v_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_quest_guides_v_blocks_image" ADD CONSTRAINT "_quest_guides_v_blocks_image_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_quest_guides_v_blocks_image" ADD CONSTRAINT "_quest_guides_v_blocks_image_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_quest_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_quest_guides_v_blocks_image_locales" ADD CONSTRAINT "_quest_guides_v_blocks_image_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_quest_guides_v_blocks_image"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_quest_guides_v_blocks_video" ADD CONSTRAINT "_quest_guides_v_blocks_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_quest_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_quest_guides_v_blocks_video_locales" ADD CONSTRAINT "_quest_guides_v_blocks_video_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_quest_guides_v_blocks_video"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_quest_guides_v_blocks_callout" ADD CONSTRAINT "_quest_guides_v_blocks_callout_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_quest_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_quest_guides_v_blocks_callout_locales" ADD CONSTRAINT "_quest_guides_v_blocks_callout_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_quest_guides_v_blocks_callout"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_quest_guides_v" ADD CONSTRAINT "_quest_guides_v_parent_id_quest_guides_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."quest_guides"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_quest_guides_v_locales" ADD CONSTRAINT "_quest_guides_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_quest_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_quest_guides_v_rels" ADD CONSTRAINT "_quest_guides_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_quest_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_quest_guides_v_rels" ADD CONSTRAINT "_quest_guides_v_rels_quests_fk" FOREIGN KEY ("quests_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "quest_guides_blocks_rich_text_order_idx" ON "quest_guides_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "quest_guides_blocks_rich_text_parent_id_idx" ON "quest_guides_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "quest_guides_blocks_rich_text_path_idx" ON "quest_guides_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "quest_guides_blocks_rich_text_locales_locale_parent_id_uniqu" ON "quest_guides_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "quest_guides_blocks_rich_text_locales_parent_id_idx" ON "quest_guides_blocks_rich_text_locales" USING btree ("_parent_id");
  CREATE INDEX "quest_guides_blocks_image_order_idx" ON "quest_guides_blocks_image" USING btree ("_order");
  CREATE INDEX "quest_guides_blocks_image_parent_id_idx" ON "quest_guides_blocks_image" USING btree ("_parent_id");
  CREATE INDEX "quest_guides_blocks_image_path_idx" ON "quest_guides_blocks_image" USING btree ("_path");
  CREATE INDEX "quest_guides_blocks_image_image_idx" ON "quest_guides_blocks_image" USING btree ("image_id");
  CREATE UNIQUE INDEX "quest_guides_blocks_image_locales_locale_parent_id_unique" ON "quest_guides_blocks_image_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "quest_guides_blocks_image_locales_parent_id_idx" ON "quest_guides_blocks_image_locales" USING btree ("_parent_id");
  CREATE INDEX "quest_guides_blocks_video_order_idx" ON "quest_guides_blocks_video" USING btree ("_order");
  CREATE INDEX "quest_guides_blocks_video_parent_id_idx" ON "quest_guides_blocks_video" USING btree ("_parent_id");
  CREATE INDEX "quest_guides_blocks_video_path_idx" ON "quest_guides_blocks_video" USING btree ("_path");
  CREATE UNIQUE INDEX "quest_guides_blocks_video_locales_locale_parent_id_unique" ON "quest_guides_blocks_video_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "quest_guides_blocks_video_locales_parent_id_idx" ON "quest_guides_blocks_video_locales" USING btree ("_parent_id");
  CREATE INDEX "quest_guides_blocks_callout_order_idx" ON "quest_guides_blocks_callout" USING btree ("_order");
  CREATE INDEX "quest_guides_blocks_callout_parent_id_idx" ON "quest_guides_blocks_callout" USING btree ("_parent_id");
  CREATE INDEX "quest_guides_blocks_callout_path_idx" ON "quest_guides_blocks_callout" USING btree ("_path");
  CREATE UNIQUE INDEX "quest_guides_blocks_callout_locales_locale_parent_id_unique" ON "quest_guides_blocks_callout_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "quest_guides_blocks_callout_locales_parent_id_idx" ON "quest_guides_blocks_callout_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "quest_guides_slug_idx" ON "quest_guides" USING btree ("slug");
  CREATE INDEX "quest_guides_updated_at_idx" ON "quest_guides" USING btree ("updated_at");
  CREATE INDEX "quest_guides_created_at_idx" ON "quest_guides" USING btree ("created_at");
  CREATE INDEX "quest_guides__status_idx" ON "quest_guides" USING btree ("_status");
  CREATE UNIQUE INDEX "quest_guides_locales_locale_parent_id_unique" ON "quest_guides_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "quest_guides_locales_parent_id_idx" ON "quest_guides_locales" USING btree ("_parent_id");
  CREATE INDEX "quest_guides_rels_order_idx" ON "quest_guides_rels" USING btree ("order");
  CREATE INDEX "quest_guides_rels_parent_idx" ON "quest_guides_rels" USING btree ("parent_id");
  CREATE INDEX "quest_guides_rels_path_idx" ON "quest_guides_rels" USING btree ("path");
  CREATE INDEX "quest_guides_rels_quests_id_idx" ON "quest_guides_rels" USING btree ("quests_id");
  CREATE INDEX "_quest_guides_v_blocks_rich_text_order_idx" ON "_quest_guides_v_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "_quest_guides_v_blocks_rich_text_parent_id_idx" ON "_quest_guides_v_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "_quest_guides_v_blocks_rich_text_path_idx" ON "_quest_guides_v_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "_quest_guides_v_blocks_rich_text_locales_locale_parent_id_un" ON "_quest_guides_v_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_quest_guides_v_blocks_rich_text_locales_parent_id_idx" ON "_quest_guides_v_blocks_rich_text_locales" USING btree ("_parent_id");
  CREATE INDEX "_quest_guides_v_blocks_image_order_idx" ON "_quest_guides_v_blocks_image" USING btree ("_order");
  CREATE INDEX "_quest_guides_v_blocks_image_parent_id_idx" ON "_quest_guides_v_blocks_image" USING btree ("_parent_id");
  CREATE INDEX "_quest_guides_v_blocks_image_path_idx" ON "_quest_guides_v_blocks_image" USING btree ("_path");
  CREATE INDEX "_quest_guides_v_blocks_image_image_idx" ON "_quest_guides_v_blocks_image" USING btree ("image_id");
  CREATE UNIQUE INDEX "_quest_guides_v_blocks_image_locales_locale_parent_id_unique" ON "_quest_guides_v_blocks_image_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_quest_guides_v_blocks_image_locales_parent_id_idx" ON "_quest_guides_v_blocks_image_locales" USING btree ("_parent_id");
  CREATE INDEX "_quest_guides_v_blocks_video_order_idx" ON "_quest_guides_v_blocks_video" USING btree ("_order");
  CREATE INDEX "_quest_guides_v_blocks_video_parent_id_idx" ON "_quest_guides_v_blocks_video" USING btree ("_parent_id");
  CREATE INDEX "_quest_guides_v_blocks_video_path_idx" ON "_quest_guides_v_blocks_video" USING btree ("_path");
  CREATE UNIQUE INDEX "_quest_guides_v_blocks_video_locales_locale_parent_id_unique" ON "_quest_guides_v_blocks_video_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_quest_guides_v_blocks_video_locales_parent_id_idx" ON "_quest_guides_v_blocks_video_locales" USING btree ("_parent_id");
  CREATE INDEX "_quest_guides_v_blocks_callout_order_idx" ON "_quest_guides_v_blocks_callout" USING btree ("_order");
  CREATE INDEX "_quest_guides_v_blocks_callout_parent_id_idx" ON "_quest_guides_v_blocks_callout" USING btree ("_parent_id");
  CREATE INDEX "_quest_guides_v_blocks_callout_path_idx" ON "_quest_guides_v_blocks_callout" USING btree ("_path");
  CREATE UNIQUE INDEX "_quest_guides_v_blocks_callout_locales_locale_parent_id_uniq" ON "_quest_guides_v_blocks_callout_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_quest_guides_v_blocks_callout_locales_parent_id_idx" ON "_quest_guides_v_blocks_callout_locales" USING btree ("_parent_id");
  CREATE INDEX "_quest_guides_v_parent_idx" ON "_quest_guides_v" USING btree ("parent_id");
  CREATE INDEX "_quest_guides_v_version_version_slug_idx" ON "_quest_guides_v" USING btree ("version_slug");
  CREATE INDEX "_quest_guides_v_version_version_updated_at_idx" ON "_quest_guides_v" USING btree ("version_updated_at");
  CREATE INDEX "_quest_guides_v_version_version_created_at_idx" ON "_quest_guides_v" USING btree ("version_created_at");
  CREATE INDEX "_quest_guides_v_version_version__status_idx" ON "_quest_guides_v" USING btree ("version__status");
  CREATE INDEX "_quest_guides_v_created_at_idx" ON "_quest_guides_v" USING btree ("created_at");
  CREATE INDEX "_quest_guides_v_updated_at_idx" ON "_quest_guides_v" USING btree ("updated_at");
  CREATE INDEX "_quest_guides_v_snapshot_idx" ON "_quest_guides_v" USING btree ("snapshot");
  CREATE INDEX "_quest_guides_v_published_locale_idx" ON "_quest_guides_v" USING btree ("published_locale");
  CREATE INDEX "_quest_guides_v_latest_idx" ON "_quest_guides_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_quest_guides_v_locales_locale_parent_id_unique" ON "_quest_guides_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_quest_guides_v_locales_parent_id_idx" ON "_quest_guides_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_quest_guides_v_rels_order_idx" ON "_quest_guides_v_rels" USING btree ("order");
  CREATE INDEX "_quest_guides_v_rels_parent_idx" ON "_quest_guides_v_rels" USING btree ("parent_id");
  CREATE INDEX "_quest_guides_v_rels_path_idx" ON "_quest_guides_v_rels" USING btree ("path");
  CREATE INDEX "_quest_guides_v_rels_quests_id_idx" ON "_quest_guides_v_rels" USING btree ("quests_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_quest_guides_fk" FOREIGN KEY ("quest_guides_id") REFERENCES "public"."quest_guides"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_quest_guides_id_idx" ON "payload_locked_documents_rels" USING btree ("quest_guides_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "quest_guides_blocks_rich_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "quest_guides_blocks_rich_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "quest_guides_blocks_image" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "quest_guides_blocks_image_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "quest_guides_blocks_video" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "quest_guides_blocks_video_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "quest_guides_blocks_callout" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "quest_guides_blocks_callout_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "quest_guides" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "quest_guides_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "quest_guides_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_quest_guides_v_blocks_rich_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_quest_guides_v_blocks_rich_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_quest_guides_v_blocks_image" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_quest_guides_v_blocks_image_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_quest_guides_v_blocks_video" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_quest_guides_v_blocks_video_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_quest_guides_v_blocks_callout" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_quest_guides_v_blocks_callout_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_quest_guides_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_quest_guides_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_quest_guides_v_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "quest_guides_blocks_rich_text" CASCADE;
  DROP TABLE "quest_guides_blocks_rich_text_locales" CASCADE;
  DROP TABLE "quest_guides_blocks_image" CASCADE;
  DROP TABLE "quest_guides_blocks_image_locales" CASCADE;
  DROP TABLE "quest_guides_blocks_video" CASCADE;
  DROP TABLE "quest_guides_blocks_video_locales" CASCADE;
  DROP TABLE "quest_guides_blocks_callout" CASCADE;
  DROP TABLE "quest_guides_blocks_callout_locales" CASCADE;
  DROP TABLE "quest_guides" CASCADE;
  DROP TABLE "quest_guides_locales" CASCADE;
  DROP TABLE "quest_guides_rels" CASCADE;
  DROP TABLE "_quest_guides_v_blocks_rich_text" CASCADE;
  DROP TABLE "_quest_guides_v_blocks_rich_text_locales" CASCADE;
  DROP TABLE "_quest_guides_v_blocks_image" CASCADE;
  DROP TABLE "_quest_guides_v_blocks_image_locales" CASCADE;
  DROP TABLE "_quest_guides_v_blocks_video" CASCADE;
  DROP TABLE "_quest_guides_v_blocks_video_locales" CASCADE;
  DROP TABLE "_quest_guides_v_blocks_callout" CASCADE;
  DROP TABLE "_quest_guides_v_blocks_callout_locales" CASCADE;
  DROP TABLE "_quest_guides_v" CASCADE;
  DROP TABLE "_quest_guides_v_locales" CASCADE;
  DROP TABLE "_quest_guides_v_rels" CASCADE;
  -- DROP TABLE "quest_guides" CASCADE ya borró payload_locked_documents_rels_quest_guides_fk.
  DROP INDEX "payload_locked_documents_rels_quest_guides_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "quest_guides_id";
  DROP TYPE "public"."enum_quest_guides_blocks_callout_variant";
  DROP TYPE "public"."enum_quest_guides_status";
  DROP TYPE "public"."enum__quest_guides_v_blocks_callout_variant";
  DROP TYPE "public"."enum__quest_guides_v_version_status";
  DROP TYPE "public"."enum__quest_guides_v_published_locale";`)
}
