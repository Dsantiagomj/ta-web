import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Una guía enlaza una sola misión de DofusDB: la relación hasMany (filas en *_rels) pasa
// a una columna. Antes de borrar las filas, cada guía y cada versión se queda con su
// primera misión (la de menor orden), la única que usaba el relleno. Al revertir, la
// columna vuelve a ser una fila de *_rels.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "quest_guides" ADD COLUMN "quest_id" integer;
  ALTER TABLE "_quest_guides_v" ADD COLUMN "version_quest_id" integer;
  UPDATE "quest_guides" SET "quest_id" = "first"."quests_id"
  FROM (
    SELECT DISTINCT ON ("parent_id") "parent_id", "quests_id" FROM "quest_guides_rels"
    WHERE "path" = 'quests' AND "quests_id" IS NOT NULL
    ORDER BY "parent_id", "order" ASC NULLS LAST, "id"
  ) AS "first"
  WHERE "quest_guides"."id" = "first"."parent_id";
  UPDATE "_quest_guides_v" SET "version_quest_id" = "first"."quests_id"
  FROM (
    SELECT DISTINCT ON ("parent_id") "parent_id", "quests_id" FROM "_quest_guides_v_rels"
    WHERE "path" = 'version.quests' AND "quests_id" IS NOT NULL
    ORDER BY "parent_id", "order" ASC NULLS LAST, "id"
  ) AS "first"
  WHERE "_quest_guides_v"."id" = "first"."parent_id";
  ALTER TABLE "quest_guides_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_quest_guides_v_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "quest_guides_rels" CASCADE;
  DROP TABLE "_quest_guides_v_rels" CASCADE;
  ALTER TABLE "quest_guides" ADD CONSTRAINT "quest_guides_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_quest_guides_v" ADD CONSTRAINT "_quest_guides_v_version_quest_id_quests_id_fk" FOREIGN KEY ("version_quest_id") REFERENCES "public"."quests"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "quest_guides_quest_idx" ON "quest_guides" USING btree ("quest_id");
  CREATE INDEX "_quest_guides_v_version_version_quest_idx" ON "_quest_guides_v" USING btree ("version_quest_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "quest_guides_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"quests_id" integer
  );
  
  CREATE TABLE "_quest_guides_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"quests_id" integer
  );
  
  INSERT INTO "quest_guides_rels" ("order", "parent_id", "path", "quests_id")
  SELECT 1, "id", 'quests', "quest_id" FROM "quest_guides" WHERE "quest_id" IS NOT NULL;
  INSERT INTO "_quest_guides_v_rels" ("order", "parent_id", "path", "quests_id")
  SELECT 1, "id", 'version.quests', "version_quest_id" FROM "_quest_guides_v"
  WHERE "version_quest_id" IS NOT NULL;
  
  ALTER TABLE "quest_guides" DROP CONSTRAINT "quest_guides_quest_id_quests_id_fk";
  
  ALTER TABLE "_quest_guides_v" DROP CONSTRAINT "_quest_guides_v_version_quest_id_quests_id_fk";
  
  DROP INDEX "quest_guides_quest_idx";
  DROP INDEX "_quest_guides_v_version_version_quest_idx";
  ALTER TABLE "quest_guides_rels" ADD CONSTRAINT "quest_guides_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."quest_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quest_guides_rels" ADD CONSTRAINT "quest_guides_rels_quests_fk" FOREIGN KEY ("quests_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_quest_guides_v_rels" ADD CONSTRAINT "_quest_guides_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_quest_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_quest_guides_v_rels" ADD CONSTRAINT "_quest_guides_v_rels_quests_fk" FOREIGN KEY ("quests_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "quest_guides_rels_order_idx" ON "quest_guides_rels" USING btree ("order");
  CREATE INDEX "quest_guides_rels_parent_idx" ON "quest_guides_rels" USING btree ("parent_id");
  CREATE INDEX "quest_guides_rels_path_idx" ON "quest_guides_rels" USING btree ("path");
  CREATE INDEX "quest_guides_rels_quests_id_idx" ON "quest_guides_rels" USING btree ("quests_id");
  CREATE INDEX "_quest_guides_v_rels_order_idx" ON "_quest_guides_v_rels" USING btree ("order");
  CREATE INDEX "_quest_guides_v_rels_parent_idx" ON "_quest_guides_v_rels" USING btree ("parent_id");
  CREATE INDEX "_quest_guides_v_rels_path_idx" ON "_quest_guides_v_rels" USING btree ("path");
  CREATE INDEX "_quest_guides_v_rels_quests_id_idx" ON "_quest_guides_v_rels" USING btree ("quests_id");
  ALTER TABLE "quest_guides" DROP COLUMN "quest_id";
  ALTER TABLE "_quest_guides_v" DROP COLUMN "version_quest_id";`)
}
