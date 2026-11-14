import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_checklists_kind" AS ENUM('steps', 'souls');
  CREATE TYPE "public"."enum__checklists_v_version_kind" AS ENUM('steps', 'souls');
  CREATE TABLE "monsters_numbers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" numeric,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL
  );
  
  ALTER TABLE "checklists" ADD COLUMN "kind" "enum_checklists_kind" DEFAULT 'steps';
  ALTER TABLE "checklists" ADD COLUMN "souls_quest_id" integer;
  ALTER TABLE "_checklists_v" ADD COLUMN "version_kind" "enum__checklists_v_version_kind" DEFAULT 'steps';
  ALTER TABLE "_checklists_v" ADD COLUMN "version_souls_quest_id" integer;
  ALTER TABLE "monsters" ADD COLUMN "boss" boolean;
  ALTER TABLE "monsters" ADD COLUMN "archmonster" boolean;
  ALTER TABLE "monsters" ADD COLUMN "sub_area_id" numeric;
  ALTER TABLE "dungeons" ADD COLUMN "level" numeric;
  ALTER TABLE "monsters_numbers" ADD CONSTRAINT "monsters_numbers_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."monsters"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "monsters_numbers_order_parent_idx" ON "monsters_numbers" USING btree ("order","parent_id");
  ALTER TABLE "checklists" ADD CONSTRAINT "checklists_souls_quest_id_quests_id_fk" FOREIGN KEY ("souls_quest_id") REFERENCES "public"."quests"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_checklists_v" ADD CONSTRAINT "_checklists_v_version_souls_quest_id_quests_id_fk" FOREIGN KEY ("version_souls_quest_id") REFERENCES "public"."quests"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "checklists_souls_quest_idx" ON "checklists" USING btree ("souls_quest_id");
  CREATE INDEX "_checklists_v_version_version_souls_quest_idx" ON "_checklists_v" USING btree ("version_souls_quest_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "monsters_numbers" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "monsters_numbers" CASCADE;
  ALTER TABLE "checklists" DROP CONSTRAINT "checklists_souls_quest_id_quests_id_fk";
  
  ALTER TABLE "_checklists_v" DROP CONSTRAINT "_checklists_v_version_souls_quest_id_quests_id_fk";
  
  DROP INDEX "checklists_souls_quest_idx";
  DROP INDEX "_checklists_v_version_version_souls_quest_idx";
  ALTER TABLE "checklists" DROP COLUMN "kind";
  ALTER TABLE "checklists" DROP COLUMN "souls_quest_id";
  ALTER TABLE "_checklists_v" DROP COLUMN "version_kind";
  ALTER TABLE "_checklists_v" DROP COLUMN "version_souls_quest_id";
  ALTER TABLE "monsters" DROP COLUMN "boss";
  ALTER TABLE "monsters" DROP COLUMN "archmonster";
  ALTER TABLE "monsters" DROP COLUMN "sub_area_id";
  ALTER TABLE "dungeons" DROP COLUMN "level";
  DROP TYPE "public"."enum_checklists_kind";
  DROP TYPE "public"."enum__checklists_v_version_kind";`)
}
