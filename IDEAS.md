# Mini projects — backend patterns + microservicios

> Este archivo es un backlog de ideas. No describe carpetas ni asume qué ya existe.
> Los proyectos implementados viven en `projects/` con numeración propia.

## Setup base

- Node.js + TypeScript
- SQLite (gratis, sin infra)
- Docker Compose para microservicios
- Todo local, cero servicios pagos

## Ya implementados

- [01-adapter-email](projects/01-adapter-email/) — Adapter para proveedores de email, con decorators y state machine.
- [02-microservices-orders](projects/02-microservices-orders/) — Microservicios event-driven con RabbitMQ y observabilidad.

## Ideas futuras

### Adapter — proveedor de emails

- Wrapper que abstrae SendGrid / Mailgun / SMTP.
- Misma interfaz, se cambia por config sin tocar negocio.

### Strategy — rate limiter

- Middleware con Token Bucket, Fixed Window, Sliding Log.
- Selección por ruta en config.
- Métricas de requests aceptadas y rechazadas.

### State machine — order lifecycle

- Máquina de estados declarativa: `pending → confirmed → preparing → shipped → delivered`.
- `cancelled` desde cualquier estado.
- Rechaza transiciones inválidas con error claro.

### Circuit breaker + bulkhead — APIs externas

- App que llama a 3 APIs (WeatherAPI, GitHub, etc).
- Cada una con circuit breaker y bulkhead.
- Si una falla, no bloquea las otras.

### Outbox + idempotency — webhook handler

- Webhook de Stripe (test mode).
- Guarda evento en DB (outbox), worker lo procesa.
- Idempotency key para que retries no dupliquen.

### Saga — orquestador de reserva viaje

- 3 servicios: `orders`, `payments`, `inventory`.
- Cada uno con su DB.
- Orquestador ejecuta secuencia con compensations si algo falla.

### CQRS (lightweight) — artículos

- Write side: `POST /articles` a SQLite normalizada.
- Read side: proyecciones desnormalizadas en SQLite aparte.
- Sin event sourcing, solo separación de modelos.

### Decorator/middleware — router custom

- Router chico donde cada ruta se envuelve en middleware stack.
- Cada middleware `(req, next) -> Response`.
- Hecho a mano sin Express.

## Microservicios

### Saga core

- 3 servicios: `orders`, `payments`, `inventory`.
- Cada uno con DB propia.
- Orquestador HTTP secuencial con compensations.

### API Gateway + 2 backends

- `gateway` con rate limiter + circuit breaker.
- `users-service`, `products-service`.
- Gateway orquesta.

### CQRS en microservicios

- `write-service` recibe POSTs, escribe SQLite, publica eventos.
- `read-service` consume y arma proyecciones.
- Dos procesos separados.

### Outbox + worker separado

- `api-service` recibe requests, guarda en outbox.
- `worker-service` pollea y publica a `webhook-delivery-service`.
- 3 servicios, comunicación vía DB compartida.
