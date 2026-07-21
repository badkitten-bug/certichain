# 📋 Tarea 1 — [Infrastructure] Persistencia real con SQLite (Prisma)

**Capa:** `src/infrastructure/` · **Dificultad:** media · **Estado:** ✅ completada

## Objetivo

Reemplazar los repositorios **en memoria** por una persistencia real con **SQLite**, usando Prisma.

## Contexto de arquitectura (leer antes de empezar)

Este proyecto usa **Arquitectura Onion**: el dominio define los contratos y la infraestructura los implementa. Esta tarea vive 100% en la capa `src/infrastructure/` — **no se toca ni una línea de `src/domain/` ni de `src/application/`**.

Los contratos a implementar ya existen:

- [`src/domain/repositories/institution.repository.ts`](../../src/domain/repositories/institution.repository.ts) → interfaz `InstitutionRepository`
- [`src/domain/repositories/certificate.repository.ts`](../../src/domain/repositories/certificate.repository.ts) → interfaz `CertificateRepository`
- (Bonus) [`src/application/ports/certificate-ledger.port.ts`](../../src/application/ports/certificate-ledger.port.ts) → interfaz `CertificateLedger`, para que la blockchain sobreviva al reinicio del servidor

Las implementaciones actuales en memoria sirven de referencia:

- [`src/infrastructure/persistence/in-memory-institution.repository.ts`](../../src/infrastructure/persistence/in-memory-institution.repository.ts)
- [`src/infrastructure/persistence/in-memory-certificate.repository.ts`](../../src/infrastructure/persistence/in-memory-certificate.repository.ts)
- [`src/infrastructure/blockchain/in-memory-blockchain.ledger.ts`](../../src/infrastructure/blockchain/in-memory-blockchain.ledger.ts)

## Checklist

- [x] Agregar Prisma con SQLite (`pnpm add @prisma/client prisma`)
- [x] Crear `SqliteInstitutionRepository` que implemente `InstitutionRepository`
- [x] Crear `SqliteCertificateRepository` que implemente `CertificateRepository` (ojo: el estado REVOCADO, `revokedAt` y `revocationReason` también se persisten)
- [x] Registrar las nuevas clases en `src/app.module.ts` cambiando **solo** los `useClass` (ese archivo es el composition root, el único que conoce todas las capas)
- [x] (Bonus) `SqliteBlockchainLedger` para persistir la cadena
- [x] Verificar que `pnpm test` y `pnpm run test:e2e` siguen pasando **sin modificar ninguna prueba**

## Criterio de aceptación

Las 37 pruebas existentes pasan sin cambios. Si necesitas cambiar algo del dominio para "acomodar" el ORM, la solución está mal planteada: **el ORM se adapta al dominio, nunca al revés** (el mapeo entidad ↔ fila se hace dentro del repositorio).

## Flujo de trabajo

```bash
git checkout -b feature/infrastructure-sqlite
# ... trabajar ...
git push -u origin feature/infrastructure-sqlite
# abrir Pull Request hacia main
```
