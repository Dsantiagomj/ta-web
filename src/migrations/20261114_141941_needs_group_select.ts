import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// El grupo de cada fila de Necesitarás de las guías de Dofus deja de ser texto libre y pasa a
// la lista fija (src/lib/dofus-guides/need-groups.ts). Los nombres de hoy van a su grupo
// («Combates», «1 x Mazmorra») y el resto, sin nombre incluido, a «otros». La copia de
// importSnapshot cambia igual: si no, la importación creería que Torre tocó Necesitarás en
// todas las guías y no las normalizaría. La regla va copiada aquí a propósito: una migración
// hace siempre lo mismo, aunque la lista de la app cambie después.

const GROUPS = [
  'combates',
  'mazmorras',
  'recursos',
  'equipables',
  'consumibles',
  'oficios',
  'emotes',
  'logros',
  'otros',
] as const

const LABELS: Record<(typeof GROUPS)[number], string> = {
  combates: 'Combates',
  mazmorras: 'Mazmorras',
  recursos: 'Recursos',
  equipables: 'Equipables',
  consumibles: 'Consumibles',
  oficios: 'Oficios',
  emotes: 'Emotes',
  logros: 'Logros',
  otros: 'Otros',
}

const key = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/^\s*\d+\s*[x×]\s+/u, '')
    .replace(/[^a-z\s]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')

/** El grupo de la lista fija para un nombre libre de hoy; «otros» si no es ninguno. */
export function legacyNeedGroup(name: string | null | undefined): (typeof GROUPS)[number] {
  const wanted = key(name ?? '')
  return GROUPS.find((group) => wanted === group || wanted === group.replace(/s$/, '')) ?? 'otros'
}

type Snapshot = { needs?: { groups?: { name?: string | null }[] | null } | null } | null

/** La copia de importSnapshot con los grupos de Necesitarás ya en la lista fija. */
export function snapshotWithGroups<T extends Snapshot>(snapshot: T): T {
  const groups = snapshot?.needs?.groups
  if (!snapshot || !Array.isArray(groups)) return snapshot
  return {
    ...snapshot,
    needs: {
      ...snapshot.needs,
      groups: groups.map((group) => ({ ...group, name: legacyNeedGroup(group.name) })),
    },
  }
}

type Db = MigrateUpArgs['db']

async function mapGroups(db: Db, table: string, locales: string) {
  const { rows } = await db.execute(
    sql.raw(
      `SELECT g."id", l."name" FROM "${table}" g LEFT JOIN "${locales}" l ` +
        `ON l."_parent_id" = g."id" AND l."_locale" = 'es'`,
    ),
  )
  for (const row of rows as { id: string | number; name: string | null }[]) {
    await db.execute(
      sql`UPDATE ${sql.identifier(table)} SET "name" = ${legacyNeedGroup(row.name)}::"enum_dofus_guides_needs_group" WHERE "id" = ${row.id}`,
    )
  }
}

async function mapSnapshots(db: Db, table: string, column: string) {
  const { rows } = await db.execute(
    sql.raw(`SELECT "id", "${column}" AS snapshot FROM "${table}" WHERE "${column}" IS NOT NULL`),
  )
  for (const row of rows as { id: number; snapshot: Snapshot }[]) {
    const next = snapshotWithGroups(row.snapshot)
    if (next === row.snapshot) continue
    await db.execute(
      sql`UPDATE ${sql.identifier(table)} SET ${sql.identifier(column)} = ${JSON.stringify(next)}::jsonb WHERE "id" = ${row.id}`,
    )
  }
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_dofus_guides_needs_group" AS ENUM('combates', 'mazmorras', 'recursos', 'equipables', 'consumibles', 'oficios', 'emotes', 'logros', 'otros');
  ALTER TABLE "dofus_guides_needs_groups" ADD COLUMN "name" "enum_dofus_guides_needs_group";
  ALTER TABLE "_dofus_guides_v_version_needs_groups" ADD COLUMN "name" "enum_dofus_guides_needs_group";`)
  await mapGroups(db, 'dofus_guides_needs_groups', 'dofus_guides_needs_groups_locales')
  await mapGroups(
    db,
    '_dofus_guides_v_version_needs_groups',
    '_dofus_guides_v_version_needs_groups_locales',
  )
  await mapSnapshots(db, 'dofus_guides', 'import_snapshot')
  await mapSnapshots(db, '_dofus_guides_v', 'version_import_snapshot')
  await db.execute(sql`
  DROP TABLE "dofus_guides_needs_groups_locales" CASCADE;
  DROP TABLE "_dofus_guides_v_version_needs_groups_locales" CASCADE;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "dofus_guides_needs_groups_locales" (
  	"name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );

  CREATE TABLE "_dofus_guides_v_version_needs_groups_locales" (
  	"name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );

  ALTER TABLE "dofus_guides_needs_groups_locales" ADD CONSTRAINT "dofus_guides_needs_groups_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."dofus_guides_needs_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_dofus_guides_v_version_needs_groups_locales" ADD CONSTRAINT "_dofus_guides_v_version_needs_groups_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_dofus_guides_v_version_needs_groups"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "dofus_guides_needs_groups_locales_locale_parent_id_unique" ON "dofus_guides_needs_groups_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "dofus_guides_needs_groups_locales_parent_id_idx" ON "dofus_guides_needs_groups_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_dofus_guides_v_version_needs_groups_locales_locale_parent_i" ON "_dofus_guides_v_version_needs_groups_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_dofus_guides_v_version_needs_groups_locales_parent_id_idx" ON "_dofus_guides_v_version_needs_groups_locales" USING btree ("_parent_id");`)
  // Vuelta atrás: cada grupo con su nombre en español como texto libre.
  for (const [table, locales] of [
    ['dofus_guides_needs_groups', 'dofus_guides_needs_groups_locales'],
    ['_dofus_guides_v_version_needs_groups', '_dofus_guides_v_version_needs_groups_locales'],
  ] as const) {
    for (const group of GROUPS) {
      await db.execute(
        sql.raw(
          `INSERT INTO "${locales}" ("name", "_locale", "_parent_id") ` +
            `SELECT '${LABELS[group]}', 'es', "id" FROM "${table}" WHERE "name" = '${group}'`,
        ),
      )
    }
  }
  await db.execute(sql`
  ALTER TABLE "dofus_guides_needs_groups" DROP COLUMN "name";
  ALTER TABLE "_dofus_guides_v_version_needs_groups" DROP COLUMN "name";
  DROP TYPE "public"."enum_dofus_guides_needs_group";`)
}
