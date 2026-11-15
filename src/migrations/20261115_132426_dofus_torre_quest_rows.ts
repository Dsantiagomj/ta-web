import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// Las misiones de cada logro de una guía de Dofus, como las escribe Torre: una lista por logro
// (también los de un metalogro) con su texto, las guías que enlaza y su nota, y la casilla que
// dice si salen las suyas o las de la página de logro. Los logros de antes quedan marcados
// (las de la página, como hasta ahora) hasta que la importación escriba las de Torre. Las
// misiones sueltas y las de un paso guardan también el texto de Torre, y una fila suelta puede
// ser un enlace que no es una misión. Solo añade tablas y columnas: no toca lo guardado.

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "dofus_ach_quests" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "dofus_ach_quests_locales" (
  	"title" varchar,
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "dofus_meta_ach_q" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "dofus_meta_ach_q_locales" (
  	"title" varchar,
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "dofus_guides_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"quest_guides_id" integer
  );
  
  CREATE TABLE "_dofus_ach_quests_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_dofus_ach_quests_v_locales" (
  	"title" varchar,
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_dofus_meta_ach_q_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_dofus_meta_ach_q_v_locales" (
  	"title" varchar,
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_dofus_guides_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"quest_guides_id" integer
  );
  
  ALTER TABLE "dofus_guides_blocks_dofus_achievement" ADD COLUMN "page_quests" boolean DEFAULT true;
  ALTER TABLE "dofus_guides_blocks_dofus_achievement" ADD COLUMN "link" varchar;
  ALTER TABLE "dofus_meta_ach" ADD COLUMN "page_quests" boolean DEFAULT true;
  ALTER TABLE "dofus_meta_ach" ADD COLUMN "link" varchar;
  ALTER TABLE "dofus_guides_blocks_dofus_quests_quests" ADD COLUMN "link" varchar;
  ALTER TABLE "dofus_guides_blocks_dofus_quests_quests_locales" ADD COLUMN "title" varchar;
  ALTER TABLE "dofus_guides_blocks_dofus_quest_locales" ADD COLUMN "title" varchar;
  ALTER TABLE "_dofus_guides_v_blocks_dofus_achievement" ADD COLUMN "page_quests" boolean DEFAULT true;
  ALTER TABLE "_dofus_guides_v_blocks_dofus_achievement" ADD COLUMN "link" varchar;
  ALTER TABLE "_dofus_meta_ach_v" ADD COLUMN "page_quests" boolean DEFAULT true;
  ALTER TABLE "_dofus_meta_ach_v" ADD COLUMN "link" varchar;
  ALTER TABLE "_dofus_guides_v_blocks_dofus_quests_quests" ADD COLUMN "link" varchar;
  ALTER TABLE "_dofus_guides_v_blocks_dofus_quests_quests_locales" ADD COLUMN "title" varchar;
  ALTER TABLE "_dofus_guides_v_blocks_dofus_quest_locales" ADD COLUMN "title" varchar;
  ALTER TABLE "dofus_ach_quests" ADD CONSTRAINT "dofus_ach_quests_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides_blocks_dofus_achievement"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_ach_quests_locales" ADD CONSTRAINT "dofus_ach_quests_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_ach_quests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_meta_ach_q" ADD CONSTRAINT "dofus_meta_ach_q_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_meta_ach"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_meta_ach_q_locales" ADD CONSTRAINT "dofus_meta_ach_q_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_meta_ach_q"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_rels" ADD CONSTRAINT "dofus_guides_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."dofus_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dofus_guides_rels" ADD CONSTRAINT "dofus_guides_rels_quest_guides_fk" FOREIGN KEY ("quest_guides_id") REFERENCES "public"."quest_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_ach_quests_v" ADD CONSTRAINT "_dofus_ach_quests_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v_blocks_dofus_achievement"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_ach_quests_v_locales" ADD CONSTRAINT "_dofus_ach_quests_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_ach_quests_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_meta_ach_q_v" ADD CONSTRAINT "_dofus_meta_ach_q_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_meta_ach_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_meta_ach_q_v_locales" ADD CONSTRAINT "_dofus_meta_ach_q_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_meta_ach_q_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_rels" ADD CONSTRAINT "_dofus_guides_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_dofus_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_rels" ADD CONSTRAINT "_dofus_guides_v_rels_quest_guides_fk" FOREIGN KEY ("quest_guides_id") REFERENCES "public"."quest_guides"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "dofus_ach_quests_order_idx" ON "dofus_ach_quests" USING btree ("_order");
  CREATE INDEX "dofus_ach_quests_parent_id_idx" ON "dofus_ach_quests" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "dofus_ach_quests_locales_locale_parent_id_unique" ON "dofus_ach_quests_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "dofus_ach_quests_locales_parent_id_idx" ON "dofus_ach_quests_locales" USING btree ("_parent_id");
  CREATE INDEX "dofus_meta_ach_q_order_idx" ON "dofus_meta_ach_q" USING btree ("_order");
  CREATE INDEX "dofus_meta_ach_q_parent_id_idx" ON "dofus_meta_ach_q" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "dofus_meta_ach_q_locales_locale_parent_id_unique" ON "dofus_meta_ach_q_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "dofus_meta_ach_q_locales_parent_id_idx" ON "dofus_meta_ach_q_locales" USING btree ("_parent_id");
  CREATE INDEX "dofus_guides_rels_order_idx" ON "dofus_guides_rels" USING btree ("order");
  CREATE INDEX "dofus_guides_rels_parent_idx" ON "dofus_guides_rels" USING btree ("parent_id");
  CREATE INDEX "dofus_guides_rels_path_idx" ON "dofus_guides_rels" USING btree ("path");
  CREATE INDEX "dofus_guides_rels_quest_guides_id_idx" ON "dofus_guides_rels" USING btree ("quest_guides_id");
  CREATE INDEX "_dofus_ach_quests_v_order_idx" ON "_dofus_ach_quests_v" USING btree ("_order");
  CREATE INDEX "_dofus_ach_quests_v_parent_id_idx" ON "_dofus_ach_quests_v" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_dofus_ach_quests_v_locales_locale_parent_id_unique" ON "_dofus_ach_quests_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_dofus_ach_quests_v_locales_parent_id_idx" ON "_dofus_ach_quests_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_dofus_meta_ach_q_v_order_idx" ON "_dofus_meta_ach_q_v" USING btree ("_order");
  CREATE INDEX "_dofus_meta_ach_q_v_parent_id_idx" ON "_dofus_meta_ach_q_v" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_dofus_meta_ach_q_v_locales_locale_parent_id_unique" ON "_dofus_meta_ach_q_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_dofus_meta_ach_q_v_locales_parent_id_idx" ON "_dofus_meta_ach_q_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_dofus_guides_v_rels_order_idx" ON "_dofus_guides_v_rels" USING btree ("order");
  CREATE INDEX "_dofus_guides_v_rels_parent_idx" ON "_dofus_guides_v_rels" USING btree ("parent_id");
  CREATE INDEX "_dofus_guides_v_rels_path_idx" ON "_dofus_guides_v_rels" USING btree ("path");
  CREATE INDEX "_dofus_guides_v_rels_quest_guides_id_idx" ON "_dofus_guides_v_rels" USING btree ("quest_guides_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "dofus_ach_quests" CASCADE;
  DROP TABLE "dofus_ach_quests_locales" CASCADE;
  DROP TABLE "dofus_meta_ach_q" CASCADE;
  DROP TABLE "dofus_meta_ach_q_locales" CASCADE;
  DROP TABLE "dofus_guides_rels" CASCADE;
  DROP TABLE "_dofus_ach_quests_v" CASCADE;
  DROP TABLE "_dofus_ach_quests_v_locales" CASCADE;
  DROP TABLE "_dofus_meta_ach_q_v" CASCADE;
  DROP TABLE "_dofus_meta_ach_q_v_locales" CASCADE;
  DROP TABLE "_dofus_guides_v_rels" CASCADE;
  ALTER TABLE "dofus_guides_blocks_dofus_achievement" DROP COLUMN "page_quests";
  ALTER TABLE "dofus_guides_blocks_dofus_achievement" DROP COLUMN "link";
  ALTER TABLE "dofus_meta_ach" DROP COLUMN "page_quests";
  ALTER TABLE "dofus_meta_ach" DROP COLUMN "link";
  ALTER TABLE "dofus_guides_blocks_dofus_quests_quests" DROP COLUMN "link";
  ALTER TABLE "dofus_guides_blocks_dofus_quests_quests_locales" DROP COLUMN "title";
  ALTER TABLE "dofus_guides_blocks_dofus_quest_locales" DROP COLUMN "title";
  ALTER TABLE "_dofus_guides_v_blocks_dofus_achievement" DROP COLUMN "page_quests";
  ALTER TABLE "_dofus_guides_v_blocks_dofus_achievement" DROP COLUMN "link";
  ALTER TABLE "_dofus_meta_ach_v" DROP COLUMN "page_quests";
  ALTER TABLE "_dofus_meta_ach_v" DROP COLUMN "link";
  ALTER TABLE "_dofus_guides_v_blocks_dofus_quests_quests" DROP COLUMN "link";
  ALTER TABLE "_dofus_guides_v_blocks_dofus_quests_quests_locales" DROP COLUMN "title";
  ALTER TABLE "_dofus_guides_v_blocks_dofus_quest_locales" DROP COLUMN "title";`)
}
