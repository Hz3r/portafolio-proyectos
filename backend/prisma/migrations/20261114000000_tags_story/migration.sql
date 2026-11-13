-- Etiquetas propias con icono, enlace al repositorio y bloques de historia.
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iconPath" TEXT,
    "iconKey" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectTag" (
    "projectId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProjectTag_pkey" PRIMARY KEY ("projectId","tagId")
);

CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");
CREATE INDEX "ProjectTag_tagId_idx" ON "ProjectTag"("tagId");

ALTER TABLE "ProjectTag" ADD CONSTRAINT "ProjectTag_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectTag" ADD CONSTRAINT "ProjectTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Conserva las etiquetas de texto que ya existían.
INSERT INTO "Tag" ("id", "name")
SELECT 'tag_' || md5(name), name
FROM (SELECT DISTINCT unnest("tags") AS name FROM "Project") AS existing;

INSERT INTO "ProjectTag" ("projectId", "tagId", "order")
SELECT p."id", 'tag_' || md5(t.name), (t.position - 1)::int
FROM "Project" p, unnest(p."tags") WITH ORDINALITY AS t(name, position)
ON CONFLICT DO NOTHING;

ALTER TABLE "Project" DROP COLUMN "tags",
ADD COLUMN "repoUrl" TEXT,
ADD COLUMN "sections" JSONB NOT NULL DEFAULT '[]';
