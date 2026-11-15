import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "checklists_rels" ADD COLUMN "dofus_guides_id" integer;
  ALTER TABLE "_checklists_v_rels" ADD COLUMN "dofus_guides_id" integer;
  ALTER TABLE "checklists_rels" ADD CONSTRAINT "checklists_rels_dofus_guides_fk" FOREIGN KEY ("dofus_guides_id") REFERENCES "public"."dofus_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_checklists_v_rels" ADD CONSTRAINT "_checklists_v_rels_dofus_guides_fk" FOREIGN KEY ("dofus_guides_id") REFERENCES "public"."dofus_guides"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "checklists_rels_dofus_guides_id_idx" ON "checklists_rels" USING btree ("dofus_guides_id");
  CREATE INDEX "_checklists_v_rels_dofus_guides_id_idx" ON "_checklists_v_rels" USING btree ("dofus_guides_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "checklists_rels" DROP CONSTRAINT "checklists_rels_dofus_guides_fk";
  
  ALTER TABLE "_checklists_v_rels" DROP CONSTRAINT "_checklists_v_rels_dofus_guides_fk";
  
  DROP INDEX "checklists_rels_dofus_guides_id_idx";
  DROP INDEX "_checklists_v_rels_dofus_guides_id_idx";
  ALTER TABLE "checklists_rels" DROP COLUMN "dofus_guides_id";
  ALTER TABLE "_checklists_v_rels" DROP COLUMN "dofus_guides_id";`)
}
