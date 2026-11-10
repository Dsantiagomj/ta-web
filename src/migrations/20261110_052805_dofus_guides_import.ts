import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "dofus_guides" ADD COLUMN "video_poster_id" integer;
  ALTER TABLE "dofus_guides" ADD COLUMN "import_snapshot" jsonb;
  ALTER TABLE "_dofus_guides_v" ADD COLUMN "version_video_poster_id" integer;
  ALTER TABLE "_dofus_guides_v" ADD COLUMN "version_import_snapshot" jsonb;
  ALTER TABLE "dofus_guides" ADD CONSTRAINT "dofus_guides_video_poster_id_media_id_fk" FOREIGN KEY ("video_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v" ADD CONSTRAINT "_dofus_guides_v_version_video_poster_id_media_id_fk" FOREIGN KEY ("version_video_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "dofus_guides_video_poster_idx" ON "dofus_guides" USING btree ("video_poster_id");
  CREATE INDEX "_dofus_guides_v_version_version_video_poster_idx" ON "_dofus_guides_v" USING btree ("version_video_poster_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "dofus_guides" DROP CONSTRAINT "dofus_guides_video_poster_id_media_id_fk";
  
  ALTER TABLE "_dofus_guides_v" DROP CONSTRAINT "_dofus_guides_v_version_video_poster_id_media_id_fk";
  
  DROP INDEX "dofus_guides_video_poster_idx";
  DROP INDEX "_dofus_guides_v_version_version_video_poster_idx";
  ALTER TABLE "dofus_guides" DROP COLUMN "video_poster_id";
  ALTER TABLE "dofus_guides" DROP COLUMN "import_snapshot";
  ALTER TABLE "_dofus_guides_v" DROP COLUMN "version_video_poster_id";
  ALTER TABLE "_dofus_guides_v" DROP COLUMN "version_import_snapshot";`)
}
