> **Status:** Implemented (2026-06)
> **Project:** `projects/01-adapter-email/`
> **Superseded by:** `projects/01-adapter-email/README.md`

# Project 01 — Adapter Email: Production Readiness

## Goal

Add production-grade reliability to the email adapter project: retries with exponential backoff, circuit breaker, structured logging, health checks, and route separation.

## Approach

Decorator Pattern — each cross-cutting concern implements `EmailSender` and wraps another `EmailSender`.

Composition order: `Logging(CircuitBreaker(Retry(realSender)))`

## 1. Decorators

### RetrySender

- Implements `EmailSender`
- Wraps inner `EmailSender`
- Config: `maxRetries` (3), `baseDelayMs` (200), `maxDelayMs` (5000)
- Exponential backoff with jitter
- Only retries on `TransientError` (network timeout, 5xx)
- `PermanentError` propagates immediately
- After exhausting retries, throws last error

### CircuitBreakerSender

- Implements `EmailSender`
- Wraps inner `EmailSender`
- States: CLOSED → OPEN → HALF_OPEN → CLOSED (or back to OPEN)
- Config: `failureThreshold` (5), `successThreshold` (3), `timeoutMs` (30000)
- When OPEN: throws `CircuitBreakerOpenError` immediately
- On success in HALF_OPEN: increment success count, close when threshold met
- On failure in HALF_OPEN: back to OPEN, reset timer
- Exposes `getState()` for health check

### LoggingSender

- Implements `EmailSender`
- Wraps inner `EmailSender`
- Uses pino for structured logging
- Logs: "sending email to {to}", "email sent successfully", "email failed {error}"
- Includes metadata: provider, attempt count, circuit state, duration

## 2. Routes

Move route handlers out of `server.ts` into dedicated files:

```
src/routes/
  provider.routes.ts   — GET /provider, POST /provider
  user.routes.ts       — POST /users/register, POST /users/reset-password
  health.routes.ts     — GET /health (provider status, CB state, latency)
```

Each exports `registerRoutes(fastify, deps)`.

`server.ts` imports and registers them — no inline handlers.

### GET /health

Returns:
```json
{
  "status": "ok" | "degraded",
  "provider": "smtp",
  "circuitBreaker": "closed" | "open" | "half_open",
  "uptime": 12345
}
```

## 3. Error Types

`src/errors.ts`:

- `EmailSendError` — base error
- `TransientError extends EmailSendError` — network timeout, 5xx, retryable
- `PermanentError extends EmailSendError` — auth failure, invalid recipient, not retryable
- `CircuitBreakerOpenError extends EmailSendError` — fast-fail when CB open

## 4. Factory

`src/sender.factory.ts`:

- `createRobustSender(provider, config)` — composes decorators
- Validates config with Zod
- Reads env vars with defaults

## 5. Logging

- pino logger instance
- `LOG_LEVEL` env var (default: `info`)
- `LOG_FILE` env var (optional, sends JSON logs to file if set)
- Logger passed to `LoggingSender` and optionally to `CircuitBreakerSender` for state changes

## 6. Tests

Per decorator:

- `tests/retry-sender.test.ts`
- `tests/circuit-breaker.test.ts`
- `tests/logging-sender.test.ts`
- `tests/health.routes.test.ts`
- Update existing tests if needed

## Files to create

```
src/
  lib/
    state-machine.ts
  decorators/
    retry.sender.ts
    circuit-breaker.sender.ts
    logging.sender.ts
  routes/
    provider.routes.ts
    user.routes.ts
    health.routes.ts
  sender.factory.ts
  errors.ts
```

## Files to modify

```
src/server.ts          — use router files + factory
src/providers/index.ts — may need minor refactor
```

## 7. Generic State Machine

A reusable `StateMachine<S, E>` utility that powers the circuit breaker (and later the order lifecycle in project 03).

### Config format

```typescript
type MachineConfig<S extends string, E extends string> = {
  initial: S;
  states: {
    [state in S]: {
      on: Partial<Record<E, S>>;
    };
  };
};
```

### API

- `createMachine(config)` — creates machine instance
- `.state` — getter for current state
- `.can(event)` — returns boolean, no side effects
- `.dispatch(event)` — transition or throw for invalid
- `.onEnter(state, callback)` — hook fired after entering a state
- `.reset()` — back to initial state

### File

`src/lib/state-machine.ts` — generic, no email-specific code.

## Out of scope

- Persistence / outbox pattern
- Template engine
- Additional providers (SendGrid, Mailgun)
- Rate limiting (project 02)

