# Microservicios con eventos — Fase 0 (Infra) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar el monorepo `projects/02-microservices-orders/` armado con bun workspaces y un `docker compose up` que levante RabbitMQ + Prometheus + Grafana + Jaeger, todo con healthchecks y verificable por smoke tests.

**Architecture:** Monorepo bun workspaces (`packages/*` + `services/*`). La infra vive en un `docker-compose.yml` del proyecto. El paquete `@orders/shared` arranca con su primer ladrillo testeable: un módulo `messaging` que se conecta a RabbitMQ y declara la topología base (topic exchange + dead-letter exchange). Los smoke tests verifican conectividad real contra los contenedores.

**Tech Stack:** Node 22, TypeScript (ESM), bun (workspaces + runtime de scripts), tsx, vitest, amqplib, Docker Compose. Imágenes: `rabbitmq:4-management`, `prom/prometheus:v2.55.0`, `grafana/grafana:11.4.0`, `jaegertracing/all-in-one:1.62.0`.

## Global Constraints

- Package manager: **bun** (no npm). Lockfile `bun.lock`. Scripts vía `bun run`.
- TypeScript en **ESM**: cada `package.json` lleva `"type": "module"`.
- Formato/lint: **biome** heredado de la raíz (tabs, comillas dobles, `lineWidth` 90, `trailingCommas: all`). No agregar config de biome por proyecto.
- DB por servicio = **SQLite** (entra en fase 1; en fase 0 no hay DB todavía).
- Zero servicios pagos. Todo local y dockerizado.
- Tests con **vitest**. Los smoke tests requieren `docker compose up -d` corriendo.
- Puertos host: RabbitMQ `5672`/`15672`, Prometheus `9090`, Grafana `3001`, Jaeger UI `16686`, OTLP `4317`/`4318`. (Grafana va a `3001` en host para no chocar con apps que usan `3000`.)
- Credenciales RabbitMQ de desarrollo: `guest` / `guest`.

---

## File Structure

```
projects/02-microservices-orders/
├── package.json                      # raíz del workspace (Task 1)
├── tsconfig.base.json                # config TS compartida (Task 1)
├── .gitignore                        # (Task 1)
├── .env.example                      # (Task 1)
├── docker-compose.yml                # RabbitMQ (Task 2) + observabilidad (Task 3)
├── infra/
│   └── prometheus/
│       └── prometheus.yml            # scrape config mínima (Task 3)
├── packages/
│   └── shared/
│       ├── package.json              # @orders/shared (Task 4)
│       ├── tsconfig.json             # (Task 4)
│       ├── vitest.config.ts          # (Task 4)
│       ├── src/
│       │   ├── messaging/
│       │   │   ├── connection.ts     # connect + topology (Task 4)
│       │   │   └── topology.ts       # nombres de exchanges/colas (Task 4)
│       │   └── index.ts              # re-exports (Task 4)
│       └── tests/
│           ├── infra.smoke.test.ts   # UIs/endpoints responden (Task 3)
│           └── messaging.connection.test.ts  # conexión real (Task 4)
└── README.md                         # cómo levantar la infra (Task 5)
```

**Decomposition:** Task 1 arma el esqueleto. Task 2 y 3 levantan infra incrementalmente (broker, luego observabilidad) — un reviewer podría aceptar el broker y rechazar la config de Prometheus, así que van separadas. Task 4 es el primer código de producto (wrapper de messaging) testeado contra el RabbitMQ real. Task 5 documenta y cierra la fase.

---

## Task 1: Scaffold del monorepo

**Files:**
- Create: `projects/02-microservices-orders/package.json`
- Create: `projects/02-microservices-orders/tsconfig.base.json`
- Create: `projects/02-microservices-orders/.gitignore`
- Create: `projects/02-microservices-orders/.env.example`

**Interfaces:**
- Produces: workspace raíz con `workspaces: ["packages/*", "services/*"]`; `tsconfig.base.json` que los sub-paquetes extienden.

- [ ] **Step 1: Crear el `package.json` raíz del workspace**

```json
{
	"name": "02-microservices-orders",
	"private": true,
	"type": "module",
	"workspaces": ["packages/*", "services/*"],
	"scripts": {
		"infra:up": "docker compose up -d",
		"infra:down": "docker compose down -v",
		"infra:logs": "docker compose logs -f",
		"test": "bun run --filter '*' test"
	},
	"devDependencies": {
		"@types/node": "^25.9.1",
		"tsx": "^4.19.0",
		"typescript": "^5.6.0",
		"vitest": "^4.1.8"
	}
}
```

- [ ] **Step 2: Crear `tsconfig.base.json`**

```json
{
	"compilerOptions": {
		"target": "ES2022",
		"module": "ES2022",
		"moduleResolution": "bundler",
		"strict": true,
		"skipLibCheck": true,
		"esModuleInterop": true,
		"forceConsistentCasingInFileNames": true,
		"resolveJsonModule": true,
		"declaration": true,
		"outDir": "dist"
	}
}
```

- [ ] **Step 3: Crear `.gitignore`**

```
node_modules/
dist/
*.sqlite
*.sqlite-journal
.env
```

- [ ] **Step 4: Crear `.env.example`**

```
RABBITMQ_URL=amqp://guest:guest@localhost:5672
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

- [ ] **Step 5: Instalar y verificar que el workspace se resuelve**

Run: `cd projects/02-microservices-orders && bun install`
Expected: crea `bun.lock` sin error. (Aún no hay sub-paquetes; el install debe completar igual.)

- [ ] **Step 6: Commit**

```bash
git add projects/02-microservices-orders/package.json projects/02-microservices-orders/tsconfig.base.json projects/02-microservices-orders/.gitignore projects/02-microservices-orders/.env.example projects/02-microservices-orders/bun.lock
git commit -m "feat(02-microservices-orders): scaffold del monorepo con bun workspaces"
```

---

## Task 2: RabbitMQ en Docker Compose

**Files:**
- Create: `projects/02-microservices-orders/docker-compose.yml`

**Interfaces:**
- Produces: servicio `rabbitmq` accesible en `localhost:5672` (AMQP) y `localhost:15672` (management UI), con healthcheck.

- [ ] **Step 1: Crear `docker-compose.yml` con RabbitMQ**

```yaml
name: orders-microservices

services:
  rabbitmq:
    image: rabbitmq:4-management
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval: 10s
      timeout: 5s
      retries: 10
```

- [ ] **Step 2: Levantar y esperar el healthcheck**

Run: `cd projects/02-microservices-orders && docker compose up -d && sleep 20 && docker compose ps`
Expected: `rabbitmq` en estado `Up` y `(healthy)`.

- [ ] **Step 3: Verificar el management API a mano**

Run: `curl -s -u guest:guest http://localhost:15672/api/overview | head -c 200`
Expected: JSON con info del nodo (no error de conexión).

- [ ] **Step 4: Commit**

```bash
git add projects/02-microservices-orders/docker-compose.yml
git commit -m "feat(02-microservices-orders): RabbitMQ con management y healthcheck"
```

---

## Task 3: Observabilidad en Compose + smoke test de infra

**Files:**
- Modify: `projects/02-microservices-orders/docker-compose.yml` (agregar 3 servicios)
- Create: `projects/02-microservices-orders/infra/prometheus/prometheus.yml`
- Create: `projects/02-microservices-orders/packages/shared/tests/infra.smoke.test.ts`

**Interfaces:**
- Consumes: el `rabbitmq` de Task 2.
- Produces: Prometheus (`9090`), Grafana (`3001`), Jaeger UI (`16686`) + OTLP (`4317`/`4318`) accesibles. Smoke test reutilizable que prueba conectividad HTTP.

- [ ] **Step 1: Crear la config mínima de Prometheus**

`infra/prometheus/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: prometheus
    static_configs:
      - targets: ["localhost:9090"]
```

- [ ] **Step 2: Agregar Prometheus, Grafana y Jaeger al `docker-compose.yml`**

Agregar bajo `services:` (después de `rabbitmq`):

```yaml
  prometheus:
    image: prom/prometheus:v2.55.0
    ports:
      - "9090:9090"
    volumes:
      - ./infra/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro

  grafana:
    image: grafana/grafana:11.4.0
    ports:
      - "3001:3000"
    environment:
      GF_AUTH_ANONYMOUS_ENABLED: "true"
      GF_AUTH_ANONYMOUS_ORG_ROLE: Admin
      GF_AUTH_DISABLE_LOGIN_FORM: "true"

  jaeger:
    image: jaegertracing/all-in-one:1.62.0
    ports:
      - "16686:16686"
      - "4317:4317"
      - "4318:4318"
    environment:
      COLLECTOR_OTLP_ENABLED: "true"
```

- [ ] **Step 3: Escribir el smoke test (debe fallar: faltan deps de vitest a nivel paquete)**

Primero, el paquete `shared` aún no existe. Crear `packages/shared/package.json` mínimo para poder correr vitest:

```json
{
	"name": "@orders/shared",
	"version": "0.0.0",
	"private": true,
	"type": "module",
	"scripts": {
		"test": "vitest run"
	},
	"devDependencies": {
		"vitest": "^4.1.8"
	}
}
```

Crear `packages/shared/tests/infra.smoke.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

const endpoints: Array<{ name: string; url: string; auth?: string }> = [
	{ name: "rabbitmq-mgmt", url: "http://localhost:15672/api/overview", auth: "guest:guest" },
	{ name: "prometheus", url: "http://localhost:9090/-/healthy" },
	{ name: "grafana", url: "http://localhost:3001/api/health" },
	{ name: "jaeger", url: "http://localhost:16686/" },
];

describe("infra smoke", () => {
	for (const ep of endpoints) {
		it(`${ep.name} responde 200`, async () => {
			const headers: Record<string, string> = {};
			if (ep.auth) {
				headers.Authorization = `Basic ${Buffer.from(ep.auth).toString("base64")}`;
			}
			const res = await fetch(ep.url, { headers });
			expect(res.status).toBe(200);
		});
	}
});
```

- [ ] **Step 4: Instalar deps del workspace**

Run: `cd projects/02-microservices-orders && bun install`
Expected: resuelve `@orders/shared` como workspace.

- [ ] **Step 5: Levantar la infra completa**

Run: `cd projects/02-microservices-orders && docker compose up -d && sleep 25 && docker compose ps`
Expected: `rabbitmq`, `prometheus`, `grafana`, `jaeger` todos `Up`.

- [ ] **Step 6: Correr el smoke test (debe pasar)**

Run: `cd projects/02-microservices-orders && bun run --filter '@orders/shared' test`
Expected: 4 tests PASS (los 4 endpoints responden 200).

- [ ] **Step 7: Commit**

```bash
git add projects/02-microservices-orders/docker-compose.yml projects/02-microservices-orders/infra projects/02-microservices-orders/packages/shared projects/02-microservices-orders/bun.lock
git commit -m "feat(02-microservices-orders): stack de observabilidad + smoke test de infra"
```

---

## Task 4: Wrapper de messaging — conexión y topología

**Files:**
- Modify: `projects/02-microservices-orders/packages/shared/package.json` (deps + exports)
- Create: `projects/02-microservices-orders/packages/shared/tsconfig.json`
- Create: `projects/02-microservices-orders/packages/shared/vitest.config.ts`
- Create: `projects/02-microservices-orders/packages/shared/src/messaging/topology.ts`
- Create: `projects/02-microservices-orders/packages/shared/src/messaging/connection.ts`
- Create: `projects/02-microservices-orders/packages/shared/src/index.ts`
- Create: `projects/02-microservices-orders/packages/shared/tests/messaging.connection.test.ts`

**Interfaces:**
- Consumes: RabbitMQ en `RABBITMQ_URL` (default `amqp://guest:guest@localhost:5672`).
- Produces:
  - `TOPOLOGY` — objeto con `{ exchange: "orders.events", deadLetterExchange: "orders.dlx" }`.
  - `connect(url?: string): Promise<MessagingConnection>` donde `MessagingConnection = { channel: Channel; close(): Promise<void> }`.
  - `assertTopology(channel: Channel): Promise<void>` — declara el topic exchange y el DLX (idempotente).

- [ ] **Step 1: Completar `packages/shared/package.json`**

```json
{
	"name": "@orders/shared",
	"version": "0.0.0",
	"private": true,
	"type": "module",
	"main": "src/index.ts",
	"exports": {
		".": "./src/index.ts"
	},
	"scripts": {
		"test": "vitest run"
	},
	"dependencies": {
		"amqplib": "^0.10.4"
	},
	"devDependencies": {
		"@types/amqplib": "^0.10.5",
		"vitest": "^4.1.8"
	}
}
```

- [ ] **Step 2: Crear `tsconfig.json` y `vitest.config.ts` del paquete**

`packages/shared/tsconfig.json`:

```json
{
	"extends": "../../tsconfig.base.json",
	"compilerOptions": {
		"outDir": "dist",
		"rootDir": "src"
	},
	"include": ["src"]
}
```

`packages/shared/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
	},
});
```

- [ ] **Step 3: Instalar las nuevas deps**

Run: `cd projects/02-microservices-orders && bun install`
Expected: `amqplib` y `@types/amqplib` instalados.

- [ ] **Step 4: Escribir el test de conexión y topología (debe fallar)**

`packages/shared/tests/messaging.connection.test.ts`:

```typescript
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connect, type MessagingConnection } from "../src/messaging/connection.js";
import { assertTopology } from "../src/messaging/topology.js";
import { TOPOLOGY } from "../src/messaging/topology.js";

describe("messaging connection", () => {
	let conn: MessagingConnection;

	beforeAll(async () => {
		conn = await connect();
	});

	afterAll(async () => {
		await conn.close();
	});

	it("se conecta y entrega un channel", () => {
		expect(conn.channel).toBeDefined();
	});

	it("declara la topología de forma idempotente", async () => {
		await assertTopology(conn.channel);
		// re-declarar con los mismos args no debe tirar error
		await assertTopology(conn.channel);
		// checkExchange resuelve sólo si el exchange existe
		await expect(conn.channel.checkExchange(TOPOLOGY.exchange)).resolves.toBeDefined();
		await expect(
			conn.channel.checkExchange(TOPOLOGY.deadLetterExchange),
		).resolves.toBeDefined();
	});
});
```

- [ ] **Step 5: Correr el test para verificar que falla**

Run: `cd projects/02-microservices-orders && bun run --filter '@orders/shared' test`
Expected: FAIL — `Cannot find module '../src/messaging/connection.js'`.

- [ ] **Step 6: Implementar `topology.ts`**

`packages/shared/src/messaging/topology.ts`:

```typescript
import type { Channel } from "amqplib";

export const TOPOLOGY = {
	exchange: "orders.events",
	deadLetterExchange: "orders.dlx",
} as const;

export async function assertTopology(channel: Channel): Promise<void> {
	await channel.assertExchange(TOPOLOGY.exchange, "topic", { durable: true });
	await channel.assertExchange(TOPOLOGY.deadLetterExchange, "topic", { durable: true });
}
```

- [ ] **Step 7: Implementar `connection.ts`**

`packages/shared/src/messaging/connection.ts`:

```typescript
import amqp, { type Channel, type ChannelModel } from "amqplib";

export interface MessagingConnection {
	channel: Channel;
	close(): Promise<void>;
}

const DEFAULT_URL = "amqp://guest:guest@localhost:5672";

export async function connect(
	url: string = process.env.RABBITMQ_URL ?? DEFAULT_URL,
): Promise<MessagingConnection> {
	const conn: ChannelModel = await amqp.connect(url);
	const channel = await conn.createChannel();
	return {
		channel,
		async close() {
			await channel.close();
			await conn.close();
		},
	};
}
```

- [ ] **Step 8: Crear `src/index.ts` con los re-exports**

`packages/shared/src/index.ts`:

```typescript
export { connect, type MessagingConnection } from "./messaging/connection.js";
export { assertTopology, TOPOLOGY } from "./messaging/topology.js";
```

- [ ] **Step 9: Correr el test (debe pasar, con la infra arriba)**

Run: `cd projects/02-microservices-orders && docker compose up -d && bun run --filter '@orders/shared' test`
Expected: PASS — conexión OK y exchanges declarados. (Verificable también en la UI de RabbitMQ → Exchanges: `orders.events` y `orders.dlx`.)

- [ ] **Step 10: Commit**

```bash
git add projects/02-microservices-orders/packages/shared projects/02-microservices-orders/bun.lock
git commit -m "feat(02-microservices-orders): wrapper de conexión a RabbitMQ + topología base"
```

---

## Task 5: README de la fase 0

**Files:**
- Create: `projects/02-microservices-orders/README.md`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: documentación de cómo levantar la infra y verificarla.

- [ ] **Step 1: Escribir el README**

`projects/02-microservices-orders/README.md`:

````markdown
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
````

- [ ] **Step 2: Commit**

```bash
git add projects/02-microservices-orders/README.md
git commit -m "docs(02-microservices-orders): README de la fase 0 (infra)"
```

---

## Self-Review (hecho)

- **Cobertura del spec:** Fase 0 del spec = "compose levanta RabbitMQ + Prometheus + Grafana + Jaeger; paquete `shared` con wrappers base; criterio: `docker compose up` verde y UIs accesibles". Cubierto por Tasks 2–4; el smoke test (Task 3) es el criterio de "listo" automatizado. El wrapper base de messaging (Task 4) es el primer ladrillo de `shared`; los wrappers más profundos (publish/consume con retries, telemetry, outbox, idempotency) pertenecen a la Fase 1 y se planifican aparte — por diseño del faseado.
- **Placeholders:** ninguno; todo el código y los comandos están completos.
- **Consistencia de tipos:** `connect()` → `MessagingConnection { channel, close() }`, `assertTopology(channel)`, `TOPOLOGY.{exchange,deadLetterExchange}` se usan idénticos en el test (Task 4 Step 4) y en la implementación (Steps 6–8).

## Próximas fases (planes separados, uno por fase)

- **Fase 1:** coreografía — 4 servicios, outbox + idempotencia + DLQ/retries + tracing/métricas vía `shared`.
- **Fase 2:** dashboards de Grafana + métricas de negocio.
- **Fase 3:** `orchestrator-service` (saga con compensaciones).
- **Fase 4:** inyección de fallos + demo guiada + documentación completa.
