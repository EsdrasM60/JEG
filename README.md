# JEG

Aplicación web para gestionar mantenimiento del salón del reino: usuarios con roles, tareas, plan semanal, subida de fotos y colaboración.

## Tecnologías

- Next.js (App Router) + TypeScript
- Tailwind CSS
- NextAuth (Credentials)
- SQLite (better-sqlite3)
- SWR, Zod, Nodemailer

## Requisitos

- Node.js 18+
- npm

## Configuración rápida

1. Copia variables de entorno:

    ```bash
    cp .env.example .env.local
    # Edita .env.local con tus valores
    ```

2. Instala dependencias e inicia:

    ```bash
    npm install
    npm run dev
    # http://localhost:3000
    ```

## Usuarios de prueba

- ADMIN: usa `ADMIN_EMAIL` y `ADMIN_PASSWORD` definidos en `.env.local` (se crean al levantar la app si no existen).
- Nuevos registros requieren aprobación de ADMIN/COORDINADOR.

## Scripts útiles

```bash
npm run build      # build de producción
npm start          # server de producción
npm run pm2:start:dev  # PM2 dev
npm run pm2:start      # PM2 prod
npm run pm2:logs       # logs PM2
npm run tunnel         # Cloudflare tunnel → URL pública
```

## Healthcheck

- GET `/api/health` → { status: "ok", db: true, time }

## Deploy en Render

- Archivo `render.yaml` listo.
- En Render configura las env vars: NEXTAUTH_URL, NEXTAUTH_SECRET, ADMIN_EMAIL/PASSWORD o HASH, SMTP_*

## Páginas

- `/` landing
- `/signin`, `/register`
- `/dashboard`
- `/usuarios` (gestión: crear, aprobar, editar, roles, eliminar)
- `/voluntarios`
- `/tareas`, `/plan-semanal`, `/fotos`, `/actividad` (en progreso)

## Estructura

- `src/app/*` páginas y API routes
- `src/components/*` UI
- `src/lib/*` auth, sqlite, etc.

## Notas

- Sidebar con overlay; botón Salir abajo. Saludo solo en barra superior.
- Si hay error de hidratación, fuerza refresh (Shift+Reload). Si persiste, borra `.next` y reinicia.
