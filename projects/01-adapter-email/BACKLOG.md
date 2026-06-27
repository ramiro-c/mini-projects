# Project 01 - Adapter Pattern (Email Providers) - Backlog

> Esta lista es solo de ideas futuras. Lo que ya está implementado vive en `README.md`.

## Ideas futuras

### Más providers reales

- SendGrid adapter (API REST)
- Mailgun adapter
- AWS SES adapter
- Console adapter (para dev solamente)

### Persistence + queue

- SQLite para email log/outbox
- Cola simple (in-memory o Redis) para async sending
- Retry queue para fallidos

### Template engine

- Handlebars/EJS para email templates
- Template inheritance
- Variables por usuario

### Rate limiter + throttling

- Strategy pattern aplicado aquí
- Diferentes estrategias por provider

