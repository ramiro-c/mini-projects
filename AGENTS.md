# Project conventions

## Package manager

Use **bun** (not npm). All projects in `projects/` are independent.

```bash
cd projects/<name>
bun install
bun run dev
bun run test
```

Lockfiles are `bun.lock` (not `package-lock.json`).

## Documentation workflow

- Root docs and project READMEs are in Spanish.
- Specs and plans in `docs/superpowers/` are in English.
- `docs/superpowers/README.md` is the index for active and archived design docs.
- `docs/superpowers/CONVENTIONS.md` defines naming, status, and archive rules.

## Project numbering

- `projects/01-*`, `projects/02-*`, etc. are the projects that already exist.
- New folders should use the next sequential number when a project is actually created.
- `IDEAS.md` is a backlog only; it does not reserve folder names.

## New project scaffold

```bash
cd projects
mkdir <name> && cd "$_"
bun init
```
