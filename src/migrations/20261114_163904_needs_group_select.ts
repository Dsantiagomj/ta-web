import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// El grupo de cada fila de Necesitarás de las guías de Dofus deja de ser texto libre y pasa a
// la lista fija (src/lib/dofus-guides/need-groups.ts), sin perder lo que escribió Torre:
// - el nombre de siempre se queda, tal cual, como subtítulo del grupo (la columna de idiomas
//   cambia de nombre, no se borra), y down() lo devuelve;
// - el grupo sale del nombre: «Combates» o «1 x Mazmorra» van a su grupo; lo demás, a «otros»;
// - un grupo sin nombre sigue sin grupo: la página lo deja en su sitio hasta que la
//   importación lo ordene;
// - la copia de importSnapshot cambia igual: si no, la importación creería que Torre tocó
//   Necesitarás en todas las guías y no las ordenaría.
// Antes de escribir, apunta en el registro cada nombre y su grupo. La regla va copiada aquí a
// propósito: una migración hace siempre lo mismo, aunque la lista de la app cambie después.

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

type Group = (typeof GROUPS)[number]

const LABELS: Record<Group, string> = {
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

/** El grupo de la lista para un nombre libre de hoy: «otros» si no es ninguno; null sin nombre. */
export function legacyNeedGroup(name: string | null | undefined): Group | null {
  if (!name?.trim()) return null
  const wanted = key(name)
  return GROUPS.find((group) => wanted === group || wanted === group.replace(/s$/, '')) ?? 'otros'
}

type SnapshotGroup = { name?: string | null; subtitle?: string | null }
type Snapshot = { needs?: { groups?: SnapshotGroup[] | null } | null } | null

function withGroups<T extends Snapshot>(snapshot: T, map: (group: SnapshotGroup) => object): T {
  const groups = snapshot?.needs?.groups
  if (!snapshot || !Array.isArray(groups)) return snapshot
  return { ...snapshot, needs: { ...snapshot.needs, groups: groups.map(map) } }
}

/** La copia de importSnapshot con el grupo de la lista y el nombre de Torre como subtítulo. */
export function snapshotUp<T extends Snapshot>(snapshot: T): T {
  return withGroups(snapshot, ({ name, ...rest }) => {
    const group = legacyNeedGroup(name)
    return group ? { ...rest, name: group, subtitle: name } : rest
  })
}

/** La copia de importSnapshot de antes: el subtítulo vuelve a ser el nombre. */
export function snapshotDown<T extends Snapshot>(snapshot: T): T {
  return withGroups(snapshot, ({ name, subtitle, ...rest }) => {
    const before = subtitle?.trim() ? subtitle : name ? LABELS[name as Group] : null
    return before ? { ...rest, name: before } : rest
  })
}

type Db = MigrateUpArgs['db']
type Logger = MigrateUpArgs['payload']['logger']

const TABLES = [
  {
    groups: 'dofus_guides_needs_groups',
    locales: 'dofus_guides_needs_groups_locales',
    parent: 'dofus_guides',
    slug: 'slug',
  },
  {
    groups: '_dofus_guides_v_version_needs_groups',
    locales: '_dofus_guides_v_version_needs_groups_locales',
    parent: '_dofus_guides_v',
    slug: 'version_slug',
  },
] as const

/** Apunta cada nombre de grupo y el grupo de la lista que le toca, y cuántas veces sale. */
async function logMapping(db: Db, logger: Logger, table: (typeof TABLES)[number]) {
  const { rows } = await db.execute(
    sql.raw(
      `SELECT p."${table.slug}" AS slug, l."name" AS heading, count(*)::int AS count ` +
        `FROM "${table.groups}" g ` +
        `JOIN "${table.parent}" p ON p."id" = g."_parent_id" ` +
        `LEFT JOIN "${table.locales}" l ON l."_parent_id" = g."id" AND l."_locale" = 'es' ` +
        `GROUP BY 1, 2 ORDER BY 1, 2`,
    ),
  )
  for (const row of rows as { slug: string | null; heading: string | null; count: number }[]) {
    const group = legacyNeedGroup(row.heading)
    logger.info(
      `${table.parent} ${row.slug ?? '?'}: «${row.heading ?? '(sin nombre)'}» → ` +
        `${group ?? '(sin grupo, en su sitio)'}${row.count > 1 ? ` (${row.count})` : ''}`,
    )
  }
}

/** Pone el grupo de cada nombre distinto en una sola sentencia por tabla. */
async function mapGroups(db: Db, table: (typeof TABLES)[number]) {
  const { rows } = await db.execute(
    sql.raw(`SELECT DISTINCT "name" FROM "${table.locales}" WHERE "name" IS NOT NULL`),
  )
  const pairs = (rows as { name: string }[]).flatMap(({ name }) => {
    const group = legacyNeedGroup(name)
    return group ? [sql`(${name}, ${group})`] : []
  })
  if (pairs.length === 0) return
  await db.execute(sql`
    UPDATE ${sql.identifier(table.groups)} AS g
    SET "name" = m.grp::"enum_dofus_guides_needs_group"
    FROM ${sql.identifier(table.locales)} AS l
    JOIN (VALUES ${sql.join(pairs, sql`, `)}) AS m(heading, grp) ON l."name" = m.heading
    WHERE l."_parent_id" = g."id" AND l."_locale" = 'es'`)
}

async function mapSnapshots(db: Db, table: string, column: string, map: (s: Snapshot) => Snapshot) {
  const { rows } = await db.execute(
    sql.raw(`SELECT "id", "${column}" AS snapshot FROM "${table}" WHERE "${column}" IS NOT NULL`),
  )
  for (const row of rows as { id: number; snapshot: Snapshot }[]) {
    const next = map(row.snapshot)
    if (next === row.snapshot) continue
    await db.execute(
      sql`UPDATE ${sql.identifier(table)} SET ${sql.identifier(column)} = ${JSON.stringify(next)}::jsonb WHERE "id" = ${row.id}`,
    )
  }
}

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  for (const table of TABLES) await logMapping(db, payload.logger, table)
  await db.execute(sql`
   CREATE TYPE "public"."enum_dofus_guides_needs_group" AS ENUM('combates', 'mazmorras', 'recursos', 'equipables', 'consumibles', 'oficios', 'emotes', 'logros', 'otros');
  ALTER TABLE "dofus_guides_needs_groups" ADD COLUMN "name" "enum_dofus_guides_needs_group";
  ALTER TABLE "_dofus_guides_v_version_needs_groups" ADD COLUMN "name" "enum_dofus_guides_needs_group";
  ALTER TABLE "dofus_guides_locales" ADD COLUMN "needs_note" varchar;
  ALTER TABLE "_dofus_guides_v_locales" ADD COLUMN "version_needs_note" varchar;`)
  for (const table of TABLES) await mapGroups(db, table)
  // El nombre de Torre se queda como subtítulo: la columna cambia de nombre, no se borra.
  await db.execute(sql`
  ALTER TABLE "dofus_guides_needs_groups_locales" RENAME COLUMN "name" TO "subtitle";
  ALTER TABLE "_dofus_guides_v_version_needs_groups_locales" RENAME COLUMN "name" TO "subtitle";`)
  await mapSnapshots(db, 'dofus_guides', 'import_snapshot', snapshotUp)
  await mapSnapshots(db, '_dofus_guides_v', 'version_import_snapshot', snapshotUp)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await mapSnapshots(db, 'dofus_guides', 'import_snapshot', snapshotDown)
  await mapSnapshots(db, '_dofus_guides_v', 'version_import_snapshot', snapshotDown)
  await db.execute(sql`
  ALTER TABLE "dofus_guides_needs_groups_locales" RENAME COLUMN "subtitle" TO "name";
  ALTER TABLE "_dofus_guides_v_version_needs_groups_locales" RENAME COLUMN "subtitle" TO "name";`)
  // Un grupo hecho después, sin subtítulo, vuelve con el nombre en español de su grupo.
  const labels = sql.join(
    GROUPS.map((group) => sql`WHEN ${group} THEN ${LABELS[group]}`),
    sql` `,
  )
  for (const table of TABLES) {
    const label = sql`CASE g."name"::text ${labels} END`
    await db.execute(sql`
      UPDATE ${sql.identifier(table.locales)} AS l SET "name" = ${label}
      FROM ${sql.identifier(table.groups)} AS g
      WHERE l."_parent_id" = g."id" AND l."_locale" = 'es' AND l."name" IS NULL
        AND g."name" IS NOT NULL`)
    await db.execute(sql`
      INSERT INTO ${sql.identifier(table.locales)} ("name", "_locale", "_parent_id")
      SELECT ${label}, 'es', g."id" FROM ${sql.identifier(table.groups)} AS g
      WHERE g."name" IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM ${sql.identifier(table.locales)} AS l
        WHERE l."_parent_id" = g."id" AND l."_locale" = 'es'
      )`)
  }
  await db.execute(sql`
  ALTER TABLE "dofus_guides_needs_groups" DROP COLUMN "name";
  ALTER TABLE "_dofus_guides_v_version_needs_groups" DROP COLUMN "name";
  ALTER TABLE "dofus_guides_locales" DROP COLUMN "needs_note";
  ALTER TABLE "_dofus_guides_v_locales" DROP COLUMN "version_needs_note";
  DROP TYPE "public"."enum_dofus_guides_needs_group";`)
}
