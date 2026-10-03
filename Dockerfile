# Imagen de CertiChain (API + worker). Pensada para staging (Dokploy),
# donde la base es PostgreSQL. En local/CI se sigue usando SQLite con
# `pnpm start:dev` / `pnpm test` (sin Docker).

FROM node:22-slim AS base
WORKDIR /app
# Prisma necesita openssl en Debian slim.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable

# --- Dependencias ---
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# --- Código + build ---
COPY . .
# En el contenedor la base es PostgreSQL: cambiamos el provider de Prisma
# (en el repo queda "sqlite" para el desarrollo local).
RUN sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
RUN pnpm exec prisma generate
RUN pnpm build

ENV NODE_ENV=production
ENV DB_PROVIDER=postgresql
EXPOSE 3000

# Por defecto arranca la API; el worker usa el mismo image con otro command.
# `prisma db push` crea/sincroniza las tablas en Postgres al arrancar.
CMD ["sh", "-c", "pnpm exec prisma db push --skip-generate --accept-data-loss && node dist/main.js"]
