import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"og_image_id" integer,
  	"socials_twitch_url" varchar DEFAULT 'https://www.twitch.tv/torrentearcano',
  	"socials_kick_url" varchar DEFAULT 'https://kick.com/torretv',
  	"socials_youtube_url" varchar DEFAULT 'https://www.youtube.com/@TorrenteArcano',
  	"socials_discord_url" varchar DEFAULT 'https://discord.gg/wgCxwd7b3r',
  	"socials_kofi_url" varchar DEFAULT 'https://ko-fi.com/torrentearcano',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "site_settings_locales" (
  	"name" varchar DEFAULT 'Torrente Arcano',
  	"description" varchar DEFAULT 'Guías de misiones, logros, clases y checklists de Dofus.',
  	"footer_bio" varchar DEFAULT 'Juega a Dofus en directo y escribe todas las guías de esta web.',
  	"footer_live_title" varchar DEFAULT 'Directos en Twitch y en Kick',
  	"footer_live_text" varchar DEFAULT 'Si sigues el canal, Twitch te avisa cuando empieza.',
  	"footer_discord_title" varchar DEFAULT 'Únete al Discord',
  	"footer_discord_text" varchar DEFAULT 'Dudas de misiones y avisos de directos.',
  	"footer_kofi_title" varchar DEFAULT 'Apoya en Ko-fi',
  	"footer_kofi_text" varchar DEFAULT 'Las guías son gratis. Invita a Torre a un café.',
  	"footer_disclaimer" varchar DEFAULT 'Dofus es un MMORPG publicado por Ankama. Torrente Arcano es una página web no oficial y no está afiliada ni asociada con Ankama. Algunas ilustraciones y contenidos son propiedad de Ankama y de Dofus.',
  	"socials_twitch_handle" varchar DEFAULT 'torrentearcano',
  	"socials_kick_handle" varchar DEFAULT 'torretv',
  	"socials_youtube_handle" varchar DEFAULT '@TorrenteArcano',
  	"socials_discord_handle" varchar DEFAULT 'discord.gg/wgCxwd7b3r',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "index_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "index_texts_locales" (
  	"home_eyebrow" varchar DEFAULT 'Guías de Dofus en español',
  	"home_title" varchar DEFAULT 'Torrente Arcano',
  	"home_lead" varchar DEFAULT 'Misiones, logros y Dofus explicados paso a paso, con capturas y coordenadas para copiar en el chat.',
  	"home_question" varchar DEFAULT '¿Qué misión estás haciendo?',
  	"home_areas_title" varchar DEFAULT 'Qué vas a encontrar',
  	"home_areas_quests_text" varchar DEFAULT 'Búscalas por nombre, zona o historia, de Astrub al Selocalipsis.',
  	"home_areas_dofus_text" varchar DEFAULT 'Lo que pide cada Dofus y las misiones del logro que lo da, cada una con su guía.',
  	"home_areas_checklists_text" varchar DEFAULT 'Marca lo hecho y ve lo que falta.',
  	"home_areas_classes_text" varchar DEFAULT 'Los equipos de cada clase para PvM y para PvP, uno por elemento.',
  	"home_areas_dungeons_text" varchar DEFAULT 'Las mazmorras explicadas por Torre: qué hace cada monstruo y cómo vencer al jefe.',
  	"home_tour_title" varchar DEFAULT 'Una guía para cada misión',
  	"home_tour_lead" varchar DEFAULT 'Hechas para seguirlas con el juego abierto al lado. Así es una por dentro.',
  	"home_tour_step1_title" varchar DEFAULT 'Lo que hace falta, arriba del todo',
  	"home_tour_step1_text" varchar DEFAULT 'Quién da la misión y dónde, los prerrequisitos, lo que vas a necesitar y las recompensas, con los iconos del juego.',
  	"home_tour_step2_title" varchar DEFAULT 'Coordenadas que se copian',
  	"home_tour_step2_text" varchar DEFAULT 'Un clic copia el /travel; lo pegas en el chat y el autopiloto te lleva.',
  	"home_tour_step3_title" varchar DEFAULT 'Una captura en cada paso',
  	"home_tour_step3_text" varchar DEFAULT 'Grande, para reconocer el sitio y el diálogo. Se abre a pantalla completa.',
  	"home_tour_step4_title" varchar DEFAULT 'Los consejos de Torre',
  	"home_tour_step4_text" varchar DEFAULT 'En los combates difíciles, a quién atacar primero y qué evitar.',
  	"home_tour_more" varchar DEFAULT 'Ver las misiones y logros',
  	"home_checklists_title" varchar DEFAULT 'Checklists para ir a por tu Dofus',
  	"home_checklists_lead" varchar DEFAULT 'Para los Dofus más largos, paso a paso. Sin cuenta: el progreso se guarda en tu navegador.',
  	"home_author_title" varchar DEFAULT 'Las guías son de Torre',
  	"home_author_lead" varchar DEFAULT 'Torre juega a Dofus en directo y escribe todas las guías de esta web.',
  	"home_author_join" varchar DEFAULT 'Únete al Discord de la comunidad',
  	"home_author_join_text" varchar DEFAULT 'Para resolver dudas de misiones y enterarte de los directos.',
  	"home_author_offline_title" varchar DEFAULT 'Ahora no está en directo.',
  	"home_author_offline_text" varchar DEFAULT 'Emite en Twitch y en Kick; si sigues el canal, Twitch te avisa cuando empiece.',
  	"metalogros_title" varchar DEFAULT 'Todos los metalogros',
  	"metalogros_lead" varchar DEFAULT 'Busca una zona, un logro o una misión, o elige una zona para ver sus logros.',
  	"metalogros_seo_title" varchar DEFAULT 'Todos los metalogros de Dofus',
  	"metalogros_seo_description" varchar DEFAULT 'Los metalogros de Dofus por zona, con sus logros y sus misiones en orden. Busca una zona, un logro o una misión.',
  	"dofus_guides_eyebrow" varchar DEFAULT 'Misiones y logros de cada Dofus',
  	"dofus_guides_title" varchar DEFAULT 'Guías de Dofus',
  	"dofus_guides_seo_title" varchar DEFAULT 'Guías de Dofus',
  	"dofus_guides_seo_description" varchar DEFAULT 'Las guías de Torre para conseguir cada Dofus: qué pide, qué logros y misiones lo dan y en qué orden hacerlos.',
  	"checklists_eyebrow" varchar DEFAULT 'Paso a paso hasta tu Dofus',
  	"checklists_title" varchar DEFAULT 'Checklists',
  	"checklists_lead" varchar DEFAULT 'Marca lo hecho y ve lo que falta, de la primera misión al Dofus. Sin cuenta: el progreso se guarda en tu navegador.',
  	"checklists_empty" varchar DEFAULT 'Todavía no hay checklists publicadas. Vuelve pronto: Torre está preparando la primera.',
  	"checklists_seo_title" varchar DEFAULT 'Checklists de Dofus',
  	"checklists_seo_description" varchar DEFAULT 'Las checklists de Torre para conseguir cada Dofus paso a paso: marca lo hecho y ve lo que falta.',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_og_image_id_media_id_fk" FOREIGN KEY ("og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_locales" ADD CONSTRAINT "site_settings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "index_texts_locales" ADD CONSTRAINT "index_texts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."index_texts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "site_settings_og_image_idx" ON "site_settings" USING btree ("og_image_id");
  CREATE UNIQUE INDEX "site_settings_locales_locale_parent_id_unique" ON "site_settings_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_settings_locales_parent_id_idx" ON "site_settings_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "index_texts_locales_locale_parent_id_unique" ON "index_texts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "index_texts_locales_parent_id_idx" ON "index_texts_locales" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "site_settings" CASCADE;
  DROP TABLE "site_settings_locales" CASCADE;
  DROP TABLE "index_texts" CASCADE;
  DROP TABLE "index_texts_locales" CASCADE;`)
}
