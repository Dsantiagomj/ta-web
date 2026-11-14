import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_checklists_pre_needs_category" AS ENUM('resources', 'consumables', 'equipment', 'souls', 'creatures', 'cosmetics');
  CREATE TYPE "public"."enum__checklists_pre_needs_v_category" AS ENUM('resources', 'consumables', 'equipment', 'souls', 'creatures', 'cosmetics');
  ALTER TYPE "public"."enum_checklists_steps_segments_kind" ADD VALUE 'note';
  ALTER TYPE "public"."enum_checklists_steps_segments_kind" ADD VALUE 'tip';
  ALTER TYPE "public"."enum_checklists_steps_segments_kind" ADD VALUE 'must';
  ALTER TYPE "public"."enum_checklists_steps_segments_kind" ADD VALUE 'includes';
  ALTER TYPE "public"."enum_checklists_step_ach_mode" ADD VALUE 'upto';
  ALTER TYPE "public"."enum__checklists_v_version_steps_segments_kind" ADD VALUE 'note';
  ALTER TYPE "public"."enum__checklists_v_version_steps_segments_kind" ADD VALUE 'tip';
  ALTER TYPE "public"."enum__checklists_v_version_steps_segments_kind" ADD VALUE 'must';
  ALTER TYPE "public"."enum__checklists_v_version_steps_segments_kind" ADD VALUE 'includes';
  ALTER TYPE "public"."enum__checklists_step_ach_v_mode" ADD VALUE 'upto';
  CREATE TABLE "checklists_pre_notes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "checklists_pre_notes_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "checklists_pre_needs_alts" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item_id" integer,
  	"quantity" numeric DEFAULT 1
  );
  
  CREATE TABLE "checklists_pre_needs_alts_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "checklists_pre_needs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item_id" integer,
  	"quantity" numeric DEFAULT 1,
  	"category" "enum_checklists_pre_needs_category",
  	"counts_in_total" boolean DEFAULT true,
  	"reusable" boolean,
  	"prerequisite" varchar
  );
  
  CREATE TABLE "checklists_pre_needs_locales" (
  	"label" varchar,
  	"note" varchar,
  	"group" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "checklists_seg_more" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"quest_id" integer,
  	"stop_objective" numeric,
  	"later" boolean
  );
  
  CREATE TABLE "checklists_seg_more_locales" (
  	"line" varchar,
  	"resume_line" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "checklists_need_alts" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item_id" integer,
  	"quantity" numeric DEFAULT 1
  );
  
  CREATE TABLE "checklists_need_alts_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_checklists_pre_notes_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_checklists_pre_notes_v_locales" (
  	"title" varchar,
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_checklists_pre_needs_alts_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"item_id" integer,
  	"quantity" numeric DEFAULT 1,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_checklists_pre_needs_alts_v_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_checklists_pre_needs_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"item_id" integer,
  	"quantity" numeric DEFAULT 1,
  	"category" "enum__checklists_pre_needs_v_category",
  	"counts_in_total" boolean DEFAULT true,
  	"reusable" boolean,
  	"prerequisite" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_checklists_pre_needs_v_locales" (
  	"label" varchar,
  	"note" varchar,
  	"group" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_checklists_seg_more_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"quest_id" integer,
  	"stop_objective" numeric,
  	"later" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_checklists_seg_more_v_locales" (
  	"line" varchar,
  	"resume_line" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_checklists_need_alts_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"item_id" integer,
  	"quantity" numeric DEFAULT 1,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_checklists_need_alts_v_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "checklists_steps_segments" ADD COLUMN "later" boolean;
  ALTER TABLE "checklists_steps_segments_locales" ADD COLUMN "line" varchar;
  ALTER TABLE "checklists_steps_segments_locales" ADD COLUMN "resume_line" varchar;
  ALTER TABLE "checklists_steps_needs" ADD COLUMN "reusable" boolean;
  ALTER TABLE "checklists_steps_needs_locales" ADD COLUMN "group" varchar;
  ALTER TABLE "_checklists_v_version_steps_segments" ADD COLUMN "later" boolean;
  ALTER TABLE "_checklists_v_version_steps_segments_locales" ADD COLUMN "line" varchar;
  ALTER TABLE "_checklists_v_version_steps_segments_locales" ADD COLUMN "resume_line" varchar;
  ALTER TABLE "_checklists_v_version_steps_needs" ADD COLUMN "reusable" boolean;
  ALTER TABLE "_checklists_v_version_steps_needs_locales" ADD COLUMN "group" varchar;
  ALTER TABLE "checklists_pre_notes" ADD CONSTRAINT "checklists_pre_notes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."checklists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "checklists_pre_notes_locales" ADD CONSTRAINT "checklists_pre_notes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."checklists_pre_notes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "checklists_pre_needs_alts" ADD CONSTRAINT "checklists_pre_needs_alts_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "checklists_pre_needs_alts" ADD CONSTRAINT "checklists_pre_needs_alts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."checklists_pre_needs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "checklists_pre_needs_alts_locales" ADD CONSTRAINT "checklists_pre_needs_alts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."checklists_pre_needs_alts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "checklists_pre_needs" ADD CONSTRAINT "checklists_pre_needs_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "checklists_pre_needs" ADD CONSTRAINT "checklists_pre_needs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."checklists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "checklists_pre_needs_locales" ADD CONSTRAINT "checklists_pre_needs_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."checklists_pre_needs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "checklists_seg_more" ADD CONSTRAINT "checklists_seg_more_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "checklists_seg_more" ADD CONSTRAINT "checklists_seg_more_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."checklists_steps_segments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "checklists_seg_more_locales" ADD CONSTRAINT "checklists_seg_more_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."checklists_seg_more"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "checklists_need_alts" ADD CONSTRAINT "checklists_need_alts_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "checklists_need_alts" ADD CONSTRAINT "checklists_need_alts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."checklists_steps_needs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "checklists_need_alts_locales" ADD CONSTRAINT "checklists_need_alts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."checklists_need_alts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_checklists_pre_notes_v" ADD CONSTRAINT "_checklists_pre_notes_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_checklists_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_checklists_pre_notes_v_locales" ADD CONSTRAINT "_checklists_pre_notes_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_checklists_pre_notes_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_checklists_pre_needs_alts_v" ADD CONSTRAINT "_checklists_pre_needs_alts_v_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_checklists_pre_needs_alts_v" ADD CONSTRAINT "_checklists_pre_needs_alts_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_checklists_pre_needs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_checklists_pre_needs_alts_v_locales" ADD CONSTRAINT "_checklists_pre_needs_alts_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_checklists_pre_needs_alts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_checklists_pre_needs_v" ADD CONSTRAINT "_checklists_pre_needs_v_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_checklists_pre_needs_v" ADD CONSTRAINT "_checklists_pre_needs_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_checklists_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_checklists_pre_needs_v_locales" ADD CONSTRAINT "_checklists_pre_needs_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_checklists_pre_needs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_checklists_seg_more_v" ADD CONSTRAINT "_checklists_seg_more_v_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_checklists_seg_more_v" ADD CONSTRAINT "_checklists_seg_more_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_checklists_v_version_steps_segments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_checklists_seg_more_v_locales" ADD CONSTRAINT "_checklists_seg_more_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_checklists_seg_more_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_checklists_need_alts_v" ADD CONSTRAINT "_checklists_need_alts_v_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_checklists_need_alts_v" ADD CONSTRAINT "_checklists_need_alts_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_checklists_v_version_steps_needs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_checklists_need_alts_v_locales" ADD CONSTRAINT "_checklists_need_alts_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_checklists_need_alts_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "checklists_pre_notes_order_idx" ON "checklists_pre_notes" USING btree ("_order");
  CREATE INDEX "checklists_pre_notes_parent_id_idx" ON "checklists_pre_notes" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "checklists_pre_notes_locales_locale_parent_id_unique" ON "checklists_pre_notes_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "checklists_pre_notes_locales_parent_id_idx" ON "checklists_pre_notes_locales" USING btree ("_parent_id");
  CREATE INDEX "checklists_pre_needs_alts_order_idx" ON "checklists_pre_needs_alts" USING btree ("_order");
  CREATE INDEX "checklists_pre_needs_alts_parent_id_idx" ON "checklists_pre_needs_alts" USING btree ("_parent_id");
  CREATE INDEX "checklists_pre_needs_alts_item_idx" ON "checklists_pre_needs_alts" USING btree ("item_id");
  CREATE UNIQUE INDEX "checklists_pre_needs_alts_locales_locale_parent_id_unique" ON "checklists_pre_needs_alts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "checklists_pre_needs_alts_locales_parent_id_idx" ON "checklists_pre_needs_alts_locales" USING btree ("_parent_id");
  CREATE INDEX "checklists_pre_needs_order_idx" ON "checklists_pre_needs" USING btree ("_order");
  CREATE INDEX "checklists_pre_needs_parent_id_idx" ON "checklists_pre_needs" USING btree ("_parent_id");
  CREATE INDEX "checklists_pre_needs_item_idx" ON "checklists_pre_needs" USING btree ("item_id");
  CREATE UNIQUE INDEX "checklists_pre_needs_locales_locale_parent_id_unique" ON "checklists_pre_needs_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "checklists_pre_needs_locales_parent_id_idx" ON "checklists_pre_needs_locales" USING btree ("_parent_id");
  CREATE INDEX "checklists_seg_more_order_idx" ON "checklists_seg_more" USING btree ("_order");
  CREATE INDEX "checklists_seg_more_parent_id_idx" ON "checklists_seg_more" USING btree ("_parent_id");
  CREATE INDEX "checklists_seg_more_quest_idx" ON "checklists_seg_more" USING btree ("quest_id");
  CREATE UNIQUE INDEX "checklists_seg_more_locales_locale_parent_id_unique" ON "checklists_seg_more_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "checklists_seg_more_locales_parent_id_idx" ON "checklists_seg_more_locales" USING btree ("_parent_id");
  CREATE INDEX "checklists_need_alts_order_idx" ON "checklists_need_alts" USING btree ("_order");
  CREATE INDEX "checklists_need_alts_parent_id_idx" ON "checklists_need_alts" USING btree ("_parent_id");
  CREATE INDEX "checklists_need_alts_item_idx" ON "checklists_need_alts" USING btree ("item_id");
  CREATE UNIQUE INDEX "checklists_need_alts_locales_locale_parent_id_unique" ON "checklists_need_alts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "checklists_need_alts_locales_parent_id_idx" ON "checklists_need_alts_locales" USING btree ("_parent_id");
  CREATE INDEX "_checklists_pre_notes_v_order_idx" ON "_checklists_pre_notes_v" USING btree ("_order");
  CREATE INDEX "_checklists_pre_notes_v_parent_id_idx" ON "_checklists_pre_notes_v" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_checklists_pre_notes_v_locales_locale_parent_id_unique" ON "_checklists_pre_notes_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_checklists_pre_notes_v_locales_parent_id_idx" ON "_checklists_pre_notes_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_checklists_pre_needs_alts_v_order_idx" ON "_checklists_pre_needs_alts_v" USING btree ("_order");
  CREATE INDEX "_checklists_pre_needs_alts_v_parent_id_idx" ON "_checklists_pre_needs_alts_v" USING btree ("_parent_id");
  CREATE INDEX "_checklists_pre_needs_alts_v_item_idx" ON "_checklists_pre_needs_alts_v" USING btree ("item_id");
  CREATE UNIQUE INDEX "_checklists_pre_needs_alts_v_locales_locale_parent_id_unique" ON "_checklists_pre_needs_alts_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_checklists_pre_needs_alts_v_locales_parent_id_idx" ON "_checklists_pre_needs_alts_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_checklists_pre_needs_v_order_idx" ON "_checklists_pre_needs_v" USING btree ("_order");
  CREATE INDEX "_checklists_pre_needs_v_parent_id_idx" ON "_checklists_pre_needs_v" USING btree ("_parent_id");
  CREATE INDEX "_checklists_pre_needs_v_item_idx" ON "_checklists_pre_needs_v" USING btree ("item_id");
  CREATE UNIQUE INDEX "_checklists_pre_needs_v_locales_locale_parent_id_unique" ON "_checklists_pre_needs_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_checklists_pre_needs_v_locales_parent_id_idx" ON "_checklists_pre_needs_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_checklists_seg_more_v_order_idx" ON "_checklists_seg_more_v" USING btree ("_order");
  CREATE INDEX "_checklists_seg_more_v_parent_id_idx" ON "_checklists_seg_more_v" USING btree ("_parent_id");
  CREATE INDEX "_checklists_seg_more_v_quest_idx" ON "_checklists_seg_more_v" USING btree ("quest_id");
  CREATE UNIQUE INDEX "_checklists_seg_more_v_locales_locale_parent_id_unique" ON "_checklists_seg_more_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_checklists_seg_more_v_locales_parent_id_idx" ON "_checklists_seg_more_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_checklists_need_alts_v_order_idx" ON "_checklists_need_alts_v" USING btree ("_order");
  CREATE INDEX "_checklists_need_alts_v_parent_id_idx" ON "_checklists_need_alts_v" USING btree ("_parent_id");
  CREATE INDEX "_checklists_need_alts_v_item_idx" ON "_checklists_need_alts_v" USING btree ("item_id");
  CREATE UNIQUE INDEX "_checklists_need_alts_v_locales_locale_parent_id_unique" ON "_checklists_need_alts_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_checklists_need_alts_v_locales_parent_id_idx" ON "_checklists_need_alts_v_locales" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   -- Las filas con los valores nuevos de los enums vuelven a los de antes, sin perder su texto:
   -- los avisos pasan a tramos normales y «Hasta una misión», a «Solo algunas misiones».
   UPDATE "checklists_steps_segments" SET "kind" = 'plain' WHERE "kind" IN ('note', 'tip', 'must', 'includes');
  UPDATE "_checklists_v_version_steps_segments" SET "kind" = 'plain' WHERE "kind" IN ('note', 'tip', 'must', 'includes');
  UPDATE "checklists_step_ach" SET "mode" = 'some' WHERE "mode" = 'upto';
  UPDATE "_checklists_step_ach_v" SET "mode" = 'some' WHERE "mode" = 'upto';

   DROP TABLE "checklists_pre_notes" CASCADE;
  DROP TABLE "checklists_pre_notes_locales" CASCADE;
  DROP TABLE "checklists_pre_needs_alts" CASCADE;
  DROP TABLE "checklists_pre_needs_alts_locales" CASCADE;
  DROP TABLE "checklists_pre_needs" CASCADE;
  DROP TABLE "checklists_pre_needs_locales" CASCADE;
  DROP TABLE "checklists_seg_more" CASCADE;
  DROP TABLE "checklists_seg_more_locales" CASCADE;
  DROP TABLE "checklists_need_alts" CASCADE;
  DROP TABLE "checklists_need_alts_locales" CASCADE;
  DROP TABLE "_checklists_pre_notes_v" CASCADE;
  DROP TABLE "_checklists_pre_notes_v_locales" CASCADE;
  DROP TABLE "_checklists_pre_needs_alts_v" CASCADE;
  DROP TABLE "_checklists_pre_needs_alts_v_locales" CASCADE;
  DROP TABLE "_checklists_pre_needs_v" CASCADE;
  DROP TABLE "_checklists_pre_needs_v_locales" CASCADE;
  DROP TABLE "_checklists_seg_more_v" CASCADE;
  DROP TABLE "_checklists_seg_more_v_locales" CASCADE;
  DROP TABLE "_checklists_need_alts_v" CASCADE;
  DROP TABLE "_checklists_need_alts_v_locales" CASCADE;
  ALTER TABLE "checklists_steps_segments" ALTER COLUMN "kind" SET DATA TYPE text;
  ALTER TABLE "checklists_steps_segments" ALTER COLUMN "kind" SET DEFAULT 'plain'::text;
  DROP TYPE "public"."enum_checklists_steps_segments_kind";
  CREATE TYPE "public"."enum_checklists_steps_segments_kind" AS ENUM('plain', 'stop', 'resolve');
  ALTER TABLE "checklists_steps_segments" ALTER COLUMN "kind" SET DEFAULT 'plain'::"public"."enum_checklists_steps_segments_kind";
  ALTER TABLE "checklists_steps_segments" ALTER COLUMN "kind" SET DATA TYPE "public"."enum_checklists_steps_segments_kind" USING "kind"::"public"."enum_checklists_steps_segments_kind";
  ALTER TABLE "checklists_step_ach" ALTER COLUMN "mode" SET DATA TYPE text;
  ALTER TABLE "checklists_step_ach" ALTER COLUMN "mode" SET DEFAULT 'all'::text;
  DROP TYPE "public"."enum_checklists_step_ach_mode";
  CREATE TYPE "public"."enum_checklists_step_ach_mode" AS ENUM('all', 'some');
  ALTER TABLE "checklists_step_ach" ALTER COLUMN "mode" SET DEFAULT 'all'::"public"."enum_checklists_step_ach_mode";
  ALTER TABLE "checklists_step_ach" ALTER COLUMN "mode" SET DATA TYPE "public"."enum_checklists_step_ach_mode" USING "mode"::"public"."enum_checklists_step_ach_mode";
  ALTER TABLE "_checklists_v_version_steps_segments" ALTER COLUMN "kind" SET DATA TYPE text;
  ALTER TABLE "_checklists_v_version_steps_segments" ALTER COLUMN "kind" SET DEFAULT 'plain'::text;
  DROP TYPE "public"."enum__checklists_v_version_steps_segments_kind";
  CREATE TYPE "public"."enum__checklists_v_version_steps_segments_kind" AS ENUM('plain', 'stop', 'resolve');
  ALTER TABLE "_checklists_v_version_steps_segments" ALTER COLUMN "kind" SET DEFAULT 'plain'::"public"."enum__checklists_v_version_steps_segments_kind";
  ALTER TABLE "_checklists_v_version_steps_segments" ALTER COLUMN "kind" SET DATA TYPE "public"."enum__checklists_v_version_steps_segments_kind" USING "kind"::"public"."enum__checklists_v_version_steps_segments_kind";
  ALTER TABLE "_checklists_step_ach_v" ALTER COLUMN "mode" SET DATA TYPE text;
  ALTER TABLE "_checklists_step_ach_v" ALTER COLUMN "mode" SET DEFAULT 'all'::text;
  DROP TYPE "public"."enum__checklists_step_ach_v_mode";
  CREATE TYPE "public"."enum__checklists_step_ach_v_mode" AS ENUM('all', 'some');
  ALTER TABLE "_checklists_step_ach_v" ALTER COLUMN "mode" SET DEFAULT 'all'::"public"."enum__checklists_step_ach_v_mode";
  ALTER TABLE "_checklists_step_ach_v" ALTER COLUMN "mode" SET DATA TYPE "public"."enum__checklists_step_ach_v_mode" USING "mode"::"public"."enum__checklists_step_ach_v_mode";
  ALTER TABLE "checklists_steps_segments" DROP COLUMN "later";
  ALTER TABLE "checklists_steps_segments_locales" DROP COLUMN "line";
  ALTER TABLE "checklists_steps_segments_locales" DROP COLUMN "resume_line";
  ALTER TABLE "checklists_steps_needs" DROP COLUMN "reusable";
  ALTER TABLE "checklists_steps_needs_locales" DROP COLUMN "group";
  ALTER TABLE "_checklists_v_version_steps_segments" DROP COLUMN "later";
  ALTER TABLE "_checklists_v_version_steps_segments_locales" DROP COLUMN "line";
  ALTER TABLE "_checklists_v_version_steps_segments_locales" DROP COLUMN "resume_line";
  ALTER TABLE "_checklists_v_version_steps_needs" DROP COLUMN "reusable";
  ALTER TABLE "_checklists_v_version_steps_needs_locales" DROP COLUMN "group";
  DROP TYPE "public"."enum_checklists_pre_needs_category";
  DROP TYPE "public"."enum__checklists_pre_needs_v_category";`)
}
