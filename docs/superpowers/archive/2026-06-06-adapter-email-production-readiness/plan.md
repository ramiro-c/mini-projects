> **Status:** Implemented (2026-06)
> **Project:** `projects/01-adapter-email/`
> **Superseded by:** `projects/01-adapter-email/README.md`

# Adapter Email — Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add retries (exponential backoff), circuit breaker, structured logging, health endpoint, and route separation to the email adapter project.

**Architecture:** Decorator Pattern — each concern implements `EmailSender` and wraps another. Composition: `Logging(CircuitBreaker(Retry(realSender)))`. Circuit breaker powered by a generic reusable `StateMachine`.

**Tech Stack:** TypeScript 5, pino (logging), Zod (config validation), Vitest (tests). Routes use Fastify plugin injection pattern.

---

## File Structure

```
src/
  lib/
    state-machine.ts            — generic reusable state machine
  decorators/
    retry.sender.ts             — RetrySender (EmailSender wrapper)
    circuit-breaker.sender.ts   — CircuitBreakerSender (EmailSender wrapper)
    logging.sender.ts           — LoggingSender (EmailSender wrapper)
  routes/
    provider.routes.ts          — GET/POST /provider
    user.routes.ts              — POST /users/register, /users/reset-password
    health.routes.ts            — GET /health
  errors.ts                     — error hierarchy
  sender.factory.ts             — composes decorators, reads env
  server.ts                     — just registers routes (modified)
tests/
  lib/
    state-machine.test.ts
  decorators/
    retry-sender.test.ts
    circuit-breaker.test.ts
    logging-sender.test.ts
  routes/
    health.routes.test.ts
```

---

### Task 1: Generic State Machine

**Files:**
- Create: `src/lib/state-machine.ts`
- Test: `tests/lib/state-machine.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/lib/state-machine.test.ts
import { describe, expect, it } from "vitest";
import { createMachine } from "../../src/lib/state-machine";

describe("createMachine", () => {
  it("starts in initial state", () => {
    const m = createMachine({
      initial: "idle",
      states: {
        idle: { on: { start: "running" } },
        running: { on: { stop: "idle" } },
      },
    });
    expect(m.state).toBe("idle");
  });

  it("transitions on valid event", () => {
    const m = createMachine({
      initial: "idle",
      states: { idle: { on: { start: "running" } }, running: { on: { stop: "idle" } } },
    });
    m.dispatch("start");
    expect(m.state).toBe("running");
  });

  it("throws on invalid transition", () => {
    const m = createMachine({
      initial: "idle",
      states: { idle: { on: { start: "running" } }, running: { on: { stop: "idle" } } },
    });
    expect(() => m.dispatch("stop")).toThrow();
  });

  it("can() returns whether event is valid in current state", () => {
    const m = createMachine({
      initial: "idle",
      states: { idle: { on: { start: "running" } }, running: { on: { stop: "idle" } } },
    });
    expect(m.can("start")).toBe(true);
    expect(m.can("stop")).toBe(false);
  });

  it("fires onEnter hooks when entering a state", () => {
    const m = createMachine({
      initial: "idle",
      states: { idle: { on: { start: "running" } }, running: { on: { stop: "idle" } } },
    });
    let entered = "";
    m.onEnter("running", () => { entered = "running"; });
    m.dispatch("start");
    expect(entered).toBe("running");
  });

  it("reset() goes back to initial state", () => {
    const m = createMachine({
      initial: "idle",
      states: { idle: { on: { start: "running" } }, running: { on: { stop: "idle" } } },
    });
    m.dispatch("start");
    m.reset();
    expect(m.state).toBe("idle");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/state-machine.test.ts`
Expected: FAIL — module not found

... (rest of plan omitted in archive)

