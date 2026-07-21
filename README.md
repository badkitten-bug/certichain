# 🎓 CertiChain — Certificados Académicos verificables en Blockchain

[![CI](https://github.com/badkitten-bug/certichain/actions/workflows/ci.yml/badge.svg)](https://github.com/badkitten-bug/certichain/actions/workflows/ci.yml)

Aplicación desarrollada con **Arquitectura Onion (Cebolla)** usando **TypeScript + NestJS**.

> 📘 Documento completo de análisis y diseño: [docs/Analisis-y-Diseno-CertiChain.md](docs/Analisis-y-Diseno-CertiChain.md)

## 📌 El caso

Las instituciones educativas emiten certificados que hoy son fáciles de falsificar y lentos de verificar. CertiChain resuelve el problema:

- Una **institución** registrada emite **certificados académicos** (diplomas, constancias).
- Al emitir, se calcula el **hash SHA-256** del certificado y se **ancla como bloque** de una blockchain: cada bloque guarda el hash del anterior, por lo que **nada puede alterarse** sin romper la cadena.
- **Cualquier empresa** verifica un certificado en segundos con su código de verificación, **sin depender de la institución emisora**: el sistema responde `VALIDO`, `REVOCADO` o `ALTERADO`.
- La institución puede **revocar** un certificado, y la revocación también queda anclada como bloque (nunca se borra nada).
- Cualquiera puede **auditar la integridad** de la cadena completa.

## 🧅 ¿Por qué Arquitectura Onion?

La arquitectura Onion organiza el código en capas concéntricas donde **las dependencias siempre apuntan hacia adentro**: el dominio no conoce a nadie; la infraestructura conoce a todos.

Este caso la amerita porque:

1. **El dominio es valioso e independiente de la tecnología**: las reglas "solo una institución activa emite", "solo el emisor revoca", "un certificado es válido si su hash coincide con el anclado y la cadena está íntegra" existen sin importar si se usa NestJS, SQLite o Ethereum.
2. **La blockchain es un detalle de infraestructura**: hoy es una cadena simulada en memoria; mañana podría anclarse a una testnet real. El dominio y los casos de uso **no cambiarían ni una línea**.
3. **Testeable**: los casos de uso se prueban con repositorios falsos, sin levantar base de datos ni servidor HTTP.

### Diagrama de capas

```
┌─────────────────────────────────────────────────────┐
│  PRESENTATION      (controllers REST, DTOs HTTP)    │
│  ┌───────────────────────────────────────────────┐  │
│  │  INFRASTRUCTURE  (repos en memoria,           │  │
│  │                   adaptador blockchain)       │  │
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │  APPLICATION   (casos de uso, puertos)  │  │  │
│  │  │  ┌───────────────────────────────────┐  │  │  │
│  │  │  │  DOMAIN                           │  │  │  │
│  │  │  │  (Institution, Certificate,       │  │  │  │
│  │  │  │   Block, reglas de negocio,       │  │  │  │
│  │  │  │   contratos de repositorio)       │  │  │  │
│  │  │  └───────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
          Las dependencias apuntan hacia ADENTRO →
```

### Estructura de carpetas

```
src/
├── domain/                  ← Núcleo: NO depende de nada externo
│   ├── entities/            ← Institution, Certificate
│   ├── value-objects/       ← Block (hash SHA-256 encadenado)
│   ├── repositories/        ← Interfaces (contratos) de persistencia
│   └── errors/              ← Errores de negocio
├── application/             ← Orquesta el dominio. Solo depende de domain/
│   ├── use-cases/           ← RegisterInstitution, IssueCertificate,
│   │                          VerifyCertificate, RevokeCertificate,
│   │                          VerifyChain, ListHolderCertificates
│   ├── ports/               ← CertificateLedger (blockchain), Clock
│   └── dtos/                ← Entradas/salidas de los casos de uso
├── infrastructure/          ← Implementa las interfaces del dominio
│   ├── persistence/         ← Repositorios en memoria
│   └── blockchain/          ← Ledger simulado con bloques encadenados
└── presentation/            ← Capa más externa
    ├── controllers/         ← Endpoints REST
    ├── filters/             ← Errores de dominio -> HTTP
    └── dtos/                ← Requests HTTP
```

### Regla de oro

| Capa | Puede importar de | NUNCA importa de |
|------|-------------------|------------------|
| Domain | (nada) | Application, Infrastructure, Presentation, NestJS |
| Application | Domain | Infrastructure, Presentation |
| Infrastructure | Domain, Application | Presentation |
| Presentation | Application (y Domain para tipos) | Infrastructure (solo la ensambla el módulo de NestJS vía inyección de dependencias) |

## 🚀 API

| Método | Ruta | Qué hace |
|--------|------|----------|
| POST | `/institutions` | Registra una institución emisora |
| GET | `/institutions` | Lista instituciones |
| POST | `/certificates` | Emite un certificado → hash anclado como bloque |
| GET | `/certificates/:code/verify` | **Verificación pública**: VALIDO / REVOCADO / ALTERADO |
| POST | `/certificates/:code/revoke` | Revoca (solo la institución emisora) |
| GET | `/holders/:document/certificates` | Certificados de un titular |
| GET | `/blockchain` | La cadena completa (transparencia) |
| GET | `/blockchain/verify` | Audita la integridad de la cadena |

## 🛠️ Ejecución

```bash
pnpm install
pnpm run start:dev     # servidor en http://localhost:3000
pnpm run test          # 25 pruebas unitarias (dominio + casos de uso)
pnpm run test:e2e      # 12 pruebas del flujo completo por HTTP
```

## 👥 Equipo

Steve Gómez · Erickson Soto · Jose Pacco — Curso de Arquitectura de Software, 2026.

Tareas del equipo: [docs/tareas/](docs/tareas/)