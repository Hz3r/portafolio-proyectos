# Portafolio de proyectos — Diseño

Fecha: 2026-11-13

## Intención

Un sitio que se pone como enlace en Instagram. Quien entra ve directamente
todos los proyectos, con algo de contexto de cada uno. No es una carta de
presentación: no hay sección "quién soy".

## Metas

- La portada es la lista de proyectos. Nada antes.
- Cada proyecto tiene título, descripción, galería de imágenes, videos y un
  enlace opcional.
- Un panel de administración para crear, editar, ordenar, publicar y ocultar
  proyectos, y subir sus imágenes y videos.
- Estilo oscuro, retro de videojuego pero fino tipo Apple, con animaciones y
  una paleta definida.
- Se ve primero en celular (el tráfico llega desde Instagram).

## Fuera de alcance

- Sección "sobre mí", blog, formulario de contacto.
- Varios usuarios o roles en el panel (hay un solo administrador).
- Varios idiomas, analítica, comentarios.

## Qué lo haría fracasar aunque funcione

- Que parezca una plantilla de portafolio clásica con hero de presentación.
- Que lo retro se vea tosco o infantil (pixel art pesado, colores chillones).
- Que cargue lento o se vea mal en celular.
- Que un proyecto oculto se pueda ver desde el sitio público o la API pública.

## Enfoques considerados

- **A. Sitio en vivo + bucket de Railway (elegido).** El sitio lee los datos en
  cada visita; los cambios del panel aparecen al instante. Archivos en un
  bucket compatible con S3, subidos directo desde el navegador.
- **B. Sitio estático que se reconstruye.** Más rápido de cargar, pero cada
  cambio tarda minutos y añade una pieza frágil. Descartado.
- **C. Archivos en un volumen de Railway.** Más simple, pero los videos pasan
  por el servidor y el volumen queda atado a un servicio. Descartado.

Elegido A por el usuario, con una condición suya: **no monorepo**. Tres
carpetas independientes: `frontend`, `backend`, `admin`.

## Decisiones del usuario

- Sitio público: Astro + React + Tailwind.
- Panel: Next.js.
- Base de datos: PostgreSQL con Prisma.
- Todo desplegado en Railway.
- Carpetas separadas `frontend/`, `backend/`, `admin/`, cada una con su propio
  `package.json` (sin workspaces ni paquetes compartidos).

## Arquitectura

```
Instagram ─▶ frontend (Astro SSR) ──HTTP──▶ backend (API + Prisma) ──▶ Postgres
                                              ▲            │
             admin (Next.js) ─────HTTP────────┘            └──▶ Bucket (S3)
             navegador del admin ──subida directa con URL firmada──▶ Bucket
```

Cuatro servicios en Railway (frontend, backend, admin, Postgres) más un bucket.
Solo `backend` toca la base de datos y firma subidas.

### backend/ (decisión mía)

Node + TypeScript + Hono + Prisma + Zod. Es el único dueño del esquema.

Modelo de datos:

- **Project**: `id`, `slug` (único), `title`, `summary` (una línea para la
  tarjeta), `description` (Markdown), `url` (opcional), `status`
  (`DRAFT` | `PUBLISHED`), `tags` (lista de textos), `year` (opcional),
  `order` (entero), `coverMediaId` (opcional), `createdAt`, `updatedAt`.
- **Media**: `id`, `projectId`, `type` (`IMAGE` | `VIDEO` | `EMBED`), `key`
  (ruta en el bucket, vacío en `EMBED`), `embedUrl` (YouTube/Vimeo, solo
  `EMBED`), `posterKey` (opcional, para video), `alt`, `width`, `height`,
  `order`. Borrar un proyecto borra sus medios y sus archivos del bucket.
- **AdminUser**: `id`, `email`, `passwordHash` (argon2). Se crea con un script
  de seed a partir de `ADMIN_EMAIL` y `ADMIN_PASSWORD`.

"No todos los proyectos son públicos" se cubre con dos cosas independientes:
`status` decide si aparece en el sitio; `url` vacío hace que se muestre con
etiqueta "Privado" en vez del botón de visitar.

Rutas públicas (solo `PUBLISHED`, ordenadas por `order`):

- `GET /projects` — lista con portada, resumen, etiquetas.
- `GET /projects/:slug` — detalle con todos los medios. 404 si es borrador.

Rutas de administración (requieren `Authorization: Bearer <JWT>`):

- `POST /auth/login` → JWT (caduca en 7 días). Límite de intentos.
- `GET/POST /admin/projects`, `GET/PATCH/DELETE /admin/projects/:id`
- `PATCH /admin/projects/reorder` — recibe la lista de ids en orden.
- `POST /admin/uploads/presign` — devuelve URL firmada de subida; valida tipo
  (jpg, png, webp, avif, gif, mp4, webm) y tamaño (imagen ≤ 15 MB, video ≤
  500 MB).
- `POST/PATCH/DELETE /admin/projects/:id/media` — registrar, reordenar, borrar.

Entrega de archivos: las respuestas llevan URLs completas de cada medio. Si el
bucket no permite lectura pública, `GET /media/*` redirige a una URL firmada de
lectura. El constructor verifica cuál aplica en Railway.

Pruebas: Vitest sobre las rutas, con énfasis en que los borradores nunca salen
por rutas públicas y que las rutas de administración rechazan sin token.

### frontend/ (Astro + React + Tailwind)

Astro con salida de servidor (adaptador Node), `Cache-Control` de 30 s en las
páginas. React solo donde hay interacción (filtro, galería, visor). Animaciones
con Motion y transiciones de vista de Astro. Respeta `prefers-reduced-motion`.

Páginas:

- `/` — encabezado mínimo (nombre o @usuario, una línea de contexto, contador
  de proyectos) y debajo la cuadrícula de proyectos. Filtro por etiquetas.
- `/p/[slug]` — portada, título, año, etiquetas, descripción, galería con
  visor a pantalla completa (deslizable en celular), videos, y al final botón
  "Visitar" o etiqueta "Privado". Navegación a proyecto anterior/siguiente.
- 404 con estilo "GAME OVER".

```
┌──────────────────────────────┐
│ @usuario          12 PROYECTOS│
│ Cosas que he construido.      │
│ [TODOS] [WEB] [APP] [DISEÑO]  │
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │        portada           │ │
│ │                          │ │
│ └──────────────────────────┘ │
│ 01  Nombre del proyecto    ▶ │
│ Resumen en una línea          │
│ WEB · 2026          🔒PRIVADO │
│ ┌──────────────────────────┐ │
│ │        portada           │ │
```

En escritorio la cuadrícula pasa a 2–3 columnas.

### Estilo visual (propuesta mía, a aprobar)

Idea: una consola de lujo. La estructura y el espacio son de Apple; los
detalles pequeños son de videojuego.

- **Color**: fondo `#08080C`, superficies `#12121A`, bordes `#22222E`, texto
  `#EDEDF2`, texto secundario `#8A8A99`. Un solo acento: **verde fósforo
  `#9EFF5A`**, usado con moderación (selección, estados, enlaces, brillo).
- **Tipografía**: una fuente pixel fina (Pixelify Sans o Silkscreen) solo para
  números, etiquetas y rótulos cortos en mayúsculas; Geist/Inter para títulos y
  texto. Nada de párrafos en fuente pixel.
- **Detalles retro**: numeración tipo nivel (`01`, `02`), cursor `▶` que
  aparece al seleccionar una tarjeta como en un menú de juego, esquinas con
  muesca pixelada, cursor parpadeante en el encabezado, líneas de escaneo y
  grano muy tenues en el fondo.
- **Animación**: entrada escalonada de tarjetas, portada que crece hacia la
  página de detalle, brillo del acento al pasar o tocar, arranque breve tipo
  "boot" de menos de un segundo solo en la primera visita.

### admin/ (Next.js, App Router)

Habla solo con `backend`. Tras el login guarda el JWT en una cookie httpOnly
del dominio del panel; las llamadas al backend salen desde el servidor de Next.
La única llamada directa del navegador a otro lado es la subida al bucket con
la URL firmada.

Pantallas:

- **Login.**
- **Proyectos**: lista con portada, estado (publicado/borrador), arrastrar para
  ordenar, interruptor rápido de publicar, botón nuevo.
- **Editor de proyecto**: título, slug (autogenerado, editable), resumen,
  descripción en Markdown con vista previa, enlace, año, etiquetas, estado;
  zona para arrastrar imágenes y videos con barra de progreso, reordenar,
  elegir portada, texto alternativo, añadir video por enlace de YouTube/Vimeo;
  borrar con confirmación.

Mismo tema oscuro y acento que el sitio, más sobrio.

## Despliegue en Railway

Cada carpeta es un servicio con su directorio raíz. Variables:

- backend: `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
  `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`,
  `S3_REGION`, `CORS_ORIGINS`. Arranque: `prisma migrate deploy` y luego el
  servidor.
- frontend: `API_URL`.
- admin: `API_URL`, `SESSION_SECRET`.

Cada carpeta lleva `.env.example` y el README raíz explica el despliegue paso
a paso. `backend/` incluye un `docker-compose.yml` con Postgres y MinIO para
trabajar en local.

## Queda al constructor

- Librería exacta de arrastrar/ordenar y de visor de galería.
- Generación de miniaturas (primera versión: se sirve el original con
  `loading="lazy"` y dimensiones guardadas; optimizar después si hace falta).
- Datos de ejemplo para desarrollo.
