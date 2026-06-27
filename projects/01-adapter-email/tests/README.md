# Tests

## Run Tests

```bash
# Watch mode
bun run test

# Single run
bun run test:run
```

## Test Structure

- `tests/providers.test.ts` - Tests para los adapters (SMTP, File, Null) y factory
- `tests/user.service.test.ts` - Tests para el service layer con mocks

## Coverage

Para agregar coverage, instalar `@vitest/coverage-v8` y ejecutar:

```bash
bunx vitest run --coverage
```