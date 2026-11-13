import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "dungeons" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"dofus_id" numeric NOT NULL,
  	"refreshed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "dungeons_locales" (
  	"name" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "dungeons_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"monsters_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "dungeons_id" integer;
  ALTER TABLE "dungeons_locales" ADD CONSTRAINT "dungeons_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dungeons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dungeons_rels" ADD CONSTRAINT "dungeons_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."dungeons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "dungeons_rels" ADD CONSTRAINT "dungeons_rels_monsters_fk" FOREIGN KEY ("monsters_id") REFERENCES "public"."monsters"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "dungeons_dofus_id_idx" ON "dungeons" USING btree ("dofus_id");
  CREATE INDEX "dungeons_updated_at_idx" ON "dungeons" USING btree ("updated_at");
  CREATE INDEX "dungeons_created_at_idx" ON "dungeons" USING btree ("created_at");
  CREATE UNIQUE INDEX "dungeons_locales_locale_parent_id_unique" ON "dungeons_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "dungeons_locales_parent_id_idx" ON "dungeons_locales" USING btree ("_parent_id");
  CREATE INDEX "dungeons_rels_order_idx" ON "dungeons_rels" USING btree ("order");
  CREATE INDEX "dungeons_rels_parent_idx" ON "dungeons_rels" USING btree ("parent_id");
  CREATE INDEX "dungeons_rels_path_idx" ON "dungeons_rels" USING btree ("path");
  CREATE INDEX "dungeons_rels_monsters_id_idx" ON "dungeons_rels" USING btree ("monsters_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_dungeons_fk" FOREIGN KEY ("dungeons_id") REFERENCES "public"."dungeons"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_dungeons_id_idx" ON "payload_locked_documents_rels" USING btree ("dungeons_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "dungeons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dungeons_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "dungeons_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "dungeons" CASCADE;
  DROP TABLE "dungeons_locales" CASCADE;
  DROP TABLE "dungeons_rels" CASCADE;
  -- DROP TABLE "dungeons" CASCADE ya borró payload_locked_documents_rels_dungeons_fk.
  DROP INDEX "payload_locked_documents_rels_dungeons_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "dungeons_id";`)
}
