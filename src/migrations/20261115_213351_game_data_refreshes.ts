import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_game_data_refreshes_status" AS ENUM('running', 'ok', 'partial', 'failed');
  CREATE TYPE "public"."enum_game_data_refreshes_trigger" AS ENUM('schedule', 'panel', 'script');
  CREATE TABLE "game_data_refreshes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"started_at" timestamp(3) with time zone NOT NULL,
  	"finished_at" timestamp(3) with time zone,
  	"status" "enum_game_data_refreshes_status" NOT NULL,
  	"trigger" "enum_game_data_refreshes_trigger" NOT NULL,
  	"requested_by_id" integer,
  	"report" varchar,
  	"error" varchar,
  	"summary" jsonb,
  	"lock" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "game_data_refreshes_id" integer;
  ALTER TABLE "game_data_refreshes" ADD CONSTRAINT "game_data_refreshes_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "game_data_refreshes_started_at_idx" ON "game_data_refreshes" USING btree ("started_at");
  CREATE INDEX "game_data_refreshes_requested_by_idx" ON "game_data_refreshes" USING btree ("requested_by_id");
  CREATE UNIQUE INDEX "game_data_refreshes_lock_idx" ON "game_data_refreshes" USING btree ("lock");
  CREATE INDEX "game_data_refreshes_updated_at_idx" ON "game_data_refreshes" USING btree ("updated_at");
  CREATE INDEX "game_data_refreshes_created_at_idx" ON "game_data_refreshes" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_game_data_refreshes_fk" FOREIGN KEY ("game_data_refreshes_id") REFERENCES "public"."game_data_refreshes"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_game_data_refreshes_id_idx" ON "payload_locked_documents_rels" USING btree ("game_data_refreshes_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Primero la columna de los bloqueos que apunta a la tabla; luego la tabla. Al revés, el
  // CASCADE de la tabla ya borra la restricción y soltarla después falla.
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_game_data_refreshes_fk";
  DROP INDEX "payload_locked_documents_rels_game_data_refreshes_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "game_data_refreshes_id";
  DROP TABLE "game_data_refreshes" CASCADE;
  DROP TYPE "public"."enum_game_data_refreshes_status";
  DROP TYPE "public"."enum_game_data_refreshes_trigger";`)
}
