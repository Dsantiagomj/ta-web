import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_quest_guides_blocks_table_columns_align" AS ENUM('start', 'center', 'end');
  CREATE TYPE "public"."enum__quest_guides_v_blocks_table_columns_align" AS ENUM('start', 'center', 'end');
  CREATE TYPE "public"."enum_dofus_guides_blocks_table_columns_align" AS ENUM('start', 'center', 'end');
  CREATE TYPE "public"."enum__dofus_guides_v_blocks_table_columns_align" AS ENUM('start', 'center', 'end');
  CREATE TYPE "public"."enum_pages_blocks_table_columns_align" AS ENUM('start', 'center', 'end');
  CREATE TYPE "public"."enum__pages_v_blocks_table_columns_align" AS ENUM('start', 'center', 'end');
  CREATE TYPE "public"."enum_class_pages_blocks_table_columns_align" AS ENUM('start', 'center', 'end');
  CREATE TYPE "public"."enum__class_pages_v_blocks_table_columns_align" AS ENUM('start', 'center', 'end');
  CREATE TYPE "public"."enum_dungeon_pages_blocks_table_columns_align" AS ENUM('start', 'center', 'end');
  CREATE TYPE "public"."enum__dungeon_pages_v_blocks_table_columns_align" AS ENUM('start', 'center', 'end');
  CREATE TABLE "quest_guides_blocks_table_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"align" "enum_quest_guides_blocks_table_columns_align" DEFAULT 'start'
  );
  
  CREATE TABLE "quest_guides_blocks_table_columns_locales" (
  	"header" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "quest_guides_blocks_table_rows_cells" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "quest_guides_blocks_table_rows_cells_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "quest_guides_blocks_table_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "quest_guides_blocks_table" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"row_headers" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "quest_guides_blocks_table_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_quest_guides_v_blocks_table_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"align" "enum__quest_guides_v_blocks_table_columns_align" DEFAULT 'start',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_quest_guides_v_blocks_table_columns_locales" (
  	"header" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_quest_guides_v_blocks_table_rows_cells" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_quest_guides_v_blocks_table_rows_cells_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_quest_guides_v_blocks_table_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_quest_guides_v_blocks_table" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"row_headers" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_quest_guides_v_blocks_table_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "dofus_guides_blocks_table_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"align" "enum_dofus_guides_blocks_table_columns_align" DEFAULT 'start'
  );
  
  CREATE TABLE "dofus_guides_blocks_table_columns_locales" (
  	"header" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "dofus_guides_blocks_table_rows_cells" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "dofus_guides_blocks_table_rows_cells_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "dofus_guides_blocks_table_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "dofus_guides_blocks_table" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"row_headers" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "dofus_guides_blocks_table_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_table_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"align" "enum__dofus_guides_v_blocks_table_columns_align" DEFAULT 'start',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_table_columns_locales" (
  	"header" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_table_rows_cells" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_table_rows_cells_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_table_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_table" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"row_headers" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_dofus_guides_v_blocks_table_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "pages_blocks_table_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"align" "enum_pages_blocks_table_columns_align" DEFAULT 'start'
  );
  
  CREATE TABLE "pages_blocks_table_columns_locales" (
  	"header" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_table_rows_cells" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_blocks_table_rows_cells_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_table_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_blocks_table" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"row_headers" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_table_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_table_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"align" "enum__pages_v_blocks_table_columns_align" DEFAULT 'start',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_table_columns_locales" (
  	"header" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_table_rows_cells" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_table_rows_cells_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_table_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_table" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"row_headers" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_table_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "class_pages_blocks_table_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"align" "enum_class_pages_blocks_table_columns_align" DEFAULT 'start'
  );
  
  CREATE TABLE "class_pages_blocks_table_columns_locales" (
  	"header" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "class_pages_blocks_table_rows_cells" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "class_pages_blocks_table_rows_cells_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "class_pages_blocks_table_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "class_pages_blocks_table" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"row_headers" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "class_pages_blocks_table_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_class_pages_v_blocks_table_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"align" "enum__class_pages_v_blocks_table_columns_align" DEFAULT 'start',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_class_pages_v_blocks_table_columns_locales" (
  	"header" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_class_pages_v_blocks_table_rows_cells" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_class_pages_v_blocks_table_rows_cells_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_class_pages_v_blocks_table_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_class_pages_v_blocks_table" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"row_headers" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_class_pages_v_blocks_table_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "dungeon_pages_blocks_table_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"align" "enum_dungeon_pages_blocks_table_columns_align" DEFAULT 'start'
  );
  
  CREATE TABLE "dungeon_pages_blocks_table_columns_locales" (
  	"header" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "dungeon_pages_blocks_table_rows_cells" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "dungeon_pages_blocks_table_rows_cells_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "dungeon_pages_blocks_table_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "dungeon_pages_blocks_table" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"row_headers" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "dungeon_pages_blocks_table_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_dungeon_pages_v_blocks_table_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"align" "enum__dungeon_pages_v_blocks_table_columns_align" DEFAULT 'start',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_dungeon_pages_v_blocks_table_columns_locales" (
  	"header" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_dungeon_pages_v_blocks_table_rows_cells" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_dungeon_pages_v_blocks_table_rows_cells_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_dungeon_pages_v_blocks_table_rows" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_dungeon_pages_v_blocks_table" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"row_headers" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_dungeon_pages_v_blocks_table_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "quest_guides_blocks_table_columns" ADD CONSTRAINT "quest_guides_blocks_table_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quest_guides_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quest_guides_blocks_table_columns_locales" ADD CONSTRAINT "quest_guides_blocks_table_columns_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quest_guides_blocks_table_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quest_guides_blocks_table_rows_cells" ADD CONSTRAINT "quest_guides_blocks_table_rows_cells_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quest_guides_blocks_table_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quest_guides_blocks_table_rows_cells_locales" ADD CONSTRAINT "quest_guides_blocks_table_rows_cells_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quest_guides_blocks_table_rows_cells"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quest_guides_blocks_table_rows" ADD CONSTRAINT "quest_guides_blocks_table_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quest_guides_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quest_guides_blocks_table" ADD CONSTRAINT "quest_guides_blocks_table_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quest_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quest_guides_blocks_table_locales" ADD CONSTRAINT "quest_guides_blocks_table_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quest_guides_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_quest_guides_v_blocks_table_columns" ADD CONSTRAINT "_quest_guides_v_blocks_table_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_quest_guides_v_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_quest_guides_v_blocks_table_columns_locales" ADD CONSTRAINT "_quest_guides_v_blocks_table_columns_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_quest_guides_v_blocks_table_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_quest_guides_v_blocks_table_rows_cells" ADD CONSTRAINT "_quest_guides_v_blocks_table_rows_cells_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_quest_guides_v_blocks_table_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_quest_guides_v_blocks_table_rows_cells_locales" ADD CONSTRAINT "_quest_guides_v_blocks_table_rows_cells_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_quest_guides_v_blocks_table_rows_cells"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_quest_guides_v_blocks_table_rows" ADD CONSTRAINT "_quest_guides_v_blocks_table_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_quest_guides_v_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_quest_guides_v_blocks_table" ADD CONSTRAINT "_quest_guides_v_blocks_table_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_quest_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_quest_guides_v_blocks_table_locales" ADD CONSTRAINT "_quest_guides_v_blocks_table_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_quest_guides_v_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_table_columns" ADD CONSTRAINT "dofus_guides_blocks_table_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_table_columns_locales" ADD CONSTRAINT "dofus_guides_blocks_table_columns_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides_blocks_table_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_table_rows_cells" ADD CONSTRAINT "dofus_guides_blocks_table_rows_cells_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides_blocks_table_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_table_rows_cells_locales" ADD CONSTRAINT "dofus_guides_blocks_table_rows_cells_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides_blocks_table_rows_cells"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_table_rows" ADD CONSTRAINT "dofus_guides_blocks_table_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_table" ADD CONSTRAINT "dofus_guides_blocks_table_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_blocks_table_locales" ADD CONSTRAINT "dofus_guides_blocks_table_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_table_columns" ADD CONSTRAINT "_dofus_guides_v_blocks_table_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_table_columns_locales" ADD CONSTRAINT "_dofus_guides_v_blocks_table_columns_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v_blocks_table_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_table_rows_cells" ADD CONSTRAINT "_dofus_guides_v_blocks_table_rows_cells_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v_blocks_table_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_table_rows_cells_locales" ADD CONSTRAINT "_dofus_guides_v_blocks_table_rows_cells_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v_blocks_table_rows_cells"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_table_rows" ADD CONSTRAINT "_dofus_guides_v_blocks_table_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_table" ADD CONSTRAINT "_dofus_guides_v_blocks_table_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_blocks_table_locales" ADD CONSTRAINT "_dofus_guides_v_blocks_table_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_table_columns" ADD CONSTRAINT "pages_blocks_table_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_table_columns_locales" ADD CONSTRAINT "pages_blocks_table_columns_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_table_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_table_rows_cells" ADD CONSTRAINT "pages_blocks_table_rows_cells_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_table_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_table_rows_cells_locales" ADD CONSTRAINT "pages_blocks_table_rows_cells_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_table_rows_cells"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_table_rows" ADD CONSTRAINT "pages_blocks_table_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_table" ADD CONSTRAINT "pages_blocks_table_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_table_locales" ADD CONSTRAINT "pages_blocks_table_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_table_columns" ADD CONSTRAINT "_pages_v_blocks_table_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_table_columns_locales" ADD CONSTRAINT "_pages_v_blocks_table_columns_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_table_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_table_rows_cells" ADD CONSTRAINT "_pages_v_blocks_table_rows_cells_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_table_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_table_rows_cells_locales" ADD CONSTRAINT "_pages_v_blocks_table_rows_cells_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_table_rows_cells"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_table_rows" ADD CONSTRAINT "_pages_v_blocks_table_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_table" ADD CONSTRAINT "_pages_v_blocks_table_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_table_locales" ADD CONSTRAINT "_pages_v_blocks_table_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "class_pages_blocks_table_columns" ADD CONSTRAINT "class_pages_blocks_table_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."class_pages_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "class_pages_blocks_table_columns_locales" ADD CONSTRAINT "class_pages_blocks_table_columns_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."class_pages_blocks_table_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "class_pages_blocks_table_rows_cells" ADD CONSTRAINT "class_pages_blocks_table_rows_cells_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."class_pages_blocks_table_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "class_pages_blocks_table_rows_cells_locales" ADD CONSTRAINT "class_pages_blocks_table_rows_cells_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."class_pages_blocks_table_rows_cells"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "class_pages_blocks_table_rows" ADD CONSTRAINT "class_pages_blocks_table_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."class_pages_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "class_pages_blocks_table" ADD CONSTRAINT "class_pages_blocks_table_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."class_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "class_pages_blocks_table_locales" ADD CONSTRAINT "class_pages_blocks_table_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."class_pages_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_class_pages_v_blocks_table_columns" ADD CONSTRAINT "_class_pages_v_blocks_table_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_class_pages_v_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_class_pages_v_blocks_table_columns_locales" ADD CONSTRAINT "_class_pages_v_blocks_table_columns_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_class_pages_v_blocks_table_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_class_pages_v_blocks_table_rows_cells" ADD CONSTRAINT "_class_pages_v_blocks_table_rows_cells_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_class_pages_v_blocks_table_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_class_pages_v_blocks_table_rows_cells_locales" ADD CONSTRAINT "_class_pages_v_blocks_table_rows_cells_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_class_pages_v_blocks_table_rows_cells"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_class_pages_v_blocks_table_rows" ADD CONSTRAINT "_class_pages_v_blocks_table_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_class_pages_v_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_class_pages_v_blocks_table" ADD CONSTRAINT "_class_pages_v_blocks_table_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_class_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_class_pages_v_blocks_table_locales" ADD CONSTRAINT "_class_pages_v_blocks_table_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_class_pages_v_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dungeon_pages_blocks_table_columns" ADD CONSTRAINT "dungeon_pages_blocks_table_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dungeon_pages_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dungeon_pages_blocks_table_columns_locales" ADD CONSTRAINT "dungeon_pages_blocks_table_columns_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dungeon_pages_blocks_table_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dungeon_pages_blocks_table_rows_cells" ADD CONSTRAINT "dungeon_pages_blocks_table_rows_cells_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dungeon_pages_blocks_table_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dungeon_pages_blocks_table_rows_cells_locales" ADD CONSTRAINT "dungeon_pages_blocks_table_rows_cells_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dungeon_pages_blocks_table_rows_cells"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dungeon_pages_blocks_table_rows" ADD CONSTRAINT "dungeon_pages_blocks_table_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dungeon_pages_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dungeon_pages_blocks_table" ADD CONSTRAINT "dungeon_pages_blocks_table_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dungeon_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dungeon_pages_blocks_table_locales" ADD CONSTRAINT "dungeon_pages_blocks_table_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dungeon_pages_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dungeon_pages_v_blocks_table_columns" ADD CONSTRAINT "_dungeon_pages_v_blocks_table_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dungeon_pages_v_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dungeon_pages_v_blocks_table_columns_locales" ADD CONSTRAINT "_dungeon_pages_v_blocks_table_columns_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dungeon_pages_v_blocks_table_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dungeon_pages_v_blocks_table_rows_cells" ADD CONSTRAINT "_dungeon_pages_v_blocks_table_rows_cells_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dungeon_pages_v_blocks_table_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dungeon_pages_v_blocks_table_rows_cells_locales" ADD CONSTRAINT "_dungeon_pages_v_blocks_table_rows_cells_locales_parent_i_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dungeon_pages_v_blocks_table_rows_cells"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dungeon_pages_v_blocks_table_rows" ADD CONSTRAINT "_dungeon_pages_v_blocks_table_rows_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dungeon_pages_v_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dungeon_pages_v_blocks_table" ADD CONSTRAINT "_dungeon_pages_v_blocks_table_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dungeon_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dungeon_pages_v_blocks_table_locales" ADD CONSTRAINT "_dungeon_pages_v_blocks_table_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dungeon_pages_v_blocks_table"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "quest_guides_blocks_table_columns_order_idx" ON "quest_guides_blocks_table_columns" USING btree ("_order");
  CREATE INDEX "quest_guides_blocks_table_columns_parent_id_idx" ON "quest_guides_blocks_table_columns" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "quest_guides_blocks_table_columns_locales_locale_parent_id_u" ON "quest_guides_blocks_table_columns_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "quest_guides_blocks_table_columns_locales_parent_id_idx" ON "quest_guides_blocks_table_columns_locales" USING btree ("_parent_id");
  CREATE INDEX "quest_guides_blocks_table_rows_cells_order_idx" ON "quest_guides_blocks_table_rows_cells" USING btree ("_order");
  CREATE INDEX "quest_guides_blocks_table_rows_cells_parent_id_idx" ON "quest_guides_blocks_table_rows_cells" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "quest_guides_blocks_table_rows_cells_locales_locale_parent_i" ON "quest_guides_blocks_table_rows_cells_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "quest_guides_blocks_table_rows_cells_locales_parent_id_idx" ON "quest_guides_blocks_table_rows_cells_locales" USING btree ("_parent_id");
  CREATE INDEX "quest_guides_blocks_table_rows_order_idx" ON "quest_guides_blocks_table_rows" USING btree ("_order");
  CREATE INDEX "quest_guides_blocks_table_rows_parent_id_idx" ON "quest_guides_blocks_table_rows" USING btree ("_parent_id");
  CREATE INDEX "quest_guides_blocks_table_order_idx" ON "quest_guides_blocks_table" USING btree ("_order");
  CREATE INDEX "quest_guides_blocks_table_parent_id_idx" ON "quest_guides_blocks_table" USING btree ("_parent_id");
  CREATE INDEX "quest_guides_blocks_table_path_idx" ON "quest_guides_blocks_table" USING btree ("_path");
  CREATE UNIQUE INDEX "quest_guides_blocks_table_locales_locale_parent_id_unique" ON "quest_guides_blocks_table_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "quest_guides_blocks_table_locales_parent_id_idx" ON "quest_guides_blocks_table_locales" USING btree ("_parent_id");
  CREATE INDEX "_quest_guides_v_blocks_table_columns_order_idx" ON "_quest_guides_v_blocks_table_columns" USING btree ("_order");
  CREATE INDEX "_quest_guides_v_blocks_table_columns_parent_id_idx" ON "_quest_guides_v_blocks_table_columns" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_quest_guides_v_blocks_table_columns_locales_locale_parent_i" ON "_quest_guides_v_blocks_table_columns_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_quest_guides_v_blocks_table_columns_locales_parent_id_idx" ON "_quest_guides_v_blocks_table_columns_locales" USING btree ("_parent_id");
  CREATE INDEX "_quest_guides_v_blocks_table_rows_cells_order_idx" ON "_quest_guides_v_blocks_table_rows_cells" USING btree ("_order");
  CREATE INDEX "_quest_guides_v_blocks_table_rows_cells_parent_id_idx" ON "_quest_guides_v_blocks_table_rows_cells" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_quest_guides_v_blocks_table_rows_cells_locales_locale_paren" ON "_quest_guides_v_blocks_table_rows_cells_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_quest_guides_v_blocks_table_rows_cells_locales_parent_i_idx" ON "_quest_guides_v_blocks_table_rows_cells_locales" USING btree ("_parent_id");
  CREATE INDEX "_quest_guides_v_blocks_table_rows_order_idx" ON "_quest_guides_v_blocks_table_rows" USING btree ("_order");
  CREATE INDEX "_quest_guides_v_blocks_table_rows_parent_id_idx" ON "_quest_guides_v_blocks_table_rows" USING btree ("_parent_id");
  CREATE INDEX "_quest_guides_v_blocks_table_order_idx" ON "_quest_guides_v_blocks_table" USING btree ("_order");
  CREATE INDEX "_quest_guides_v_blocks_table_parent_id_idx" ON "_quest_guides_v_blocks_table" USING btree ("_parent_id");
  CREATE INDEX "_quest_guides_v_blocks_table_path_idx" ON "_quest_guides_v_blocks_table" USING btree ("_path");
  CREATE UNIQUE INDEX "_quest_guides_v_blocks_table_locales_locale_parent_id_unique" ON "_quest_guides_v_blocks_table_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_quest_guides_v_blocks_table_locales_parent_id_idx" ON "_quest_guides_v_blocks_table_locales" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_blocks_table_columns_order_idx" ON "dofus_guides_blocks_table_columns" USING btree ("_order");
  CREATE INDEX "dofus_guides_blocks_table_columns_parent_id_idx" ON "dofus_guides_blocks_table_columns" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "dofus_guides_blocks_table_columns_locales_locale_parent_id_u" ON "dofus_guides_blocks_table_columns_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "dofus_guides_blocks_table_columns_locales_parent_id_idx" ON "dofus_guides_blocks_table_columns_locales" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_blocks_table_rows_cells_order_idx" ON "dofus_guides_blocks_table_rows_cells" USING btree ("_order");
  CREATE INDEX "dofus_guides_blocks_table_rows_cells_parent_id_idx" ON "dofus_guides_blocks_table_rows_cells" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "dofus_guides_blocks_table_rows_cells_locales_locale_parent_i" ON "dofus_guides_blocks_table_rows_cells_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "dofus_guides_blocks_table_rows_cells_locales_parent_id_idx" ON "dofus_guides_blocks_table_rows_cells_locales" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_blocks_table_rows_order_idx" ON "dofus_guides_blocks_table_rows" USING btree ("_order");
  CREATE INDEX "dofus_guides_blocks_table_rows_parent_id_idx" ON "dofus_guides_blocks_table_rows" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_blocks_table_order_idx" ON "dofus_guides_blocks_table" USING btree ("_order");
  CREATE INDEX "dofus_guides_blocks_table_parent_id_idx" ON "dofus_guides_blocks_table" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_blocks_table_path_idx" ON "dofus_guides_blocks_table" USING btree ("_path");
  CREATE UNIQUE INDEX "dofus_guides_blocks_table_locales_locale_parent_id_unique" ON "dofus_guides_blocks_table_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "dofus_guides_blocks_table_locales_parent_id_idx" ON "dofus_guides_blocks_table_locales" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_table_columns_order_idx" ON "_dofus_guides_v_blocks_table_columns" USING btree ("_order");
  CREATE INDEX "_dofus_guides_v_blocks_table_columns_parent_id_idx" ON "_dofus_guides_v_blocks_table_columns" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_dofus_guides_v_blocks_table_columns_locales_locale_parent_i" ON "_dofus_guides_v_blocks_table_columns_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_table_columns_locales_parent_id_idx" ON "_dofus_guides_v_blocks_table_columns_locales" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_table_rows_cells_order_idx" ON "_dofus_guides_v_blocks_table_rows_cells" USING btree ("_order");
  CREATE INDEX "_dofus_guides_v_blocks_table_rows_cells_parent_id_idx" ON "_dofus_guides_v_blocks_table_rows_cells" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_dofus_guides_v_blocks_table_rows_cells_locales_locale_paren" ON "_dofus_guides_v_blocks_table_rows_cells_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_table_rows_cells_locales_parent_i_idx" ON "_dofus_guides_v_blocks_table_rows_cells_locales" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_table_rows_order_idx" ON "_dofus_guides_v_blocks_table_rows" USING btree ("_order");
  CREATE INDEX "_dofus_guides_v_blocks_table_rows_parent_id_idx" ON "_dofus_guides_v_blocks_table_rows" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_table_order_idx" ON "_dofus_guides_v_blocks_table" USING btree ("_order");
  CREATE INDEX "_dofus_guides_v_blocks_table_parent_id_idx" ON "_dofus_guides_v_blocks_table" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_table_path_idx" ON "_dofus_guides_v_blocks_table" USING btree ("_path");
  CREATE UNIQUE INDEX "_dofus_guides_v_blocks_table_locales_locale_parent_id_unique" ON "_dofus_guides_v_blocks_table_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_dofus_guides_v_blocks_table_locales_parent_id_idx" ON "_dofus_guides_v_blocks_table_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_table_columns_order_idx" ON "pages_blocks_table_columns" USING btree ("_order");
  CREATE INDEX "pages_blocks_table_columns_parent_id_idx" ON "pages_blocks_table_columns" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_table_columns_locales_locale_parent_id_unique" ON "pages_blocks_table_columns_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_table_columns_locales_parent_id_idx" ON "pages_blocks_table_columns_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_table_rows_cells_order_idx" ON "pages_blocks_table_rows_cells" USING btree ("_order");
  CREATE INDEX "pages_blocks_table_rows_cells_parent_id_idx" ON "pages_blocks_table_rows_cells" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_table_rows_cells_locales_locale_parent_id_uniqu" ON "pages_blocks_table_rows_cells_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_table_rows_cells_locales_parent_id_idx" ON "pages_blocks_table_rows_cells_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_table_rows_order_idx" ON "pages_blocks_table_rows" USING btree ("_order");
  CREATE INDEX "pages_blocks_table_rows_parent_id_idx" ON "pages_blocks_table_rows" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_table_order_idx" ON "pages_blocks_table" USING btree ("_order");
  CREATE INDEX "pages_blocks_table_parent_id_idx" ON "pages_blocks_table" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_table_path_idx" ON "pages_blocks_table" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_table_locales_locale_parent_id_unique" ON "pages_blocks_table_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_table_locales_parent_id_idx" ON "pages_blocks_table_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_table_columns_order_idx" ON "_pages_v_blocks_table_columns" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_table_columns_parent_id_idx" ON "_pages_v_blocks_table_columns" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_table_columns_locales_locale_parent_id_uniqu" ON "_pages_v_blocks_table_columns_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_table_columns_locales_parent_id_idx" ON "_pages_v_blocks_table_columns_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_table_rows_cells_order_idx" ON "_pages_v_blocks_table_rows_cells" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_table_rows_cells_parent_id_idx" ON "_pages_v_blocks_table_rows_cells" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_table_rows_cells_locales_locale_parent_id_un" ON "_pages_v_blocks_table_rows_cells_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_table_rows_cells_locales_parent_id_idx" ON "_pages_v_blocks_table_rows_cells_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_table_rows_order_idx" ON "_pages_v_blocks_table_rows" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_table_rows_parent_id_idx" ON "_pages_v_blocks_table_rows" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_table_order_idx" ON "_pages_v_blocks_table" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_table_parent_id_idx" ON "_pages_v_blocks_table" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_table_path_idx" ON "_pages_v_blocks_table" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_table_locales_locale_parent_id_unique" ON "_pages_v_blocks_table_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_table_locales_parent_id_idx" ON "_pages_v_blocks_table_locales" USING btree ("_parent_id");
  CREATE INDEX "class_pages_blocks_table_columns_order_idx" ON "class_pages_blocks_table_columns" USING btree ("_order");
  CREATE INDEX "class_pages_blocks_table_columns_parent_id_idx" ON "class_pages_blocks_table_columns" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "class_pages_blocks_table_columns_locales_locale_parent_id_un" ON "class_pages_blocks_table_columns_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "class_pages_blocks_table_columns_locales_parent_id_idx" ON "class_pages_blocks_table_columns_locales" USING btree ("_parent_id");
  CREATE INDEX "class_pages_blocks_table_rows_cells_order_idx" ON "class_pages_blocks_table_rows_cells" USING btree ("_order");
  CREATE INDEX "class_pages_blocks_table_rows_cells_parent_id_idx" ON "class_pages_blocks_table_rows_cells" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "class_pages_blocks_table_rows_cells_locales_locale_parent_id" ON "class_pages_blocks_table_rows_cells_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "class_pages_blocks_table_rows_cells_locales_parent_id_idx" ON "class_pages_blocks_table_rows_cells_locales" USING btree ("_parent_id");
  CREATE INDEX "class_pages_blocks_table_rows_order_idx" ON "class_pages_blocks_table_rows" USING btree ("_order");
  CREATE INDEX "class_pages_blocks_table_rows_parent_id_idx" ON "class_pages_blocks_table_rows" USING btree ("_parent_id");
  CREATE INDEX "class_pages_blocks_table_order_idx" ON "class_pages_blocks_table" USING btree ("_order");
  CREATE INDEX "class_pages_blocks_table_parent_id_idx" ON "class_pages_blocks_table" USING btree ("_parent_id");
  CREATE INDEX "class_pages_blocks_table_path_idx" ON "class_pages_blocks_table" USING btree ("_path");
  CREATE UNIQUE INDEX "class_pages_blocks_table_locales_locale_parent_id_unique" ON "class_pages_blocks_table_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "class_pages_blocks_table_locales_parent_id_idx" ON "class_pages_blocks_table_locales" USING btree ("_parent_id");
  CREATE INDEX "_class_pages_v_blocks_table_columns_order_idx" ON "_class_pages_v_blocks_table_columns" USING btree ("_order");
  CREATE INDEX "_class_pages_v_blocks_table_columns_parent_id_idx" ON "_class_pages_v_blocks_table_columns" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_class_pages_v_blocks_table_columns_locales_locale_parent_id" ON "_class_pages_v_blocks_table_columns_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_class_pages_v_blocks_table_columns_locales_parent_id_idx" ON "_class_pages_v_blocks_table_columns_locales" USING btree ("_parent_id");
  CREATE INDEX "_class_pages_v_blocks_table_rows_cells_order_idx" ON "_class_pages_v_blocks_table_rows_cells" USING btree ("_order");
  CREATE INDEX "_class_pages_v_blocks_table_rows_cells_parent_id_idx" ON "_class_pages_v_blocks_table_rows_cells" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_class_pages_v_blocks_table_rows_cells_locales_locale_parent" ON "_class_pages_v_blocks_table_rows_cells_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_class_pages_v_blocks_table_rows_cells_locales_parent_id_idx" ON "_class_pages_v_blocks_table_rows_cells_locales" USING btree ("_parent_id");
  CREATE INDEX "_class_pages_v_blocks_table_rows_order_idx" ON "_class_pages_v_blocks_table_rows" USING btree ("_order");
  CREATE INDEX "_class_pages_v_blocks_table_rows_parent_id_idx" ON "_class_pages_v_blocks_table_rows" USING btree ("_parent_id");
  CREATE INDEX "_class_pages_v_blocks_table_order_idx" ON "_class_pages_v_blocks_table" USING btree ("_order");
  CREATE INDEX "_class_pages_v_blocks_table_parent_id_idx" ON "_class_pages_v_blocks_table" USING btree ("_parent_id");
  CREATE INDEX "_class_pages_v_blocks_table_path_idx" ON "_class_pages_v_blocks_table" USING btree ("_path");
  CREATE UNIQUE INDEX "_class_pages_v_blocks_table_locales_locale_parent_id_unique" ON "_class_pages_v_blocks_table_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_class_pages_v_blocks_table_locales_parent_id_idx" ON "_class_pages_v_blocks_table_locales" USING btree ("_parent_id");
  CREATE INDEX "dungeon_pages_blocks_table_columns_order_idx" ON "dungeon_pages_blocks_table_columns" USING btree ("_order");
  CREATE INDEX "dungeon_pages_blocks_table_columns_parent_id_idx" ON "dungeon_pages_blocks_table_columns" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "dungeon_pages_blocks_table_columns_locales_locale_parent_id_" ON "dungeon_pages_blocks_table_columns_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "dungeon_pages_blocks_table_columns_locales_parent_id_idx" ON "dungeon_pages_blocks_table_columns_locales" USING btree ("_parent_id");
  CREATE INDEX "dungeon_pages_blocks_table_rows_cells_order_idx" ON "dungeon_pages_blocks_table_rows_cells" USING btree ("_order");
  CREATE INDEX "dungeon_pages_blocks_table_rows_cells_parent_id_idx" ON "dungeon_pages_blocks_table_rows_cells" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "dungeon_pages_blocks_table_rows_cells_locales_locale_parent_" ON "dungeon_pages_blocks_table_rows_cells_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "dungeon_pages_blocks_table_rows_cells_locales_parent_id_idx" ON "dungeon_pages_blocks_table_rows_cells_locales" USING btree ("_parent_id");
  CREATE INDEX "dungeon_pages_blocks_table_rows_order_idx" ON "dungeon_pages_blocks_table_rows" USING btree ("_order");
  CREATE INDEX "dungeon_pages_blocks_table_rows_parent_id_idx" ON "dungeon_pages_blocks_table_rows" USING btree ("_parent_id");
  CREATE INDEX "dungeon_pages_blocks_table_order_idx" ON "dungeon_pages_blocks_table" USING btree ("_order");
  CREATE INDEX "dungeon_pages_blocks_table_parent_id_idx" ON "dungeon_pages_blocks_table" USING btree ("_parent_id");
  CREATE INDEX "dungeon_pages_blocks_table_path_idx" ON "dungeon_pages_blocks_table" USING btree ("_path");
  CREATE UNIQUE INDEX "dungeon_pages_blocks_table_locales_locale_parent_id_unique" ON "dungeon_pages_blocks_table_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "dungeon_pages_blocks_table_locales_parent_id_idx" ON "dungeon_pages_blocks_table_locales" USING btree ("_parent_id");
  CREATE INDEX "_dungeon_pages_v_blocks_table_columns_order_idx" ON "_dungeon_pages_v_blocks_table_columns" USING btree ("_order");
  CREATE INDEX "_dungeon_pages_v_blocks_table_columns_parent_id_idx" ON "_dungeon_pages_v_blocks_table_columns" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_dungeon_pages_v_blocks_table_columns_locales_locale_parent_" ON "_dungeon_pages_v_blocks_table_columns_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_dungeon_pages_v_blocks_table_columns_locales_parent_id_idx" ON "_dungeon_pages_v_blocks_table_columns_locales" USING btree ("_parent_id");
  CREATE INDEX "_dungeon_pages_v_blocks_table_rows_cells_order_idx" ON "_dungeon_pages_v_blocks_table_rows_cells" USING btree ("_order");
  CREATE INDEX "_dungeon_pages_v_blocks_table_rows_cells_parent_id_idx" ON "_dungeon_pages_v_blocks_table_rows_cells" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_dungeon_pages_v_blocks_table_rows_cells_locales_locale_pare" ON "_dungeon_pages_v_blocks_table_rows_cells_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_dungeon_pages_v_blocks_table_rows_cells_locales_parent__idx" ON "_dungeon_pages_v_blocks_table_rows_cells_locales" USING btree ("_parent_id");
  CREATE INDEX "_dungeon_pages_v_blocks_table_rows_order_idx" ON "_dungeon_pages_v_blocks_table_rows" USING btree ("_order");
  CREATE INDEX "_dungeon_pages_v_blocks_table_rows_parent_id_idx" ON "_dungeon_pages_v_blocks_table_rows" USING btree ("_parent_id");
  CREATE INDEX "_dungeon_pages_v_blocks_table_order_idx" ON "_dungeon_pages_v_blocks_table" USING btree ("_order");
  CREATE INDEX "_dungeon_pages_v_blocks_table_parent_id_idx" ON "_dungeon_pages_v_blocks_table" USING btree ("_parent_id");
  CREATE INDEX "_dungeon_pages_v_blocks_table_path_idx" ON "_dungeon_pages_v_blocks_table" USING btree ("_path");
  CREATE UNIQUE INDEX "_dungeon_pages_v_blocks_table_locales_locale_parent_id_uniqu" ON "_dungeon_pages_v_blocks_table_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_dungeon_pages_v_blocks_table_locales_parent_id_idx" ON "_dungeon_pages_v_blocks_table_locales" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "quest_guides_blocks_table_columns" CASCADE;
  DROP TABLE "quest_guides_blocks_table_columns_locales" CASCADE;
  DROP TABLE "quest_guides_blocks_table_rows_cells" CASCADE;
  DROP TABLE "quest_guides_blocks_table_rows_cells_locales" CASCADE;
  DROP TABLE "quest_guides_blocks_table_rows" CASCADE;
  DROP TABLE "quest_guides_blocks_table" CASCADE;
  DROP TABLE "quest_guides_blocks_table_locales" CASCADE;
  DROP TABLE "_quest_guides_v_blocks_table_columns" CASCADE;
  DROP TABLE "_quest_guides_v_blocks_table_columns_locales" CASCADE;
  DROP TABLE "_quest_guides_v_blocks_table_rows_cells" CASCADE;
  DROP TABLE "_quest_guides_v_blocks_table_rows_cells_locales" CASCADE;
  DROP TABLE "_quest_guides_v_blocks_table_rows" CASCADE;
  DROP TABLE "_quest_guides_v_blocks_table" CASCADE;
  DROP TABLE "_quest_guides_v_blocks_table_locales" CASCADE;
  DROP TABLE "dofus_guides_blocks_table_columns" CASCADE;
  DROP TABLE "dofus_guides_blocks_table_columns_locales" CASCADE;
  DROP TABLE "dofus_guides_blocks_table_rows_cells" CASCADE;
  DROP TABLE "dofus_guides_blocks_table_rows_cells_locales" CASCADE;
  DROP TABLE "dofus_guides_blocks_table_rows" CASCADE;
  DROP TABLE "dofus_guides_blocks_table" CASCADE;
  DROP TABLE "dofus_guides_blocks_table_locales" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_table_columns" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_table_columns_locales" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_table_rows_cells" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_table_rows_cells_locales" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_table_rows" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_table" CASCADE;
  DROP TABLE "_dofus_guides_v_blocks_table_locales" CASCADE;
  DROP TABLE "pages_blocks_table_columns" CASCADE;
  DROP TABLE "pages_blocks_table_columns_locales" CASCADE;
  DROP TABLE "pages_blocks_table_rows_cells" CASCADE;
  DROP TABLE "pages_blocks_table_rows_cells_locales" CASCADE;
  DROP TABLE "pages_blocks_table_rows" CASCADE;
  DROP TABLE "pages_blocks_table" CASCADE;
  DROP TABLE "pages_blocks_table_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_table_columns" CASCADE;
  DROP TABLE "_pages_v_blocks_table_columns_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_table_rows_cells" CASCADE;
  DROP TABLE "_pages_v_blocks_table_rows_cells_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_table_rows" CASCADE;
  DROP TABLE "_pages_v_blocks_table" CASCADE;
  DROP TABLE "_pages_v_blocks_table_locales" CASCADE;
  DROP TABLE "class_pages_blocks_table_columns" CASCADE;
  DROP TABLE "class_pages_blocks_table_columns_locales" CASCADE;
  DROP TABLE "class_pages_blocks_table_rows_cells" CASCADE;
  DROP TABLE "class_pages_blocks_table_rows_cells_locales" CASCADE;
  DROP TABLE "class_pages_blocks_table_rows" CASCADE;
  DROP TABLE "class_pages_blocks_table" CASCADE;
  DROP TABLE "class_pages_blocks_table_locales" CASCADE;
  DROP TABLE "_class_pages_v_blocks_table_columns" CASCADE;
  DROP TABLE "_class_pages_v_blocks_table_columns_locales" CASCADE;
  DROP TABLE "_class_pages_v_blocks_table_rows_cells" CASCADE;
  DROP TABLE "_class_pages_v_blocks_table_rows_cells_locales" CASCADE;
  DROP TABLE "_class_pages_v_blocks_table_rows" CASCADE;
  DROP TABLE "_class_pages_v_blocks_table" CASCADE;
  DROP TABLE "_class_pages_v_blocks_table_locales" CASCADE;
  DROP TABLE "dungeon_pages_blocks_table_columns" CASCADE;
  DROP TABLE "dungeon_pages_blocks_table_columns_locales" CASCADE;
  DROP TABLE "dungeon_pages_blocks_table_rows_cells" CASCADE;
  DROP TABLE "dungeon_pages_blocks_table_rows_cells_locales" CASCADE;
  DROP TABLE "dungeon_pages_blocks_table_rows" CASCADE;
  DROP TABLE "dungeon_pages_blocks_table" CASCADE;
  DROP TABLE "dungeon_pages_blocks_table_locales" CASCADE;
  DROP TABLE "_dungeon_pages_v_blocks_table_columns" CASCADE;
  DROP TABLE "_dungeon_pages_v_blocks_table_columns_locales" CASCADE;
  DROP TABLE "_dungeon_pages_v_blocks_table_rows_cells" CASCADE;
  DROP TABLE "_dungeon_pages_v_blocks_table_rows_cells_locales" CASCADE;
  DROP TABLE "_dungeon_pages_v_blocks_table_rows" CASCADE;
  DROP TABLE "_dungeon_pages_v_blocks_table" CASCADE;
  DROP TABLE "_dungeon_pages_v_blocks_table_locales" CASCADE;
  DROP TYPE "public"."enum_quest_guides_blocks_table_columns_align";
  DROP TYPE "public"."enum__quest_guides_v_blocks_table_columns_align";
  DROP TYPE "public"."enum_dofus_guides_blocks_table_columns_align";
  DROP TYPE "public"."enum__dofus_guides_v_blocks_table_columns_align";
  DROP TYPE "public"."enum_pages_blocks_table_columns_align";
  DROP TYPE "public"."enum__pages_v_blocks_table_columns_align";
  DROP TYPE "public"."enum_class_pages_blocks_table_columns_align";
  DROP TYPE "public"."enum__class_pages_v_blocks_table_columns_align";
  DROP TYPE "public"."enum_dungeon_pages_blocks_table_columns_align";
  DROP TYPE "public"."enum__dungeon_pages_v_blocks_table_columns_align";`)
}
