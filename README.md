# mini-projects

Repositorio de mini proyectos para aprender patrones de backend y microservicios en práctica.

## Quick path

1. Elegí un proyecto en la tabla de abajo.
2. Entrá a `projects/<nombre>/`.
3. Corré `bun install` y después `bun run dev` o `bun run test`.

## Proyectos implementados

| Proyecto | Patrón | Estado | README | Spec |
|---|---|---|---|---|
| `01-adapter-email` | Adapter + Decorator + state machine | Completo | [README](projects/01-adapter-email/README.md) | [Spec archivado](docs/superpowers/archive/2026-06-06-adapter-email-production-readiness/spec.md) |
| `02-microservices-orders` | Event-driven microservices + saga | Fase 0 completa | [README](projects/02-microservices-orders/README.md) | [Spec](docs/superpowers/specs/2026-06-26-microservices-orders-event-driven-design.md) |

## Documentación

- [docs/README.md](docs/README.md)
- [IDEAS.md](IDEAS.md)
- [AGENTS.md](AGENTS.md)

## Convenciones

- `bun` es el package manager del repo.
- `projects/` usa numeración secuencial solo para lo ya implementado.
- Las ideas nuevas viven en `IDEAS.md` sin asumir carpeta.
