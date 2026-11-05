import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media_variants" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "media_variants" CASCADE;
  ALTER TABLE "media" ADD COLUMN "sizes_avif_480_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_avif_480_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_avif_480_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_avif_480_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_avif_480_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_avif_480_filename" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_webp_480_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_webp_480_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_webp_480_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_webp_480_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_webp_480_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_webp_480_filename" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_avif_800_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_avif_800_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_avif_800_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_avif_800_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_avif_800_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_avif_800_filename" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_webp_800_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_webp_800_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_webp_800_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_webp_800_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_webp_800_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_webp_800_filename" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_avif_1200_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_avif_1200_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_avif_1200_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_avif_1200_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_avif_1200_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_avif_1200_filename" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_webp_1200_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_webp_1200_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_webp_1200_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_webp_1200_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_webp_1200_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_webp_1200_filename" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_avif_1600_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_avif_1600_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_avif_1600_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_avif_1600_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_avif_1600_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_avif_1600_filename" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_webp_1600_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_webp_1600_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_webp_1600_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_webp_1600_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_webp_1600_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_webp_1600_filename" varchar;
  CREATE INDEX "media_sizes_avif_480_sizes_avif_480_filename_idx" ON "media" USING btree ("sizes_avif_480_filename");
  CREATE INDEX "media_sizes_webp_480_sizes_webp_480_filename_idx" ON "media" USING btree ("sizes_webp_480_filename");
  CREATE INDEX "media_sizes_avif_800_sizes_avif_800_filename_idx" ON "media" USING btree ("sizes_avif_800_filename");
  CREATE INDEX "media_sizes_webp_800_sizes_webp_800_filename_idx" ON "media" USING btree ("sizes_webp_800_filename");
  CREATE INDEX "media_sizes_avif_1200_sizes_avif_1200_filename_idx" ON "media" USING btree ("sizes_avif_1200_filename");
  CREATE INDEX "media_sizes_webp_1200_sizes_webp_1200_filename_idx" ON "media" USING btree ("sizes_webp_1200_filename");
  CREATE INDEX "media_sizes_avif_1600_sizes_avif_1600_filename_idx" ON "media" USING btree ("sizes_avif_1600_filename");
  CREATE INDEX "media_sizes_webp_1600_sizes_webp_1600_filename_idx" ON "media" USING btree ("sizes_webp_1600_filename");
  DROP TYPE "public"."enum_media_variants_format";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_media_variants_format" AS ENUM('avif', 'webp');
  CREATE TABLE "media_variants" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"width" numeric NOT NULL,
  	"format" "enum_media_variants_format" NOT NULL
  );
  
  DROP INDEX "media_sizes_avif_480_sizes_avif_480_filename_idx";
  DROP INDEX "media_sizes_webp_480_sizes_webp_480_filename_idx";
  DROP INDEX "media_sizes_avif_800_sizes_avif_800_filename_idx";
  DROP INDEX "media_sizes_webp_800_sizes_webp_800_filename_idx";
  DROP INDEX "media_sizes_avif_1200_sizes_avif_1200_filename_idx";
  DROP INDEX "media_sizes_webp_1200_sizes_webp_1200_filename_idx";
  DROP INDEX "media_sizes_avif_1600_sizes_avif_1600_filename_idx";
  DROP INDEX "media_sizes_webp_1600_sizes_webp_1600_filename_idx";
  ALTER TABLE "media_variants" ADD CONSTRAINT "media_variants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "media_variants_order_idx" ON "media_variants" USING btree ("_order");
  CREATE INDEX "media_variants_parent_id_idx" ON "media_variants" USING btree ("_parent_id");
  ALTER TABLE "media" DROP COLUMN "sizes_avif_480_url";
  ALTER TABLE "media" DROP COLUMN "sizes_avif_480_width";
  ALTER TABLE "media" DROP COLUMN "sizes_avif_480_height";
  ALTER TABLE "media" DROP COLUMN "sizes_avif_480_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_avif_480_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_avif_480_filename";
  ALTER TABLE "media" DROP COLUMN "sizes_webp_480_url";
  ALTER TABLE "media" DROP COLUMN "sizes_webp_480_width";
  ALTER TABLE "media" DROP COLUMN "sizes_webp_480_height";
  ALTER TABLE "media" DROP COLUMN "sizes_webp_480_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_webp_480_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_webp_480_filename";
  ALTER TABLE "media" DROP COLUMN "sizes_avif_800_url";
  ALTER TABLE "media" DROP COLUMN "sizes_avif_800_width";
  ALTER TABLE "media" DROP COLUMN "sizes_avif_800_height";
  ALTER TABLE "media" DROP COLUMN "sizes_avif_800_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_avif_800_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_avif_800_filename";
  ALTER TABLE "media" DROP COLUMN "sizes_webp_800_url";
  ALTER TABLE "media" DROP COLUMN "sizes_webp_800_width";
  ALTER TABLE "media" DROP COLUMN "sizes_webp_800_height";
  ALTER TABLE "media" DROP COLUMN "sizes_webp_800_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_webp_800_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_webp_800_filename";
  ALTER TABLE "media" DROP COLUMN "sizes_avif_1200_url";
  ALTER TABLE "media" DROP COLUMN "sizes_avif_1200_width";
  ALTER TABLE "media" DROP COLUMN "sizes_avif_1200_height";
  ALTER TABLE "media" DROP COLUMN "sizes_avif_1200_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_avif_1200_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_avif_1200_filename";
  ALTER TABLE "media" DROP COLUMN "sizes_webp_1200_url";
  ALTER TABLE "media" DROP COLUMN "sizes_webp_1200_width";
  ALTER TABLE "media" DROP COLUMN "sizes_webp_1200_height";
  ALTER TABLE "media" DROP COLUMN "sizes_webp_1200_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_webp_1200_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_webp_1200_filename";
  ALTER TABLE "media" DROP COLUMN "sizes_avif_1600_url";
  ALTER TABLE "media" DROP COLUMN "sizes_avif_1600_width";
  ALTER TABLE "media" DROP COLUMN "sizes_avif_1600_height";
  ALTER TABLE "media" DROP COLUMN "sizes_avif_1600_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_avif_1600_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_avif_1600_filename";
  ALTER TABLE "media" DROP COLUMN "sizes_webp_1600_url";
  ALTER TABLE "media" DROP COLUMN "sizes_webp_1600_width";
  ALTER TABLE "media" DROP COLUMN "sizes_webp_1600_height";
  ALTER TABLE "media" DROP COLUMN "sizes_webp_1600_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_webp_1600_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_webp_1600_filename";`)
}
