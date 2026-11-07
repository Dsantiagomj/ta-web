import { randomBytes } from 'node:crypto'

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// El bloque Paso pierde su título opcional: la página nunca lo enseñó y nada lo lee. Antes
// de borrar las tablas, cada título no vacío pasa a ser el primer bloque de texto de su paso,
// un párrafo con el título en negrita, como lo deja el importador con las marcas «ETAPA n:»
// (stepTitleBlock en scripts/import/squarespace/to-quest-guide.ts). Los bloques del paso
// bajan un puesto. Se hace en la guía y en todas sus versiones; el bloque nuevo de un paso
// lleva el mismo ID en la guía y en sus versiones, como uno guardado desde el panel.
//
// Payload guarda los bloques de un paso en la tabla de cada tipo de bloque, colgados del
// documento (o de la versión) con la ruta del paso: «body.<n>.body», donde n es el puesto
// del paso (_order - 1), y «version.body.<n>.body» en las versiones.

/** Las tablas de los bloques que puede tener un paso dentro (StepBlock.body). */
const STEP_BODY_TABLES = ['rich_text', 'image', 'video', 'callout', 'fight']

/** Un ID de bloque como los de Payload: 24 caracteres hexadecimales, como un ObjectId. */
function blockId(): string {
  const seconds = Math.floor(Date.now() / 1000)
    .toString(16)
    .padStart(8, '0')
  return seconds + randomBytes(8).toString('hex')
}

/** El Lexical de un párrafo con el título en negrita: el mismo que da el importador. */
export function stepTitleContent(title: string) {
  return {
    root: {
      children: [
        {
          children: [
            {
              detail: 0,
              format: 1,
              mode: 'normal',
              style: '',
              text: title,
              type: 'text',
              version: 1,
            },
          ],
          direction: null,
          format: '',
          indent: 0,
          type: 'paragraph',
          version: 1,
          textFormat: 1,
          textStyle: '',
        },
      ],
      direction: null,
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  }
}

type Db = MigrateUpArgs['db']

interface TitledStep {
  /** El ID del paso en la guía; en las versiones, su _uuid (null si no lo tiene). */
  uuid: string | null
  /** La fila de la guía o de la versión de la que cuelgan sus bloques. */
  parent: number
  path: string
  titles: { locale: string; title: string }[]
}

/** Los pasos con algún título no vacío, con la ruta de sus bloques. */
async function titledSteps(db: Db, versions: boolean): Promise<TitledStep[]> {
  const prefix = versions ? '_quest_guides_v' : 'quest_guides'
  const { rows } = await db.execute(sql`
    SELECT ${sql.raw(versions ? 's."_uuid"' : 's."id"')} AS "uuid", s."_parent_id" AS "parent",
      s."_path" || '.' || (s."_order" - 1) || '.body' AS "path",
      l."_locale" AS "locale", btrim(l."title") AS "title"
    FROM ${sql.identifier(`${prefix}_blocks_step`)} s
    JOIN ${sql.identifier(`${prefix}_blocks_step_locales`)} l ON l."_parent_id" = s."id"
    WHERE btrim(coalesce(l."title", '')) <> ''
    ORDER BY s."_parent_id", s."_path", s."_order", l."_locale"`)
  const steps = new Map<string, TitledStep>()
  for (const row of rows as Record<string, string | number>[]) {
    const key = `${row.parent} ${row.path}`
    const step = steps.get(key) ?? {
      uuid: row.uuid == null ? null : String(row.uuid),
      parent: Number(row.parent),
      path: String(row.path),
      titles: [],
    }
    step.titles.push({ locale: String(row.locale), title: String(row.title) })
    steps.set(key, step)
  }
  return [...steps.values()]
}

/** Baja un puesto los bloques del paso y pone el título como su primer bloque de texto. */
async function moveTitles(db: Db, versions: boolean, ids: Map<string, string>): Promise<void> {
  const prefix = versions ? '_quest_guides_v' : 'quest_guides'
  for (const step of await titledSteps(db, versions)) {
    for (const table of STEP_BODY_TABLES) {
      await db.execute(sql`
        UPDATE ${sql.identifier(`${prefix}_blocks_${table}`)} SET "_order" = "_order" + 1
        WHERE "_parent_id" = ${step.parent} AND "_path" = ${step.path}`)
    }
    let id = step.uuid ? ids.get(step.uuid) : undefined
    if (!id) {
      id = blockId()
      if (step.uuid) ids.set(step.uuid, id)
    }
    const richText = sql.identifier(`${prefix}_blocks_rich_text`)
    let parent: string | number = id
    if (versions) {
      const { rows } = await db.execute(sql`
        INSERT INTO ${richText} ("_order", "_parent_id", "_path", "_uuid")
        VALUES (1, ${step.parent}, ${step.path}, ${id}) RETURNING "id"`)
      parent = Number((rows[0] as { id: number }).id)
    } else {
      await db.execute(sql`
        INSERT INTO ${richText} ("_order", "_parent_id", "_path", "id")
        VALUES (1, ${step.parent}, ${step.path}, ${id})`)
    }
    for (const { locale, title } of step.titles) {
      await db.execute(sql`
        INSERT INTO ${sql.identifier(`${prefix}_blocks_rich_text_locales`)}
          ("content", "_locale", "_parent_id")
        VALUES (${JSON.stringify(stepTitleContent(title))}::jsonb, ${locale}, ${parent})`)
    }
  }
}

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  const ids = new Map<string, string>()
  await moveTitles(db, false, ids)
  await moveTitles(db, true, ids)
  await db.execute(sql`
   DROP TABLE "quest_guides_blocks_step_locales" CASCADE;
  DROP TABLE "_quest_guides_v_blocks_step_locales" CASCADE;`)
}

// Al revertir vuelven las tablas del título, vacías: los títulos no se restauran, se quedan
// como primer bloque de texto de su paso.
export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "quest_guides_blocks_step_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_quest_guides_v_blocks_step_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "quest_guides_blocks_step_locales" ADD CONSTRAINT "quest_guides_blocks_step_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quest_guides_blocks_step"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_quest_guides_v_blocks_step_locales" ADD CONSTRAINT "_quest_guides_v_blocks_step_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_quest_guides_v_blocks_step"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "quest_guides_blocks_step_locales_locale_parent_id_unique" ON "quest_guides_blocks_step_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "quest_guides_blocks_step_locales_parent_id_idx" ON "quest_guides_blocks_step_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_quest_guides_v_blocks_step_locales_locale_parent_id_unique" ON "_quest_guides_v_blocks_step_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_quest_guides_v_blocks_step_locales_parent_id_idx" ON "_quest_guides_v_blocks_step_locales" USING btree ("_parent_id");`)
}
