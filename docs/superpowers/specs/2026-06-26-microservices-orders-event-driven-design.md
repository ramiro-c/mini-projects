# Microservicios con eventos — pedidos de e-commerce

**Fecha:** 2026-06-26
**Proyecto:** `projects/02-microservices-orders/`
**Objetivo de aprendizaje:** entender de verdad microservicios event-driven — colas (RabbitMQ),
patrones de confiabilidad de mensajería, observabilidad distribuida y orquestación de Docker.

---

## 1. Resumen

Sistema de pedidos de e-commerce donde varios servicios se comunican **por eventos** vía RabbitMQ.
Se construye en fases: primero **coreografía** (cada servicio reacciona a eventos sin un coordinador
central), después se agrega un **orquestador** (saga con compensaciones) para comparar ambos enfoques
con datos reales. Observabilidad completa desde el inicio (logs, métricas, tracing distribuido).
Todo gratis, local y dockerizado.

### Decisiones tomadas

| Tema | Decisión |
|------|----------|
| Dominio | E-commerce: pedidos |
| Broker | RabbitMQ (topic exchange + dead-letter exchange) |
| Coordinación | Coreografía (fase 1) **y** orquestación (fase 3), en fases para comparar |
| Observabilidad | Stack completo: pino (logs) + Prometheus/Grafana (métricas) + OpenTelemetry/Jaeger (tracing) |
| Confiabilidad | DLQ + retries, idempotencia, outbox pattern, inyección de fallos para demo |
| Estructura | Monorepo con paquete `shared` (bun workspaces) |
| Stack base | Node.js + TypeScript, bun, SQLite (DB por servicio), Docker Compose |

---

## 2. Arquitectura

```
                                  ┌─────────────────────────────────────┐
   POST /orders                   │            RabbitMQ                  │
       │                          │   topic exchange "orders.events"    │
       ▼                          │   + DLX "orders.dlx" (dead letters) │
 ┌───────────────┐  OrderCreated  └───────────────┬─────────────────────┘
 │ order-service │───────────────────┐            │
 │  (+ outbox)   │                   │   ┌─────────┴──────────┬───────────────┐
 └───────────────┘                   ▼   ▼                    ▼               ▼
        SQLite              ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
                            │ payment-service  │  │inventory-service │  │notification-svc  │
                            │ →PaymentApproved │  │ →StockReserved   │  │ (consume finales)│
                            │ →PaymentFailed   │  │ →StockFailed     │  │  "envía" email   │
                            └──────────────────┘  └──────────────────┘  └──────────────────┘
                              SQLite + idempotencia    SQLite + idempotencia

  Observabilidad (mismo compose):  Prometheus ── Grafana    OTel ── Jaeger    pino → stdout
```

### Principios

- **Database-per-service:** cada servicio tiene su propia SQLite. Ningún servicio lee/escribe la DB de otro.
- **Topic exchange:** routing por routing-key (`order.created`, `payment.approved`, `payment.failed`,
  `stock.reserved`, `stock.failed`, etc.). Cada servicio bindea las colas que le interesan.
- **Dead-letter exchange (DLX):** los mensajes que fallan tras los retries van a una cola de dead-letter
  visible en la UI de management, en vez de perderse.
- **Coreografía (fase 1):** no hay coordinador. El flujo emerge de los eventos.
- **Orquestación (fase 3):** `orchestrator-service` dirige la saga y ejecuta compensaciones ante fallos.

### Servicios

| Servicio | Responsabilidad | Eventos que emite |
|----------|-----------------|-------------------|
| `order-service` | Recibe `POST /orders`, persiste el pedido, emite el evento vía outbox | `OrderCreated` |
| `payment-service` | Escucha `OrderCreated`, simula cobro | `PaymentApproved` / `PaymentFailed` |
| `inventory-service` | Reserva stock | `StockReserved` / `StockFailed` |
| `notification-service` | Consume eventos terminales, "envía" notificación (log) | — |
| `orchestrator-service` (fase 3) | Dirige la saga, ejecuta compensaciones | comandos + eventos de saga |

---

## 3. Estructura del repo

Monorepo dentro de `projects/02-microservices-orders/` usando **bun workspaces**.

```
02-microservices-orders/
├── docker-compose.yml         # RabbitMQ, Prometheus, Grafana, Jaeger + servicios
├── package.json               # workspaces
├── README.md                  # teoría + diagramas + cómo correr la demo
├── packages/
│   └── shared/
│       ├── contracts/         # tipos de eventos + validación con zod
│       ├── messaging/         # wrapper RabbitMQ: publish/consume, DLQ, retries, propagación de trace
│       ├── telemetry/         # setup OpenTelemetry + métricas Prometheus
│       ├── outbox/            # helper de outbox + relay
│       └── idempotency/       # store de IDs de eventos procesados
└── services/
    ├── order-service/
    ├── payment-service/
    ├── inventory-service/
    ├── notification-service/
    └── orchestrator-service/  # fase 3
```

**Clave didáctica:** los wrappers `messaging` y `telemetry` instrumentan automáticamente cada
publish/consume — el trace context se propaga por headers de RabbitMQ y las métricas se emiten sin
código repetido. Así el tracing distribuido "simplemente funciona" en todos los servicios.

---

## 4. Patrones de confiabilidad

| Patrón | Cómo se implementa | Qué demuestra |
|--------|--------------------|---------------|
| **DLQ + retries** | Retries con backoff; tras N intentos el mensaje va al DLX. | Mensajes que fallan no se pierden; visibles en la UI de RabbitMQ. |
| **Idempotencia** | Cada consumer guarda en SQLite los IDs de eventos ya procesados; un reintento no reprocesa. | Un retry no cobra ni descuenta stock dos veces. |
| **Outbox pattern** | El servicio escribe el evento en su DB en la misma transacción que el cambio de negocio; un relay lo publica a RabbitMQ. | No se pierden eventos si el broker está caído al momento del commit. |
| **Inyección de fallos** | Flag/config que hace fallar o colgar `payment-service` de forma controlada. | Dispara DLQs, retries y (en fase 3) compensaciones para verlos actuar. |

---

## 5. Observabilidad

- **Logs:** pino estructurado a stdout, con `traceId` correlacionado.
- **Métricas:** cada servicio expone `/metrics` (Prometheus). Dashboards de Grafana con latencia,
  throughput, profundidad de colas, tasa de errores y métricas de negocio (pedidos por estado).
- **Tracing:** OpenTelemetry propaga el contexto por los headers de los mensajes; Jaeger muestra el
  waterfall de un pedido cruzando los servicios.

---

## 6. Plan de fases

Cada fase corre y se demuestra sola. No se avanza hasta que la anterior funcione.

| Fase | Qué se construye | Criterio de "listo" |
|------|------------------|---------------------|
| **0 — Infra** | `docker-compose.yml` levanta RabbitMQ + Prometheus + Grafana + Jaeger. Paquete `shared` con los wrappers base. | `docker compose up` y todo verde; UIs de RabbitMQ, Grafana y Jaeger accesibles. |
| **1 — Coreografía** | Los 4 servicios reaccionando a eventos. Outbox + idempotencia + DLQ/retries desde el inicio. Tracing y métricas integrados vía `shared`. | Se manda un pedido y se sigue cruzando 4 servicios en Jaeger; las colas se ven moverse en RabbitMQ. |
| **2 — Dashboards** | Dashboards de Grafana (latencia, throughput, profundidad de colas, errores) + métricas de negocio. | Panel donde se ve el sistema "respirar" bajo carga. |
| **3 — Orquestación** | `orchestrator-service`: misma saga pero dirigida, con compensaciones (reembolso, liberar stock). | Comparación coreografía vs orquestación con datos reales. |
| **4 — Fallos + demo + docu** | Inyección de fallos + demo guiada + documentación completa (teoría + diagramas). | Se disparan fallos y se ven DLQ, retries y compensaciones actuar; README didáctico. |

---

## 7. No incluido (YAGNI)

- Kafka / event sourcing / replay de eventos (sobra para el objetivo de aprendizaje).
- Autenticación / API gateway (otro mini-proyecto del repo lo cubre).
- Deploy a la nube (todo es local y gratis por diseño).
- Frontend (la demo se maneja por HTTP + las UIs de observabilidad).

---

## 8. Implementación

Se usarán **subagentes en paralelo** donde aporte: scaffolding de servicios que comparten estructura
y redacción de documentación por sección. El plan detallado se arma con la skill `writing-plans`.
