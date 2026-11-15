import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_quests_stages_objectives_kind" ADD VALUE 'show' BEFORE 'fight';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "quests_stages_objectives" ALTER COLUMN "kind" SET DATA TYPE text;
  UPDATE "quests_stages_objectives" SET "kind" = 'bring' WHERE "kind" = 'show';
  DROP TYPE "public"."enum_quests_stages_objectives_kind";
  CREATE TYPE "public"."enum_quests_stages_objectives_kind" AS ENUM('free', 'npc', 'bring', 'fight', 'map', 'craft');
  ALTER TABLE "quests_stages_objectives" ALTER COLUMN "kind" SET DATA TYPE "public"."enum_quests_stages_objectives_kind" USING "kind"::"public"."enum_quests_stages_objectives_kind";`)
}
