# Project 01 — Adapter Pattern (Email Providers)

Implementation of the **Adapter** pattern for email providers, with **Decorator** extensions (logging, retry, circuit breaker) and a **State Machine** for circuit breaker lifecycle.

## Documentation

- Spec archivado: `docs/superpowers/archive/2026-06-06-adapter-email-production-readiness/spec.md`
- Backlog: `BACKLOG.md`

## Stack

- **Node.js** + **TypeScript**
- **Fastify** — HTTP server
- **Zod** — Schema validation
- **Pino** — Logging
- **Nodemailer** — SMTP
- **Vitest** — Tests
- **Biome** — Lint/format

## Providers

| Provider | Description |
|----------|-------------|
| **SMTP** | Nodemailer (MailHog or real SMTP) |
| **File** | Writes emails to a log file |
| **Null** | Silent adapter (dev/tests) |

## Patterns implemented

- **Adapter** — uniform `EmailSender` interface for SMTP, File, Null
- **Strategy** — provider swapped at runtime via `/provider` endpoint
- **Decorator** — logging, retry, and circuit breaker wrappers around any sender
- **State Machine** — circuit breaker states (Closed → Open → Half-Open → Closed)

## Setup

```bash
bun install
bun run dev
```

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check with provider + circuit breaker status |
| `GET` | `/provider` | Current provider |
| `POST` | `/provider` | Switch provider (`{ provider: "smtp" \| "file" \| "null" }`) |
| `POST` | `/users/register` | Register user + send welcome email |
| `POST` | `/users/reset-password` | Reset password + send email |

## Scripts

```bash
bun run dev                # Dev server with watch
bun run build              # TypeScript compile
bun run start              # Run compiled dist

# Tests
bun run test               # Vitest watch mode
bun run test:run           # All tests (single run)
bun run test:unit          # Unit tests only (excludes integration)
bun run test:integration   # Integration tests (includes smoke)
bun run test:smoke         # Smoke tests only

# Demo
bun run demo               # Circuit breaker lifecycle demo
```

## Environment Variables

```bash
EMAIL_PROVIDER=null        # smtp, file, null
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
LOG_DIR=/tmp
PORT=3000
```

## Docker (MailHog)

```bash
docker compose up
```

MailHog UI: `http://localhost:8025`

## Structure

```
src/
  index.ts                   # Entry point
  server.ts                  # Fastify server factory
  email.adapter.ts           # EmailSender interface
  sender.factory.ts          # Decorator chain factory
  schemas.ts                 # Zod schemas
  errors.ts                  # Custom errors
  providers/                 # Adapters (smtp, file, null)
    index.ts
    smtp.ts
    file.ts
    null.ts
  decorators/                # Decorator wrappers
    logging.sender.ts
    retry.sender.ts
    circuit-breaker.sender.ts
  lib/
    state-machine.ts         # Circuit breaker state machine
  routes/
    health.routes.ts
    provider.routes.ts
    user.routes.ts
  services/
    user.service.ts
tests/
  providers.test.ts
  user.service.test.ts
  fastify.test.ts
  lib/
    state-machine.test.ts
  routes/
    health.routes.test.ts
  decorators/
    circuit-breaker.test.ts
    logging-sender.test.ts
    retry-sender.test.ts
  integration/
    circuit-breaker.integration.test.ts
    smoke.integration.test.ts
scripts/
  circuit-breaker-demo.ts    # Standalone demo
```
