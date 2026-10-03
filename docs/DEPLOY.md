# Despliegue (staging con Dokploy)

CertiChain corre con **SQLite en local/CI** y **PostgreSQL + RabbitMQ en staging**.
El mismo código funciona en ambos: los repositorios usan Prisma (agnóstico al
motor) y el publicador de eventos cae a "noop" si no hay `RABBITMQ_URL`.

## Opción A — Compose (recomendada)

En Dokploy: **Create Service → Compose**, apuntando a este repositorio
(`docker-compose.yml`). Levanta 4 contenedores: `app`, `worker`, `postgres`,
`rabbitmq`.

Variables a definir en Dokploy (las sensibles NO van al repo):

| Variable | Valor |
|----------|-------|
| `BETTER_AUTH_SECRET` | secreto aleatorio (32 bytes hex) |
| `BETTER_AUTH_URL` | `https://<tu-dominio-staging>` |
| `POSTGRES_PASSWORD` | una contraseña fuerte |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | de Google Cloud Console |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | de GitHub OAuth Apps |

`DATABASE_URL`, `DB_PROVIDER` y `RABBITMQ_URL` ya vienen resueltas en el compose.

## Opción B — Postgres gestionado por Dokploy

1. **Create Service → Database → PostgreSQL** → copia su URL de conexión interna.
2. **Create Service → Compose** (o Application) para la app, y define
   `DATABASE_URL` con esa URL. Puedes quitar el servicio `postgres` del compose.

## OAuth: redirect URIs del dominio de staging

En Google y GitHub, **además** de las de localhost, agrega:

- Google: `https://<tu-dominio>/api/auth/callback/google`
- GitHub: `https://<tu-dominio>/api/auth/callback/github`

## Cómo crea las tablas en Postgres

El contenedor ejecuta `prisma db push` al arrancar: sincroniza el esquema
(con `provider = postgresql`) contra la base, creando las tablas. No hacen
falta migraciones específicas de Postgres.

## Verificar

- `GET https://<dominio>/` → frontend
- `GET https://<dominio>/api/auth/ok` → `{"ok":true}`
- `GET https://<dominio>/docs` → Swagger
- UI de RabbitMQ (compose): puerto `15672`
- Al emitir/revocar un certificado, el **worker** registra el evento consumido.
