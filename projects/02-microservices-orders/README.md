# 02 — Microservicios con eventos (pedidos)

Sistema de pedidos event-driven con RabbitMQ, observabilidad completa y patrones
de confiabilidad. Ver el diseño en
`docs/superpowers/specs/2026-06-26-microservices-orders-event-driven-design.md`.

## Documentación

- Spec: `docs/superpowers/specs/2026-06-26-microservices-orders-event-driven-design.md`
- Plan fase 0: `docs/superpowers/plans/2026-06-26-microservices-orders-phase-0-infra.md`
- SDD: `.superpowers/sdd/progress.md`

## Estado: Fase 0 — Infra

Levanta la infraestructura base y el wrapper de mensajería.

## Requisitos

- Docker + Docker Compose
- bun

## Levantar la infra

```bash
bun install
bun run infra:up      # docker compose up -d
```

## UIs

| Servicio | URL | Credenciales | Qué mirar en la Fase 0 |
|----------|-----|--------------|------------------------|
| RabbitMQ management | http://localhost:15672 | guest / guest | Pestaña **Exchanges** → `orders.events` (topic) y `orders.dlx` (fanout). Acá se ven las colas moverse en la Fase 1. |
| Prometheus | http://localhost:9090 | — | Por ahora solo se scrapea a sí mismo. Las métricas de los servicios entran en la Fase 2. |
| Grafana | http://localhost:3001 | anónimo (admin) | Entra sin login. Los dashboards se arman en la Fase 2. |
| Jaeger | http://localhost:16686 | — | Vacío todavía. En la Fase 1 muestra el "viaje" de un pedido cruzando los 4 servicios (tracing distribuido). |

Arrancá por **RabbitMQ → Exchanges**: es la prueba más concreta de que el wrapper de `@orders/shared` creó algo real en el broker.

## Verificar

```bash
bun run --filter '@orders/shared' test   # smoke de infra + conexión a RabbitMQ
```

Corre 6 tests: 4 chequean que las UIs respondan (HTTP 200) y 2 se conectan al RabbitMQ real
y declaran la topología. **6/6 = infra sana.**

También se pueden inspeccionar los exchanges por la API de management:

```bash
curl -s -u guest:guest "http://localhost:15672/api/exchanges/%2F?columns=name,type" \
  | tr ',' '\n' | grep -A1 orders
# → orders.dlx / fanout   y   orders.events / topic
```

## Comandos

```bash
bun run infra:up      # levantar todo (docker compose up -d)
bun run infra:down    # bajar todo y BORRAR datos (docker compose down -v)
bun run infra:logs    # ver logs en vivo
```

## ¿Por qué todavía no hay pedidos para probar?

Esta es la **Fase 0: solo la infraestructura**. Todavía no hay servicios ni un endpoint
`POST /orders` — eso llega en la Fase 1 (los 4 microservicios reaccionando a eventos).
Lo que se prueba hoy es que las cañerías están puestas: el broker levanta, las UIs de
observabilidad responden, y el wrapper de mensajería se conecta de verdad y declara la
topología base.

### Topología base (qué crea el wrapper)

- **`orders.events` (topic):** el exchange principal. Los servicios publican eventos con una
  routing key (ej. `order.created`, `payment.approved`) y cada cola se suscribe a los patrones
  que le interesan.
- **`orders.dlx` (fanout):** el *dead-letter exchange*, la "bandeja de no entregados". Los
  mensajes que fallan tras los reintentos caen acá en vez de perderse. Es fanout para que
  **todo** dead-letter llegue a la DLQ sin depender de la routing key.

## Fases

| Estado | Fase | Qué se construye |
|---|---|---|
| [x] | 0 — Infra | RabbitMQ + Prometheus + Grafana + Jaeger, más el wrapper base de `shared`. |
| [ ] | 1 — Coreografía | 4 servicios reaccionando a eventos; outbox + idempotencia + DLQ/retries; tracing y métricas vía `shared`. |
| [ ] | 2 — Dashboards | Dashboards de Grafana (latencia, throughput, profundidad de colas) + métricas de negocio. |
| [ ] | 3 — Orquestación | `orchestrator-service`: saga dirigida con compensaciones. |
| [ ] | 4 — Fallos + demo | Inyección de fallos + demo guiada + documentación completa. |
