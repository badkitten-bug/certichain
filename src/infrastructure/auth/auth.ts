import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { twoFactor } from 'better-auth/plugins';
import { PrismaClient } from '@prisma/client';

/**
 * Configuración de Better Auth (autenticación — detalle de infraestructura).
 *
 * Vive fuera del dominio de certificados: usuarios, sesiones y cuentas
 * sociales se guardan en la misma base SQLite vía el adaptador de Prisma,
 * pero el núcleo (Certificate, Institution, reglas) no sabe que esto existe.
 *
 * Expone login social (Google y GitHub) y MFA/2FA por TOTP, compatible
 * con Google Authenticator.
 */

// Carga .env si las variables no están en el entorno (mismo patrón que PrismaService).
if (!process.env.BETTER_AUTH_SECRET || !process.env.DATABASE_URL) {
  const envPath = resolve(process.cwd(), '.env');
  if (existsSync(envPath)) {
    (
      process as NodeJS.Process & { loadEnvFile?: (p: string) => void }
    ).loadEnvFile?.(envPath);
  }
}

const prisma = new PrismaClient();

// Solo se habilita un proveedor social si sus credenciales están presentes,
// así la app arranca aunque todavía no se hayan creado las apps OAuth.
const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  };
}
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  socialProviders.github = {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  };
}

// Motor de BD: sqlite en local/CI, postgresql en el contenedor (staging).
const dbProvider = (process.env.DB_PROVIDER ?? 'sqlite') as 'sqlite' | 'postgresql';

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: dbProvider }),
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET ?? 'dev-secret-cambiar-en-produccion',
  // Login principal: redes sociales. El email/contraseña queda disponible
  // como alternativa y para las pruebas automatizadas.
  emailAndPassword: { enabled: true },
  socialProviders,
  // MFA por TOTP (Google Authenticator), con códigos de respaldo.
  plugins: [twoFactor()],
});
