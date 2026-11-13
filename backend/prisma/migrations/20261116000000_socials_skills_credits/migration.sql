-- Redes sociales, habilidades y créditos por proyecto.
ALTER TABLE "SiteSettings" ADD COLUMN "socials" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "Tag" ADD COLUMN "skill" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "skillGroup" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Project" ADD COLUMN "myRole" TEXT NOT NULL DEFAULT 'AUTHOR',
ADD COLUMN "myRoleNote" TEXT NOT NULL DEFAULT '',
ADD COLUMN "people" JSONB NOT NULL DEFAULT '[]';
