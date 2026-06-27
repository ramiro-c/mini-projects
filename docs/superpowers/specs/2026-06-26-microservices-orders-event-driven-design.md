# Microservices with Events - E-commerce Orders

**Date:** 2026-06-26
**Project:** `projects/02-microservices-orders/`
**Learning goal:** understand event-driven microservices for real - queues (RabbitMQ), messaging reliability patterns, distributed observability, and Docker orchestration.

---

## 1. Summary

An e-commerce orders system where multiple services communicate **through events** over RabbitMQ.
The project is built in phases: first **choreography** (each service reacts to events without a central coordinator), then a **coordinator** is added (saga with compensations) so both approaches can be compared with real data. Full observability from the start (logs, metrics, distributed tracing).
Everything is free, local, and Dockerized.

### Decisions made

| Topic | Decision |
|------|----------|
| Domain | E-commerce: orders |
| Broker | RabbitMQ (topic exchange + dead-letter exchange) |
| Coordination | Choreography (phase 1) **and** orchestration (phase 3), introduced in phases for comparison |
| Observability | Full stack: pino (logs) + Prometheus/Grafana (metrics) + OpenTelemetry/Jaeger (tracing) |
| Reliability | DLQ + retries, idempotency, outbox pattern, fault injection for demos |
| Structure | Monorepo with a `shared` package (bun workspaces) |
| Base stack | Node.js + TypeScript, bun, SQLite (DB per service), Docker Compose |

---

## 2. Architecture

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

### Principles

- **Database-per-service:** each service owns its own SQLite database. No service reads or writes another service's DB.
- **Topic exchange:** routing by routing key (`order.created`, `payment.approved`, `payment.failed`,
  `stock.reserved`, `stock.failed`, etc.). Each service binds the queues it cares about.
- **Dead-letter exchange (DLX):** messages that fail after retries go to a visible dead-letter queue instead of being lost.
- **Choreography (phase 1):** there is no coordinator. The flow emerges from the events themselves.
- **Orchestration (phase 3):** `orchestrator-service` drives the saga and executes compensations on failures.

### Services

| Service | Responsibility | Events emitted |
|----------|-----------------|----------------|
| `order-service` | Receives `POST /orders`, persists the order, emits the event through outbox | `OrderCreated` |
| `payment-service` | Listens to `OrderCreated`, simulates payment | `PaymentApproved` / `PaymentFailed` |
| `inventory-service` | Reserves stock | `StockReserved` / `StockFailed` |
| `notification-service` | Consumes terminal events, "sends" notification (log) | — |
| `orchestrator-service` (phase 3) | Drives the saga, executes compensations | saga commands + events |

---

## 3. Repo structure

Monorepo inside `projects/02-microservices-orders/` using **bun workspaces**.

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

**Didactic key:** the `messaging` and `telemetry` wrappers instrument every publish/consume automatically - trace context is propagated through RabbitMQ headers and metrics are emitted without repeated code. Distributed tracing "just works" across all services.

---

## 4. Reliability patterns

| Pattern | How it is implemented | What it demonstrates |
|--------|------------------------|-----------------------|
| **DLQ + retries** | Retries with backoff; after N attempts the message goes to the DLX. | Failed messages are not lost; they stay visible in RabbitMQ. |
| **Idempotency** | Each consumer stores processed event IDs in SQLite; a retry does not reprocess them. | A retry does not charge or reserve stock twice. |
| **Outbox pattern** | The service writes the event to its DB in the same transaction as the business change; a relay publishes it to RabbitMQ. | Events are not lost if the broker is down at commit time. |
| **Fault injection** | A flag/config makes `payment-service` fail or hang in a controlled way. | Triggers DLQs, retries, and later compensations so they can be observed. |

---

## 5. Observability

- **Logs:** structured pino output to stdout, with correlated `traceId`.
- **Metrics:** each service exposes `/metrics` (Prometheus). Grafana dashboards show latency,
  throughput, queue depth, error rate, and business metrics (orders by status).
- **Tracing:** OpenTelemetry propagates context through message headers; Jaeger shows the waterfall
  of an order crossing services.

---

## 6. Phase plan

Each phase runs and is demonstrated on its own. We do not move forward until the previous one works.

| Phase | What is built | "Done" criterion |
|------|----------------|------------------|
| **0 - Infra** | `docker-compose.yml` brings up RabbitMQ + Prometheus + Grafana + Jaeger. `shared` contains the base wrappers. | `docker compose up` is green; RabbitMQ, Grafana, and Jaeger UIs are reachable. |
| **1 - Choreography** | The 4 services react to events. Outbox + idempotency + DLQ/retries are present from the start. Tracing and metrics are integrated through `shared`. | Submit an order and watch it cross 4 services in Jaeger; the queues visibly move in RabbitMQ. |
| **2 - Dashboards** | Grafana dashboards (latency, throughput, queue depth, errors) + business metrics. | A panel shows the system breathing under load. |
| **3 - Orchestration** | `orchestrator-service`: same saga, but directed, with compensations (refund, release stock). | Choreography vs orchestration can be compared with real data. |
| **4 - Failures + demo + docs** | Fault injection + guided demo + complete documentation (theory + diagrams). | Failures are triggered and DLQ, retries, and compensations can be observed; README is teaching-friendly. |

---

## 7. Not included (YAGNI)

- Kafka / event sourcing / event replay (too much for the learning goal).
- Authentication / API gateway (covered by another mini-project in the repo).
- Cloud deployment (everything is local and free by design).
- Frontend (the demo is handled through HTTP + observability UIs).

---

## 8. Implementation

We will use **parallel subagents** where it helps: scaffolding services with shared structure and writing documentation by section. The detailed plan is assembled with the `writing-plans` skill.
