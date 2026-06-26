# 02 — Microservicios con eventos (pedidos)

Sistema de pedidos event-driven con RabbitMQ, observabilidad completa y patrones
de confiabilidad. Ver el diseño en
`docs/superpowers/specs/2026-06-26-microservices-orders-event-driven-design.md`.

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

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| RabbitMQ management | http://localhost:15672 | guest / guest |
| Prometheus | http://localhost:9090 | — |
| Grafana | http://localhost:3001 | anónimo (admin) |
| Jaeger | http://localhost:16686 | — |

## Verificar

```bash
bun run --filter '@orders/shared' test   # smoke de infra + conexión a RabbitMQ
```

Tras correr los tests, en RabbitMQ → Exchanges deberías ver `orders.events` y `orders.dlx`.

## Bajar la infra

```bash
bun run infra:down    # docker compose down -v
```
