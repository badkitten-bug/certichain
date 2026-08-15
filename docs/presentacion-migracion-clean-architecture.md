---
marp: true
theme: uncover
class: lead
paginate: true
backgroundColor: #0d1117
color: #e6edf3
style: |
  section {
    font-family: 'Segoe UI', sans-serif;
    font-size: 1.1rem;
  }
  h1 { color: #58a6ff; font-size: 2rem; }
  h2 { color: #79c0ff; font-size: 1.5rem; border-bottom: 2px solid #58a6ff; padding-bottom: 6px; }
  h3 { color: #a5d6ff; font-size: 1.1rem; }
  code { background: #161b22; color: #ff7b72; padding: 2px 6px; border-radius: 4px; }
  pre { background: #161b22; border: 1px solid #30363d; border-radius: 8px; }
  table { font-size: 0.8rem; }
  th { background: #1f6feb; color: white; }
  td { border-color: #30363d; }
  blockquote { border-left: 4px solid #58a6ff; color: #8b949e; }
  ul li { margin: 6px 0; }
  .tag { background: #1f6feb33; border: 1px solid #58a6ff; border-radius: 4px; padding: 2px 8px; font-size: 0.75rem; }
---

# Migración a Clean Architecture
## CertiChain · Certificados Académicos en Blockchain

**Hexagonal → Clean Architecture**

`TypeScript` · `NestJS` · `Agosto 2026`

---

## ¿Por qué migrar?

- La arquitectura Hexagonal actual es sólida ✅
- Pero al crecer el equipo y el sistema, surgen fricciones:
  - `ports/` crece sin estructura clara
  - Los Use Cases no tienen contratos explícitos de entrada/salida
  - No hay capa de **Presenters**: el Controller formatea el response
  - El código no "grita" las capacidades del sistema

> **Clean Architecture** resuelve cada uno de estos puntos

---

## Las tres arquitecturas de un vistazo

| | Onion | Hexagonal | **Clean** |
|---|---|---|---|
| **Autor** | Palermo (2008) | Cockburn (2005) | Uncle Bob (2012) |
| **Metáfora** | Cebolla | Hexágono | Círculos |
| **Entities vs Use Cases** | ❌ No separa | ❌ No separa | ✅ Explícito |
| **Presenters** | ❌ | ❌ | ✅ |
| **Screaming Arch.** | ❌ | ❌ | ✅ |
| **Boilerplate** | Bajo | Medio | Alto |
| **Testabilidad** | Alta | Alta | Muy alta |

---

## Ventajas y desventajas

| | ✅ Ventajas | ❌ Desventajas |
|---|---|---|
| **Onion** | Simple · Flujo claro | No separa reglas de empresa vs aplicación |
| **Hexagonal** | Múltiples clientes · Infra intercambiable | `ports/` desordenado · Sin Presenters |
| **Clean** | Máxima separación · Ideal equipos grandes | Alto boilerplate · Diseño inicial largo |

---

## ¿Cuándo usar cada una?

**Onion →** CRUD empresarial · equipos pequeños · migrando de MVC

**Hexagonal →** Múltiples clientes (REST + CLI + MQ) · infra intercambiable · proyectos medianos

**Clean →** Sistemas de misión crítica · larga vida útil · equipos grandes · UI puede cambiar radicalmente

---

## Arquitectura Hexagonal — Hoy

```mermaid
graph LR
  REST["REST Controller\nadapters/inbound"] -->|llama| PI["Inbound Ports\nports/inbound"]
  PI -->|implementado por| UC["Use Cases\ncore/application"]
  UC --> DOM["Domain\ncore/domain"]
  UC -->|usa| PO["Outbound Ports\nports/outbound"]
  PO -->|implementado por| DB["SQLite Adapter\nadapters/outbound"]
```

- Núcleo: `core/domain` + `core/application`
- Contratos: `ports/inbound` y `ports/outbound`
- Implementaciones: `adapters/`

---

## Clean Architecture — La Regla de Dependencia

```mermaid
flowchart LR
    A["④ Frameworks\n& Drivers"] -->|depende de| B["③ Interface\nAdapters"]
    B -->|depende de| C["② Use Cases\nInteractors"]
    C -->|depende de| D["① Entities"]

    style D fill:#1565c0,color:#fff
    style C fill:#2e7d32,color:#fff
    style B fill:#e65100,color:#fff
    style A fill:#4a148c,color:#fff
```

> **Ninguna flecha apunta hacia afuera.**
> El código interno jamás menciona algo de una capa exterior.

---

## Nueva estructura de carpetas

```
src/
├── domain/                  ← ① Entities
│   ├── entities/
│   ├── value-objects/
│   └── exceptions/
├── application/             ← ② Use Cases
│   ├── use-cases/
│   │   ├── issue-certificate/
│   │   │   ├── *.interactor.ts
│   │   │   ├── *.input-port.ts
│   │   │   ├── *.request.ts
│   │   │   └── *.response.ts
│   │   └── verify-certificate/ ...
│   └── repositories/        ← Output Ports
├── interface-adapters/      ← ③ Adapters
│   ├── controllers/
│   ├── presenters/  ← NUEVO
│   └── gateways/
└── infrastructure/          ← ④ Frameworks
```

---

## Los 7 cambios clave

| # | Cambio | Origen → Destino |
|---|---|---|
| 1 | Aplanar núcleo | `core/domain/` → `domain/` |
| 2 | Feature-first | `use-cases/*.ts` → `use-cases/feature/*.ts` |
| 3 | Input Ports al use case | `ports/inbound/` → `use-cases/feature/input-port.ts` |
| 4 | Output Ports a application | `ports/outbound/` → `application/repositories/` |
| 5 | **Introducir Presenters** | _(nuevo)_ → `interface-adapters/presenters/` |
| 6 | Adapters → Gateways | `*.adapter.ts` → `*.gateway.ts` |
| 7 | configuration → infra | `configuration/` → `infrastructure/` + `main/` |

---

## Screaming Architecture — Cambio 2

**Antes:** carpeta plana de use cases

```
core/application/use-cases/
  issue-certificate.use-case.ts
  verify-certificate.use-case.ts
  revoke-certificate.use-case.ts
```

**Después:** cada caso de uso es una unidad autónoma

```
application/use-cases/
  issue-certificate/
    issue-certificate.interactor.ts
    issue-certificate.input-port.ts
    issue-certificate.request.ts
    issue-certificate.response.ts
```

> La carpeta "grita" las capacidades del sistema 📢

---

## El Presenter — Cambio 5 (nuevo concepto)

**Antes (Hexagonal):** el Controller construye el response directamente

**Después (Clean):**

```typescript
// interface-adapters/presenters/certificate.presenter.ts
export class CertificatePresenter {
  static toIssuedView(response: IssueCertificateResponse) {
    return {
      verificationCode: response.verificationCode,
      contentHash: response.contentHash,
      status: response.status,
      _links: { verify: `/certificates/${response.verificationCode}/verify` },
    };
  }
}
```

> Si mañana llega GraphQL o gRPC: nuevo Presenter, cero cambios en el Interactor ✅

---

## Flujo completo de una petición

```mermaid
sequenceDiagram
    actor C as HTTP Client
    participant CTR as Controller
    participant INT as Interactor
    participant DOM as Certificate Entity
    participant GW as PrismaGateway
    participant PRE as Presenter

    C->>CTR: POST /certificates
    CTR->>INT: execute(RequestModel)
    INT->>DOM: new Certificate(...)
    DOM-->>INT: certificate + hash
    INT->>GW: save(certificate)
    GW-->>INT: ok
    INT-->>CTR: ResponseModel
    CTR->>PRE: toIssuedView(response)
    PRE-->>C: 201 { verificationCode, ... }
```

---

## Mapeo de artefactos: actual → futuro

| Archivo actual | Archivo destino |
|---|---|
| `core/domain/entities/certificate.entity.ts` | `domain/entities/certificate.entity.ts` |
| `core/application/use-cases/issue-certificate.use-case.ts` | `application/use-cases/issue-certificate/issue-certificate.interactor.ts` |
| `ports/inbound/issue-certificate.port.ts` | `application/use-cases/issue-certificate/issue-certificate.input-port.ts` |
| `ports/outbound/certificate-repository.port.ts` | `application/repositories/certificate-repository.port.ts` |
| `adapters/outbound/*.adapter.ts` | `interface-adapters/gateways/*.gateway.ts` |
| `configuration/dependency-injection/app.module.ts` | `main/app.module.ts` |

---

## Plan de migración — 5 fases

```mermaid
gantt
    title Plan de migración Hexagonal → Clean Architecture
    dateFormat  YYYY-MM-DD
    section Fase 1 — Dominio
    core/domain → domain/           :f1, 2026-08-18, 2d
    section Fase 2 — Application
    Reorganizar use-cases + ports    :f2, after f1, 4d
    section Fase 3 — Interface Adapters
    Presenters + Gateways            :f3, after f2, 3d
    section Fase 4 — Infrastructure
    configuration → infrastructure   :f4, after f3, 2d
    section Fase 5 — Validación
    Tests + imports + dependency-cruiser :f5, after f4, 3d
```

---

## Validar la Dependency Rule automáticamente

```json
// .dependency-cruiser.json
{
  "forbidden": [
    {
      "name": "domain-no-dep-outward",
      "from": { "path": "^src/domain" },
      "to":   { "path": "^src/(application|interface-adapters|infrastructure)" }
    },
    {
      "name": "application-no-dep-adapters",
      "from": { "path": "^src/application" },
      "to":   { "path": "^src/(interface-adapters|infrastructure)" }
    }
  ]
}
```

```bash
npx depcruise src --config .dependency-cruiser.json
```

---

## Conclusión

| | Hexagonal (hoy) | Clean (destino) |
|---|---|---|
| Estructura | Por tipo (`ports/`, `adapters/`) | Por feature + capa |
| Contratos de use case | Implícitos (solo el puerto inbound) | **Explícitos** (Input/Output Port + Request/Response) |
| Formateo de respuesta | En el Controller | En el **Presenter** |
| Validación de dependencias | Manual | Automatizable con `dependency-cruiser` |

**La lógica no cambia. Solo cambia la organización.**
El dominio y los use cases migran sin modificar una línea de negocio. 🚀

---

# Gracias

**CertiChain** — Arquitectura de Software · Módulo 03

`domain/` → `application/` → `interface-adapters/` → `infrastructure/`

> _"Architecture is about the important stuff. Whatever that is."_
> — Ralph Johnson
