import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "quest_guides_blocks_fight_monsters" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"monster_id" integer,
  	"quantity" numeric DEFAULT 1
  );
  
  CREATE TABLE "quest_guides_blocks_fight" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "_quest_guides_v_blocks_fight_monsters" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"monster_id" integer,
  	"quantity" numeric DEFAULT 1,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_quest_guides_v_blocks_fight" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "items" ADD COLUMN "image_id" integer;
  ALTER TABLE "monsters" ADD COLUMN "image_id" integer;
  ALTER TABLE "quest_guides_blocks_fight_monsters" ADD CONSTRAINT "quest_guides_blocks_fight_monsters_monster_id_monsters_id_fk" FOREIGN KEY ("monster_id") REFERENCES "public"."monsters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "quest_guides_blocks_fight_monsters" ADD CONSTRAINT "quest_guides_blocks_fight_monsters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quest_guides_blocks_fight"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quest_guides_blocks_fight" ADD CONSTRAINT "quest_guides_blocks_fight_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quest_guides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_quest_guides_v_blocks_fight_monsters" ADD CONSTRAINT "_quest_guides_v_blocks_fight_monsters_monster_id_monsters_id_fk" FOREIGN KEY ("monster_id") REFERENCES "public"."monsters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_quest_guides_v_blocks_fight_monsters" ADD CONSTRAINT "_quest_guides_v_blocks_fight_monsters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_quest_guides_v_blocks_fight"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_quest_guides_v_blocks_fight" ADD CONSTRAINT "_quest_guides_v_blocks_fight_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_quest_guides_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "quest_guides_blocks_fight_monsters_order_idx" ON "quest_guides_blocks_fight_monsters" USING btree ("_order");
  CREATE INDEX "quest_guides_blocks_fight_monsters_parent_id_idx" ON "quest_guides_blocks_fight_monsters" USING btree ("_parent_id");
  CREATE INDEX "quest_guides_blocks_fight_monsters_monster_idx" ON "quest_guides_blocks_fight_monsters" USING btree ("monster_id");
  CREATE INDEX "quest_guides_blocks_fight_order_idx" ON "quest_guides_blocks_fight" USING btree ("_order");
  CREATE INDEX "quest_guides_blocks_fight_parent_id_idx" ON "quest_guides_blocks_fight" USING btree ("_parent_id");
  CREATE INDEX "quest_guides_blocks_fight_path_idx" ON "quest_guides_blocks_fight" USING btree ("_path");
  CREATE INDEX "_quest_guides_v_blocks_fight_monsters_order_idx" ON "_quest_guides_v_blocks_fight_monsters" USING btree ("_order");
  CREATE INDEX "_quest_guides_v_blocks_fight_monsters_parent_id_idx" ON "_quest_guides_v_blocks_fight_monsters" USING btree ("_parent_id");
  CREATE INDEX "_quest_guides_v_blocks_fight_monsters_monster_idx" ON "_quest_guides_v_blocks_fight_monsters" USING btree ("monster_id");
  CREATE INDEX "_quest_guides_v_blocks_fight_order_idx" ON "_quest_guides_v_blocks_fight" USING btree ("_order");
  CREATE INDEX "_quest_guides_v_blocks_fight_parent_id_idx" ON "_quest_guides_v_blocks_fight" USING btree ("_parent_id");
  CREATE INDEX "_quest_guides_v_blocks_fight_path_idx" ON "_quest_guides_v_blocks_fight" USING btree ("_path");
  ALTER TABLE "items" ADD CONSTRAINT "items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "monsters" ADD CONSTRAINT "monsters_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "items_image_idx" ON "items" USING btree ("image_id");
  CREATE INDEX "monsters_image_idx" ON "monsters" USING btree ("image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "quest_guides_blocks_fight_monsters" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "quest_guides_blocks_fight" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_quest_guides_v_blocks_fight_monsters" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_quest_guides_v_blocks_fight" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "quest_guides_blocks_fight_monsters" CASCADE;
  DROP TABLE "quest_guides_blocks_fight" CASCADE;
  DROP TABLE "_quest_guides_v_blocks_fight_monsters" CASCADE;
  DROP TABLE "_quest_guides_v_blocks_fight" CASCADE;
  ALTER TABLE "items" DROP CONSTRAINT "items_image_id_media_id_fk";
  
  ALTER TABLE "monsters" DROP CONSTRAINT "monsters_image_id_media_id_fk";
  
  DROP INDEX "items_image_idx";
  DROP INDEX "monsters_image_idx";
  ALTER TABLE "items" DROP COLUMN "image_id";
  ALTER TABLE "monsters" DROP COLUMN "image_id";`)
}
