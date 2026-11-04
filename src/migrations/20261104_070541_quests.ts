import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "quests_start_positions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"npc_id" numeric,
  	"map_id" numeric,
  	"x" numeric,
  	"y" numeric
  );
  
  CREATE TABLE "quests_start_positions_locales" (
  	"npc_name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "quests" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"dofus_id" numeric NOT NULL,
  	"level_min" numeric,
  	"level_max" numeric,
  	"category_id" numeric,
  	"start_criterion" varchar,
  	"refreshed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "quests_locales" (
  	"name" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "quests_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"quests_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "quests_id" integer;
  ALTER TABLE "quests_start_positions" ADD CONSTRAINT "quests_start_positions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quests_start_positions_locales" ADD CONSTRAINT "quests_start_positions_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quests_start_positions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quests_locales" ADD CONSTRAINT "quests_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quests_rels" ADD CONSTRAINT "quests_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quests_rels" ADD CONSTRAINT "quests_rels_quests_fk" FOREIGN KEY ("quests_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "quests_start_positions_order_idx" ON "quests_start_positions" USING btree ("_order");
  CREATE INDEX "quests_start_positions_parent_id_idx" ON "quests_start_positions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "quests_start_positions_locales_locale_parent_id_unique" ON "quests_start_positions_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "quests_start_positions_locales_parent_id_idx" ON "quests_start_positions_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "quests_dofus_id_idx" ON "quests" USING btree ("dofus_id");
  CREATE INDEX "quests_updated_at_idx" ON "quests" USING btree ("updated_at");
  CREATE INDEX "quests_created_at_idx" ON "quests" USING btree ("created_at");
  CREATE UNIQUE INDEX "quests_locales_locale_parent_id_unique" ON "quests_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "quests_locales_parent_id_idx" ON "quests_locales" USING btree ("_parent_id");
  CREATE INDEX "quests_rels_order_idx" ON "quests_rels" USING btree ("order");
  CREATE INDEX "quests_rels_parent_idx" ON "quests_rels" USING btree ("parent_id");
  CREATE INDEX "quests_rels_path_idx" ON "quests_rels" USING btree ("path");
  CREATE INDEX "quests_rels_quests_id_idx" ON "quests_rels" USING btree ("quests_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_quests_fk" FOREIGN KEY ("quests_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_quests_id_idx" ON "payload_locked_documents_rels" USING btree ("quests_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "quests_start_positions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "quests_start_positions_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "quests" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "quests_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "quests_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "quests_start_positions" CASCADE;
  DROP TABLE "quests_start_positions_locales" CASCADE;
  DROP TABLE "quests" CASCADE;
  DROP TABLE "quests_locales" CASCADE;
  DROP TABLE "quests_rels" CASCADE;
  -- DROP TABLE "quests" CASCADE ya borró payload_locked_documents_rels_quests_fk.
  DROP INDEX "payload_locked_documents_rels_quests_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "quests_id";`)
}
