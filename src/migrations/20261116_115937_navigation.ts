import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_navigation_sections_key" AS ENUM('misiones', 'dofus', 'checklists', 'clases', 'mazmorras');
  CREATE TABLE "navigation_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" "enum_navigation_sections_key" NOT NULL,
  	"visible" boolean DEFAULT true,
  	"soon" boolean DEFAULT false
  );
  
  CREATE TABLE "navigation_sections_locales" (
  	"label" varchar,
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "navigation" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "navigation_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"dofus_guides_id" integer
  );
  
  ALTER TABLE "navigation_sections" ADD CONSTRAINT "navigation_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_sections_locales" ADD CONSTRAINT "navigation_sections_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navigation_sections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_rels" ADD CONSTRAINT "navigation_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navigation_rels" ADD CONSTRAINT "navigation_rels_dofus_guides_fk" FOREIGN KEY ("dofus_guides_id") REFERENCES "public"."dofus_guides"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "navigation_sections_order_idx" ON "navigation_sections" USING btree ("_order");
  CREATE INDEX "navigation_sections_parent_id_idx" ON "navigation_sections" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "navigation_sections_locales_locale_parent_id_unique" ON "navigation_sections_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "navigation_sections_locales_parent_id_idx" ON "navigation_sections_locales" USING btree ("_parent_id");
  CREATE INDEX "navigation_rels_order_idx" ON "navigation_rels" USING btree ("order");
  CREATE INDEX "navigation_rels_parent_idx" ON "navigation_rels" USING btree ("parent_id");
  CREATE INDEX "navigation_rels_path_idx" ON "navigation_rels" USING btree ("path");
  CREATE INDEX "navigation_rels_dofus_guides_id_idx" ON "navigation_rels" USING btree ("dofus_guides_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "navigation_sections" CASCADE;
  DROP TABLE "navigation_sections_locales" CASCADE;
  DROP TABLE "navigation" CASCADE;
  DROP TABLE "navigation_rels" CASCADE;
  DROP TYPE "public"."enum_navigation_sections_key";`)
}
