# Portafolio de proyectos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sitio público de proyectos (Astro), API (Hono + Prisma + Postgres) y panel de administración (Next.js), listos para Railway.

**Architecture:** Tres carpetas independientes. `backend` es el único que toca Postgres y el bucket S3; `frontend` y `admin` le hablan por HTTP. El navegador del admin sube archivos directo al bucket con URL firmada.

**Tech Stack:** Node 22, TypeScript, Hono, Prisma 7, Zod, Vitest, argon2, jose, AWS SDK S3 · Astro 7 (SSR, adaptador Node), React 19, Tailwind 4, Motion · Next.js 16 (App Router).

**Spec:** `docs/superpowers/specs/2026-11-13-portafolio-design.md`

## Global Constraints

- Sin monorepo: `frontend/`, `backend/`, `admin/`, cada una con su `package.json`; nada compartido por import.
- Rutas públicas devuelven solo `status = PUBLISHED`, ordenadas por `order` ascendente.
- Subidas: jpg, png, webp, avif, gif, mp4, webm; imagen ≤ 15 MB, video ≤ 500 MB.
- JWT caduca en 7 días; contraseña con argon2.
- Paleta: fondo `#08080C`, superficie `#12121A`, borde `#22222E`, texto `#EDEDF2`, secundario `#8A8A99`, acento `#9EFF5A`.
- Fuente pixel solo en números, etiquetas y rótulos cortos; texto en Geist/Inter.
- Móvil primero; respetar `prefers-reduced-motion`.
- Interfaz en español.

## Review Focus

1. Borrador pedido por slug en la ruta pública → 404, nunca datos. (Tarea 2)
2. Token ausente, mal formado o caducado en `/admin/*` → 401. (Tarea 2)
3. Dos proyectos con el mismo título → slugs distintos (`titulo`, `titulo-2`); título con acentos/emoji → slug ASCII no vacío. (Tarea 2)
4. Presign con tipo no permitido o tamaño sobre el límite → 400. (Tarea 3)
5. Backend caído o lista vacía → el sitio muestra un estado vacío con estilo, no un error 500. (Tarea 4)

---

### Task 1: backend — base, esquema y auth

**Files:** `backend/package.json`, `tsconfig.json`, `prisma/schema.prisma`, `prisma.config.ts`, `prisma/seed.ts`, `src/env.ts`, `src/db.ts`, `src/app.ts`, `src/server.ts`, `src/auth.ts`, `src/routes/auth.ts`, `test/helpers.ts`, `test/auth.test.ts`, `docker-compose.yml`, `.env.example`

**Interfaces — Produces:**
- Modelos `Project`, `Media`, `AdminUser` tal como el spec; enums `ProjectStatus { DRAFT PUBLISHED }`, `MediaType { IMAGE VIDEO EMBED }`.
- `createApp(deps: { prisma: PrismaClient; storage: Storage }): Hono`
- `signToken(userId: string): Promise<string>`, middleware `requireAdmin`.
- `POST /auth/login {email,password}` → `200 {token}` | `401`; máx. 10 intentos por IP cada 15 min → `429`.
- `GET /health` → `{ok:true}`.

- [ ] Tests: login correcto devuelve token; contraseña mala 401; `/admin/projects` sin token 401, con token basura 401.
- [ ] Implementar, correr `npm test`, commit.

### Task 2: backend — proyectos

**Files:** `src/slug.ts`, `src/serialize.ts`, `src/routes/public.ts`, `src/routes/admin-projects.ts`, `test/projects.test.ts`, `test/slug.test.ts`

**Interfaces — Produces:**
- `slugify(title: string): string` (ASCII, minúsculas, guiones; vacío → `"proyecto"`), `uniqueSlug(prisma, base, excludeId?)`.
- JSON de proyecto: `{id, slug, title, summary, description, url, status, tags, year, order, cover: Media|null, media: Media[]}`; JSON de medio: `{id, type, url, posterUrl, embedUrl, alt, width, height, order}`.
- `GET /projects`, `GET /projects/:slug`.
- `GET/POST /admin/projects`, `GET/PATCH/DELETE /admin/projects/:id`, `PATCH /admin/projects/reorder {ids: string[]}`.

- [ ] Tests: lista pública excluye borradores y respeta `order`; slug de borrador 404; slugs duplicados reciben sufijo; acentos/emoji; reorder; delete borra medios y llama `storage.remove`.
- [ ] Implementar, `npm test`, commit.

### Task 3: backend — archivos

**Files:** `src/storage.ts`, `src/routes/admin-media.ts`, `src/routes/media.ts`, `test/media.test.ts`

**Interfaces — Produces:**
- `interface Storage { presignUpload(key, contentType, size): Promise<string>; publicUrl(key): string; presignRead(key): Promise<string>; remove(keys: string[]): Promise<void> }`; `createS3Storage(env)`; fake en memoria para tests.
- `POST /admin/uploads/presign {filename, contentType, size}` → `{key, uploadUrl}`.
- `POST /admin/projects/:id/media {type, key?, embedUrl?, posterKey?, alt?, width?, height?}`; `PATCH /admin/media/:id {alt?, posterKey?}`; `PATCH /admin/projects/:id/media/reorder {ids}`; `DELETE /admin/media/:id`.
- `GET /media/*` → 302 a URL firmada de lectura (se usa cuando `S3_PUBLIC_URL` no está definido).

- [ ] Tests: presign rechaza `application/pdf` y imagen de 16 MB; acepta mp4 de 100 MB; EMBED exige URL de YouTube/Vimeo; delete llama `storage.remove`.
- [ ] Implementar, `npm test`, commit.

### Task 4: frontend — sitio

**Files:** `frontend/package.json`, `astro.config.mjs`, `src/styles/global.css`, `src/lib/api.ts`, `src/layouts/Base.astro`, `src/pages/index.astro`, `src/pages/p/[slug].astro`, `src/pages/404.astro`, `src/components/{ProjectGrid,ProjectCard,Gallery,Lightbox,Boot}.tsx`, `.env.example`

**Interfaces — Consumes:** `GET /projects`, `GET /projects/:slug`, JSON de Tarea 2. Variables `API_URL`, `SITE_HANDLE`, `SITE_TAGLINE`.

- [ ] Tokens de color y fuentes en `global.css` según Global Constraints.
- [ ] Portada: encabezado mínimo, filtro por etiquetas, cuadrícula con entrada escalonada, cursor `▶`, etiqueta "Privado" si `url` es nulo.
- [ ] Detalle: galería + visor deslizable, videos (archivo y embed), Markdown, anterior/siguiente.
- [ ] `getProjects()` devuelve `[]` si el backend falla; estado vacío con estilo. 404 "GAME OVER".
- [ ] Verificar con backend real y captura de pantalla a 390 px y 1280 px; commit.

### Task 5: admin — panel

**Files:** `admin/package.json`, `src/lib/{api,session}.ts`, `src/proxy.ts`, `src/app/login/page.tsx`, `src/app/(panel)/page.tsx`, `src/app/(panel)/projects/[id]/page.tsx`, `src/app/actions.ts`, `src/components/{ProjectList,ProjectForm,MediaManager}.tsx`, `.env.example`

**Interfaces — Consumes:** todas las rutas `/auth` y `/admin/*`. Cookie httpOnly `session` con el JWT. Variable `API_URL`.

- [ ] Login → cookie; rutas del panel redirigen a `/login` sin cookie o ante 401.
- [ ] Lista con arrastrar para ordenar e interruptor de publicar.
- [ ] Editor con todos los campos, subida con progreso (PUT a URL firmada), reordenar, portada, alt, embed, borrar con confirmación.
- [ ] Verificar flujo completo en navegador contra backend real; commit.

### Task 6: despliegue y documentación

**Files:** `README.md`, `*/railway.json`, `.gitignore`

- [ ] `railway.json` por carpeta (build/start; backend corre `prisma migrate deploy` y seed antes de arrancar).
- [ ] README: desarrollo local y despliegue en Railway paso a paso con variables.
- [ ] Commit.
