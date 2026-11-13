import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "subareas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"dofus_id" numeric NOT NULL,
  	"area_dofus_id" numeric,
  	"refreshed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "subareas_locales" (
  	"name" varchar NOT NULL,
  	"area_name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "subareas_id" integer;
  ALTER TABLE "subareas_locales" ADD CONSTRAINT "subareas_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."subareas"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "subareas_dofus_id_idx" ON "subareas" USING btree ("dofus_id");
  CREATE INDEX "subareas_updated_at_idx" ON "subareas" USING btree ("updated_at");
  CREATE INDEX "subareas_created_at_idx" ON "subareas" USING btree ("created_at");
  CREATE UNIQUE INDEX "subareas_locales_locale_parent_id_unique" ON "subareas_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "subareas_locales_parent_id_idx" ON "subareas_locales" USING btree ("_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_subareas_fk" FOREIGN KEY ("subareas_id") REFERENCES "public"."subareas"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_subareas_id_idx" ON "payload_locked_documents_rels" USING btree ("subareas_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Primero la columna de payload_locked_documents_rels: el DROP TABLE … CASCADE ya se lleva
  // su clave foránea, y el DROP CONSTRAINT de después fallaría.
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_subareas_fk";
  DROP INDEX "payload_locked_documents_rels_subareas_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "subareas_id";
  ALTER TABLE "subareas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "subareas_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "subareas" CASCADE;
  DROP TABLE "subareas_locales" CASCADE;`)
}
