# Mini projects — backend patterns + microservicios

## Setup base
- Node.js + TypeScript
- SQLite (gratis, sin infra)
- Docker Compose para microservicios
- Todo local, cero servicios pagos

---

## Proyectos por patrón

### 1. Adapter — proveedor de emails
Wrapper que abstrae SendGrid / Mailgun / SMTP. Misma interfaz, se cambia por config sin tocar negocio.

### 2. Strategy — rate limiter
Middleware con Token Bucket, Fixed Window, Sliding Log. Se selecciona estrategia por ruta en config. Expone métricas de requests aceptadas/rechazadas.

### 3. State machine — order lifecycle
Máquina de estados declarativa: `pending → confirmed → preparing → shipped → delivered`, con `→ cancelled` desde cualquier estado. Rechaza transiciones inválidas con error claro.

### 4. Circuit breaker + bulkhead — APIs externas
App que llama a 3 APIs (WeatherAPI, GitHub, etc). Cada una con circuit breaker (closed/open/half-open) + bulkhead (max 5 conexiones simultáneas). Si una falla, no bloquea las otras.

### 5. Outbox + idempotency — webhook handler
Webhook de Stripe (test mode). Guarda evento en DB (outbox), worker lo procesa. Idempotency key para que retries no dupliquen.

### 6. Saga — orquestador de reserva viaje
3 servicios: `orders`, `payments`, `inventory`. Cada uno con su DB. Orquestador ejecuta secuencia con compensations si algo falla. Docker Compose.

### 7. CQRS (lightweight) — artículos
Write side: `POST /articles` a SQLite normalizada. Read side: proyecciones desnormalizadas en SQLite aparte. Sin event sourcing, solo separación de modelos.

### 8. Decorator/middleware — router custom
Router chico donde cada ruta se envuelve en middleware stack: `[auth, logging, metrics, rateLimit] → handler`. Cada middleware `(req, next) → Response`. Hecho a mano sin Express.

---

## Microservicios

### 9. Saga core (recomendado para arrancar)
3 servicios — `orders`, `payments`, `inventory`. Cada uno con DB propia. Orquestador HTTP secuencial con compensations. Docker Compose.

### 10. API Gateway + 2 backends
`gateway` (con rate limiter + circuit breaker), `users-service`, `products-service`. Cada uno CRUD simple. Gateway orquesta.

### 11. CQRS en microservicios
`write-service` recibe POSTs, escribe SQLite, publica eventos. `read-service` consume y arma proyecciones. Dos procesos separados.

### 12. Outbox + worker separado
`api-service` recibe requests, guarda en outbox. `worker-service` pollea y publica a `webhook-delivery-service`. 3 servicios, comunicación vía DB compartida (solo lectura worker).
