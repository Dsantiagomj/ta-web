import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * El ambiente que cada checklist tenía por su id antiguo (ambience-data.ts lo repartía así): el
 * Hielos nieva y el Silvestre tiene las luciérnagas y hojas del hub. Las demás se quedan con el
 * de siempre, las motas del color de su Dofus (el valor por defecto). También en sus versiones,
 * para que un borrador o una versión restaurada no lo pierdan.
 */
export const AMBIENCE_FROM_LEGACY = sql`
  UPDATE "checklists" SET "ambience" = 'snow' WHERE "legacy_prefix" = 'hielos:';
  UPDATE "checklists" SET "ambience" = 'forest' WHERE "legacy_prefix" = 'silvestre:';
  UPDATE "_checklists_v" SET "version_ambience" = 'snow' WHERE "version_legacy_prefix" = 'hielos:';
  UPDATE "_checklists_v" SET "version_ambience" = 'forest' WHERE "version_legacy_prefix" = 'silvestre:';
`

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_checklists_ambience" AS ENUM('egg', 'snow', 'forest', 'theme');
  CREATE TYPE "public"."enum__checklists_v_version_ambience" AS ENUM('egg', 'snow', 'forest', 'theme');
  CREATE TABLE "achievement_pages_prerequisites" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"guide_id" integer
  );
  
  CREATE TABLE "achievement_pages_prerequisites_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_achievement_pages_v_version_prerequisites" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"guide_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_achievement_pages_v_version_prerequisites_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "checklists_soul_overrides" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"monster_id" integer,
  	"hidden" boolean
  );
  
  CREATE TABLE "checklists_soul_overrides_locales" (
  	"dungeon" varchar,
  	"zone" varchar,
  	"region" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_checklists_v_version_soul_overrides" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"monster_id" integer,
  	"hidden" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_checklists_v_version_soul_overrides_locales" (
  	"dungeon" varchar,
  	"zone" varchar,
  	"region" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "quest_guides" ADD COLUMN "summary_level" numeric;
  ALTER TABLE "quest_guides_locales" ADD COLUMN "summary_zone" varchar;
  ALTER TABLE "_quest_guides_v" ADD COLUMN "version_summary_level" numeric;
  ALTER TABLE "_quest_guides_v_locales" ADD COLUMN "version_summary_zone" varchar;
  ALTER TABLE "dofus_guides" ADD COLUMN "egg_id" integer;
  ALTER TABLE "_dofus_guides_v" ADD COLUMN "version_egg_id" integer;
  ALTER TABLE "checklists" ADD COLUMN "ambience" "enum_checklists_ambience" DEFAULT 'egg';
  ALTER TABLE "_checklists_v" ADD COLUMN "version_ambience" "enum__checklists_v_version_ambience" DEFAULT 'egg';
  ALTER TABLE "achievement_pages_prerequisites" ADD CONSTRAINT "achievement_pages_prerequisites_guide_id_quest_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."quest_guides"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "achievement_pages_prerequisites" ADD CONSTRAINT "achievement_pages_prerequisites_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."achievement_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "achievement_pages_prerequisites_locales" ADD CONSTRAINT "achievement_pages_prerequisites_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."achievement_pages_prerequisites"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_achievement_pages_v_version_prerequisites" ADD CONSTRAINT "_achievement_pages_v_version_prerequisites_guide_id_quest_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."quest_guides"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_achievement_pages_v_version_prerequisites" ADD CONSTRAINT "_achievement_pages_v_version_prerequisites_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_achievement_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_achievement_pages_v_version_prerequisites_locales" ADD CONSTRAINT "_achievement_pages_v_version_prerequisites_locales_parent_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_achievement_pages_v_version_prerequisites"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "checklists_soul_overrides" ADD CONSTRAINT "checklists_soul_overrides_monster_id_monsters_id_fk" FOREIGN KEY ("monster_id") REFERENCES "public"."monsters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "checklists_soul_overrides" ADD CONSTRAINT "checklists_soul_overrides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."checklists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "checklists_soul_overrides_locales" ADD CONSTRAINT "checklists_soul_overrides_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."checklists_soul_overrides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_checklists_v_version_soul_overrides" ADD CONSTRAINT "_checklists_v_version_soul_overrides_monster_id_monsters_id_fk" FOREIGN KEY ("monster_id") REFERENCES "public"."monsters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_checklists_v_version_soul_overrides" ADD CONSTRAINT "_checklists_v_version_soul_overrides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_checklists_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_checklists_v_version_soul_overrides_locales" ADD CONSTRAINT "_checklists_v_version_soul_overrides_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_checklists_v_version_soul_overrides"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "achievement_pages_prerequisites_order_idx" ON "achievement_pages_prerequisites" USING btree ("_order");
  CREATE INDEX "achievement_pages_prerequisites_parent_id_idx" ON "achievement_pages_prerequisites" USING btree ("_parent_id");
  CREATE INDEX "achievement_pages_prerequisites_guide_idx" ON "achievement_pages_prerequisites" USING btree ("guide_id");
  CREATE UNIQUE INDEX "achievement_pages_prerequisites_locales_locale_parent_id_uni" ON "achievement_pages_prerequisites_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "achievement_pages_prerequisites_locales_parent_id_idx" ON "achievement_pages_prerequisites_locales" USING btree ("_parent_id");
  CREATE INDEX "_achievement_pages_v_version_prerequisites_order_idx" ON "_achievement_pages_v_version_prerequisites" USING btree ("_order");
  CREATE INDEX "_achievement_pages_v_version_prerequisites_parent_id_idx" ON "_achievement_pages_v_version_prerequisites" USING btree ("_parent_id");
  CREATE INDEX "_achievement_pages_v_version_prerequisites_guide_idx" ON "_achievement_pages_v_version_prerequisites" USING btree ("guide_id");
  CREATE UNIQUE INDEX "_achievement_pages_v_version_prerequisites_locales_locale_pa" ON "_achievement_pages_v_version_prerequisites_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_achievement_pages_v_version_prerequisites_locales_paren_idx" ON "_achievement_pages_v_version_prerequisites_locales" USING btree ("_parent_id");
  CREATE INDEX "checklists_soul_overrides_order_idx" ON "checklists_soul_overrides" USING btree ("_order");
  CREATE INDEX "checklists_soul_overrides_parent_id_idx" ON "checklists_soul_overrides" USING btree ("_parent_id");
  CREATE INDEX "checklists_soul_overrides_monster_idx" ON "checklists_soul_overrides" USING btree ("monster_id");
  CREATE UNIQUE INDEX "checklists_soul_overrides_locales_locale_parent_id_unique" ON "checklists_soul_overrides_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "checklists_soul_overrides_locales_parent_id_idx" ON "checklists_soul_overrides_locales" USING btree ("_parent_id");
  CREATE INDEX "_checklists_v_version_soul_overrides_order_idx" ON "_checklists_v_version_soul_overrides" USING btree ("_order");
  CREATE INDEX "_checklists_v_version_soul_overrides_parent_id_idx" ON "_checklists_v_version_soul_overrides" USING btree ("_parent_id");
  CREATE INDEX "_checklists_v_version_soul_overrides_monster_idx" ON "_checklists_v_version_soul_overrides" USING btree ("monster_id");
  CREATE UNIQUE INDEX "_checklists_v_version_soul_overrides_locales_locale_parent_i" ON "_checklists_v_version_soul_overrides_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_checklists_v_version_soul_overrides_locales_parent_id_idx" ON "_checklists_v_version_soul_overrides_locales" USING btree ("_parent_id");
  ALTER TABLE "dofus_guides" ADD CONSTRAINT "dofus_guides_egg_id_media_id_fk" FOREIGN KEY ("egg_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v" ADD CONSTRAINT "_dofus_guides_v_version_egg_id_media_id_fk" FOREIGN KEY ("version_egg_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "dofus_guides_egg_idx" ON "dofus_guides" USING btree ("egg_id");
  CREATE INDEX "_dofus_guides_v_version_version_egg_idx" ON "_dofus_guides_v" USING btree ("version_egg_id");`)
  await db.execute(AMBIENCE_FROM_LEGACY)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "achievement_pages_prerequisites" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "achievement_pages_prerequisites_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_achievement_pages_v_version_prerequisites" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_achievement_pages_v_version_prerequisites_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "checklists_soul_overrides" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "checklists_soul_overrides_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_checklists_v_version_soul_overrides" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_checklists_v_version_soul_overrides_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "achievement_pages_prerequisites" CASCADE;
  DROP TABLE "achievement_pages_prerequisites_locales" CASCADE;
  DROP TABLE "_achievement_pages_v_version_prerequisites" CASCADE;
  DROP TABLE "_achievement_pages_v_version_prerequisites_locales" CASCADE;
  DROP TABLE "checklists_soul_overrides" CASCADE;
  DROP TABLE "checklists_soul_overrides_locales" CASCADE;
  DROP TABLE "_checklists_v_version_soul_overrides" CASCADE;
  DROP TABLE "_checklists_v_version_soul_overrides_locales" CASCADE;
  ALTER TABLE "dofus_guides" DROP CONSTRAINT "dofus_guides_egg_id_media_id_fk";
  
  ALTER TABLE "_dofus_guides_v" DROP CONSTRAINT "_dofus_guides_v_version_egg_id_media_id_fk";
  
  DROP INDEX "dofus_guides_egg_idx";
  DROP INDEX "_dofus_guides_v_version_version_egg_idx";
  ALTER TABLE "quest_guides" DROP COLUMN "summary_level";
  ALTER TABLE "quest_guides_locales" DROP COLUMN "summary_zone";
  ALTER TABLE "_quest_guides_v" DROP COLUMN "version_summary_level";
  ALTER TABLE "_quest_guides_v_locales" DROP COLUMN "version_summary_zone";
  ALTER TABLE "dofus_guides" DROP COLUMN "egg_id";
  ALTER TABLE "_dofus_guides_v" DROP COLUMN "version_egg_id";
  ALTER TABLE "checklists" DROP COLUMN "ambience";
  ALTER TABLE "_checklists_v" DROP COLUMN "version_ambience";
  DROP TYPE "public"."enum_checklists_ambience";
  DROP TYPE "public"."enum__checklists_v_version_ambience";`)
}
