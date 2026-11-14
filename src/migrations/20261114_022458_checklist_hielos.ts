import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "checklists_completed_by" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"quest_id" integer
  );
  
  CREATE TABLE "_checklists_v_version_completed_by" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"quest_id" integer,
  	"_uuid" varchar
  );
  
  ALTER TABLE "checklists_steps_quests_locales" ADD COLUMN "label" varchar;
  ALTER TABLE "checklists" ADD COLUMN "legacy_generic_quests" jsonb;
  ALTER TABLE "_checklists_v_version_steps_quests_locales" ADD COLUMN "label" varchar;
  ALTER TABLE "_checklists_v" ADD COLUMN "version_legacy_generic_quests" jsonb;
  ALTER TABLE "checklists_completed_by" ADD CONSTRAINT "checklists_completed_by_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "checklists_completed_by" ADD CONSTRAINT "checklists_completed_by_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."checklists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_checklists_v_version_completed_by" ADD CONSTRAINT "_checklists_v_version_completed_by_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_checklists_v_version_completed_by" ADD CONSTRAINT "_checklists_v_version_completed_by_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_checklists_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "checklists_completed_by_order_idx" ON "checklists_completed_by" USING btree ("_order");
  CREATE INDEX "checklists_completed_by_parent_id_idx" ON "checklists_completed_by" USING btree ("_parent_id");
  CREATE INDEX "checklists_completed_by_quest_idx" ON "checklists_completed_by" USING btree ("quest_id");
  CREATE INDEX "_checklists_v_version_completed_by_order_idx" ON "_checklists_v_version_completed_by" USING btree ("_order");
  CREATE INDEX "_checklists_v_version_completed_by_parent_id_idx" ON "_checklists_v_version_completed_by" USING btree ("_parent_id");
  CREATE INDEX "_checklists_v_version_completed_by_quest_idx" ON "_checklists_v_version_completed_by" USING btree ("quest_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "checklists_completed_by" CASCADE;
  DROP TABLE "_checklists_v_version_completed_by" CASCADE;
  ALTER TABLE "checklists_steps_quests_locales" DROP COLUMN "label";
  ALTER TABLE "checklists" DROP COLUMN "legacy_generic_quests";
  ALTER TABLE "_checklists_v_version_steps_quests_locales" DROP COLUMN "label";
  ALTER TABLE "_checklists_v" DROP COLUMN "version_legacy_generic_quests";`)
}
