import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "achievements_objectives" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "achievements_objectives_locales" (
  	"name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  ALTER TABLE "achievements_locales" ADD COLUMN "description" varchar;
  ALTER TABLE "achievements_objectives" ADD CONSTRAINT "achievements_objectives_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "achievements_objectives_locales" ADD CONSTRAINT "achievements_objectives_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."achievements_objectives"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "achievements_objectives_order_idx" ON "achievements_objectives" USING btree ("_order");
  CREATE INDEX "achievements_objectives_parent_id_idx" ON "achievements_objectives" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "achievements_objectives_locales_locale_parent_id_unique" ON "achievements_objectives_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "achievements_objectives_locales_parent_id_idx" ON "achievements_objectives_locales" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "achievements_objectives" CASCADE;
  DROP TABLE "achievements_objectives_locales" CASCADE;
  ALTER TABLE "achievements_locales" DROP COLUMN "description";`)
}
