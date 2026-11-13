-- Portafolio completo: contenido de la página, página de inicio y nivel de cada habilidad.
ALTER TABLE "SiteSettings" ADD COLUMN "home" TEXT NOT NULL DEFAULT 'PROJECTS',
ADD COLUMN "portfolio" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "Tag" ADD COLUMN "skillLevel" INTEGER NOT NULL DEFAULT 2;
