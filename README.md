# Portafolio de proyectos

Un sitio que muestra directamente tus proyectos, con un panel para administrarlos.

| Carpeta     | Qué es                                   | Tecnología                         |
| ----------- | ---------------------------------------- | ---------------------------------- |
| `frontend/` | El sitio público                         | Astro, React, Tailwind             |
| `backend/`  | La API; única parte que toca los datos   | Node, Hono, Prisma, PostgreSQL     |
| `admin/`    | El panel para crear y editar proyectos   | Next.js                            |

Cada carpeta es independiente, con su propio `package.json`. Las imágenes y videos
se guardan en un bucket compatible con S3.

## Cómo funciona

- Un proyecto tiene título, resumen, introducción, enlace opcional, enlace al
  repositorio opcional, año, etiquetas, imágenes y videos (archivos subidos o
  enlaces de YouTube/Vimeo).
- **Publicado / Borrador** decide si aparece en el sitio.
- Un proyecto **sin enlace** se muestra con la etiqueta "Privado".
- El orden del sitio es el orden de la lista del panel (se cambia arrastrando).

### Etiquetas

Se administran en la sección **Etiquetas** del panel. Cada una tiene nombre e
icono: uno prediseñado (Astro, React, Web, Frontend…) o una imagen propia (SVG o
PNG, hasta 1 MB). En el sitio aparecen con su icono y sirven de filtro.

### Historia del proyecto

En la pestaña **Historia** del editor el proyecto se arma con bloques
ordenables. En el sitio cada bloque es un capítulo, con un índice para saltar
entre ellos:

| Bloque        | Para qué                                              |
| ------------- | ----------------------------------------------------- |
| Texto         | Contexto, el reto, cómo se hizo (Markdown)            |
| Galería       | Imágenes y videos elegidos de la pestaña Archivos     |
| Métricas      | Ingresos, usuarios, resultados; una puede destacarse  |
| Flujo         | Cómo funciona, paso a paso                            |
| Documentación | Guías desplegables en Markdown                        |

Si el proyecto tiene algún bloque de galería, solo se muestran los archivos
marcados en ellos. Sin ninguno, todos los archivos aparecen en una galería al final.

### Vista rápida y filtros

Al tocar un proyecto en la portada se abre una vista rápida con sus imágenes,
tecnologías y cifras principales, y un botón para entrar a la historia completa.
Los filtros muestran las etiquetas más usadas; el resto está en "Más filtros",
con buscador.

### Ajustes

En **Ajustes** del panel se edita el perfil del sitio (usuario, descripción y
enlace) y el acceso al panel (correo y contraseña). `ADMIN_EMAIL` y
`ADMIN_PASSWORD` solo se usan para crear el administrador la primera vez;
`SITE_HANDLE`, `SITE_TAGLINE` y `SITE_LINK` solo se usan mientras el perfil esté
vacío.

### Sonido

El sitio tiene un botón de sonido, apagado por defecto. Al encenderlo suena una
música ambiental a bajo volumen y un efecto al tocar enlaces y botones. Todo se
genera en el navegador (Web Audio), sin archivos de audio.

## Desarrollo local

Necesitas Node 22 y Docker.

```bash
# 1. Base de datos y bucket local (Postgres + MinIO)
cd backend
docker compose up -d

# 2. Backend en http://localhost:4000
cp .env.example .env        # completa JWT_SECRET, ADMIN_EMAIL y ADMIN_PASSWORD
npm install
npm run release             # aplica migraciones y crea el administrador inicial
npm run dev

# 3. Sitio en http://localhost:4321
cd ../frontend
cp .env.example .env
npm install
npm run dev

# 4. Panel en http://localhost:3000
cd ../admin
cp .env.example .env.local
npm install
npm run dev
```

Pruebas del backend (usan la base `portafolio_test`; créala una vez con
`docker compose exec postgres createdb -U postgres portafolio_test`):

```bash
cd backend
npm test
```

## Despliegue en Railway

Crea un proyecto en Railway y añade estas cinco piezas.

### 1. PostgreSQL

Añade una base de datos PostgreSQL.

### 2. Bucket

Añade un bucket. Railway te da su endpoint, nombre, región y credenciales.

### 3. Servicio `backend`

Servicio desde este repositorio con **Root Directory** = `backend`. Genera un dominio público.

| Variable               | Valor                                                    |
| ---------------------- | -------------------------------------------------------- |
| `DATABASE_URL`         | `${{Postgres.DATABASE_URL}}`                             |
| `JWT_SECRET`           | Texto aleatorio de 32+ caracteres (`openssl rand -hex 32`) |
| `ADMIN_EMAIL`          | Tu correo para entrar al panel                           |
| `ADMIN_PASSWORD`       | Tu contraseña (8+ caracteres)                            |
| `PUBLIC_API_URL`       | `https://${{RAILWAY_PUBLIC_DOMAIN}}`                     |
| `CORS_ORIGINS`         | URL del panel, por ejemplo `https://admin-xxxx.up.railway.app` |
| `S3_ENDPOINT`          | Endpoint del bucket                                      |
| `S3_BUCKET`            | Nombre del bucket para la API S3 (variable `BUCKET`)     |
| `S3_ACCESS_KEY_ID`     | Access key del bucket                                    |
| `S3_SECRET_ACCESS_KEY` | Secret key del bucket                                    |
| `S3_REGION`            | Región del bucket (o `auto`)                             |

En cada despliegue se aplican las migraciones. El administrador se crea la primera
vez con `ADMIN_EMAIL` y `ADMIN_PASSWORD`; después el correo y la contraseña se
cambian desde **Ajustes** en el panel.

### 4. Servicio `frontend`

**Root Directory** = `frontend`. Genera un dominio público: es el enlace que pondrás en Instagram.

| Variable       | Valor                                         |
| -------------- | --------------------------------------------- |
| `API_URL`      | `https://${{backend.RAILWAY_PUBLIC_DOMAIN}}`  |
| `SITE_HANDLE`  | Lo que aparece arriba, por ejemplo `@tu_usuario` |
| `SITE_TAGLINE` | Una línea de contexto                         |
| `SITE_LINK`    | Opcional: a dónde lleva tocar tu usuario      |

### 5. Servicio `admin`

**Root Directory** = `admin`. Genera un dominio público.

| Variable   | Valor                                        |
| ---------- | -------------------------------------------- |
| `API_URL`  | `https://${{backend.RAILWAY_PUBLIC_DOMAIN}}` |
| `SITE_URL` | URL del sitio público (botón "Ver en el sitio") |

### Sobre los archivos

Los buckets de Railway son privados. El sitio pide cada archivo al backend
(`/media/...`), que redirige a una URL firmada temporal. Al subir, el panel envía
el archivo directo al bucket; si el bucket rechaza la subida desde el navegador
(CORS), lo envía a través del backend automáticamente.
