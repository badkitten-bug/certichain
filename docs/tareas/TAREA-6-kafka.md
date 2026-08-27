# TAREA 6 — Implementación de Apache Kafka

## 1. Contexto

La aplicación permite a una institución emitir certificados digitales registrados en Blockchain.

El endpoint `POST /certificates` genera el certificado, calcula su hash, lo registra en Blockchain y guarda la información correspondiente.

Se incorporará **Apache Kafka** para desacoplar el envío del correo electrónico al alumno del proceso de emisión del certificado. Esta tarea es la contraparte de la TAREA-5 (RabbitMQ): misma funcionalidad, distinto broker, para comparar ambos enfoques sobre la misma arquitectura hexagonal.

Para el POC:

- NestJS se ejecutará localmente.
- Kafka se ejecutará mediante Docker (modo KRaft, sin Zookeeper).
- Kafka UI y Mailpit se ejecutarán mediante Docker.
- El correo se enviará de forma asíncrona mediante un evento.

---

## 2. Flujo

```text
Institución
    |
    | POST /certificates
    v
NestJS
    |
    ├── Validar datos
    ├── Generar certificado
    ├── Calcular hash
    ├── Registrar en Blockchain
    └── Guardar certificado
            |
            v
    certificate.issued  (producer, key = certificateId)
            |
            v
   Kafka topic: certificate.issued
            |
            v
   Email Consumer (group: certichain-email-consumer)
            |
            v
         Mailpit
            |
            v
        Correo alumno
```

El envío del correo no bloquea el proceso HTTP.

---

## 3. Request

### `POST /certificates`

```json
{
  "institutionId": "0b6c9a3e-...",
  "holderName": "María Fernanda Quispe",
  "holderDocument": "74125836",
  "holderEmail": "maria@example.com",
  "degreeTitle": "Ingeniera de Software"
}
```

El campo `holderEmail` se usa para enviar el correo al alumno.

---

## 4. Response

No cambia respecto a la versión sin mensajería:

```json
{
  "verificationCode": "9f2e1c4a-...",
  "contentHash": "a3f5b8...64hex",
  "blockIndex": 7,
  "blockHash": "c91d20...64hex",
  "issuedAt": "2026-08-27T15:30:00.000Z"
}
```

---

## 5. Evento `certificate.issued`

Ver `docs/KAFKA-INTEGRATION.md` §6. Mismo payload que en RabbitMQ; en Kafka además se envía `key = certificateId` y headers `eventId` / `eventType`.

---

## 6. Kafka con Docker

Ver `docker-compose.yml`. Servicios:

| Servicio | Imagen | Puerto | Para qué |
|---|---|---|---|
| `kafka` | `apache/kafka:3.9.0` | 9092 | Broker (KRaft). Topic auto-creado con 3 particiones. |
| `kafka-ui` | `provectuslabs/kafka-ui` | 8080 | Inspeccionar topics, mensajes, consumer groups. |
| `mailpit` | `axllent/mailpit` | 1025 / 8025 | SMTP falso + bandeja web. |

```bash
docker compose up -d
docker compose ps
docker compose down        # -v para borrar también los datos de Kafka
```

---

## 7. Conexión desde NestJS

```text
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=certichain-api
KAFKA_GROUP_ID=certichain-email-consumer
KAFKA_TOPIC=certificate.issued
```

Panel: http://localhost:8080 (sin credenciales).

---

## 8. Implementación (resumen)

| Capa | Archivo | Rol |
|---|---|---|
| Puerto outbound | `ports/outbound/certificate-event-publisher.port.ts` | Contrato `publish(event)` — no sabe de Kafka |
| Puerto outbound | `ports/outbound/email-sender.port.ts` | Contrato `sendCertificateEmail(...)` |
| Adaptador outbound | `adapters/outbound/messaging/kafka-certificate-event-publisher.adapter.ts` | `ClientKafka.emit(topic, {key, value, headers})` |
| Adaptador outbound | `adapters/outbound/email/nodemailer-email-sender.adapter.ts` | SMTP con Nodemailer |
| Adaptador inbound | `adapters/inbound/messaging/certificate-events.controller.ts` | `@EventPattern('certificate.issued')` |
| Configuración | `configuration/messaging/kafka.config.ts` | `Transport.KAFKA`, brokers, groupId |
| Composition root | `configuration/dependency-injection/app.module.ts` | `ClientsModule.register([...kafkaOptions()])` |
| Bootstrap | `main.ts` | `app.connectMicroservice(kafkaOptions())` |

Dependencias nuevas: `@nestjs/microservices`, `kafkajs`, `nodemailer` (+ `@types/nodemailer`).

---

## 9. Verificación

1. `docker compose up -d` y esperar a que `kafka` esté `healthy`.
2. `pnpm start:dev`.
3. Emitir un certificado por Swagger (`/api`) o `curl`.
4. Comprobar:
   - Kafka UI → topic `certificate.issued` → 1 mensaje con key = `certificateId`.
   - Consola: `📥 Evento certificate.issued recibido (...)`.
   - Mailpit (http://localhost:8025) → correo a `holderEmail`.
5. Extra (diferencia con RabbitMQ): detener la API, resetear el offset del grupo a `--to-earliest` y volver a arrancar → el correo se reenvía porque el evento sigue en el log.
