import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Los papeles del panel (docs/research/backlog.md, A-15). Las cuentas que ya existen en dev y
// en producción son de Torre: salen administradoras, para que nadie pierda acceso. Después,
// una cuenta nueva es editora, como dice la colección.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'editor');
  ALTER TABLE "users" ADD COLUMN "role" "enum_users_role" DEFAULT 'admin';
  ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'editor';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" DROP COLUMN "role";
  DROP TYPE "public"."enum_users_role";`)
}
