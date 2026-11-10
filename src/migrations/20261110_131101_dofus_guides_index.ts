import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "dofus_guides_index" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "dofus_guides_index_locales" (
  	"intro" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "dofus_guides_index_locales" ADD CONSTRAINT "dofus_guides_index_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides_index"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "dofus_guides_index_locales_locale_parent_id_unique" ON "dofus_guides_index_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "dofus_guides_index_locales_parent_id_idx" ON "dofus_guides_index_locales" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "dofus_guides_index" CASCADE;
  DROP TABLE "dofus_guides_index_locales" CASCADE;`)
}
