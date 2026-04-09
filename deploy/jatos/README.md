# JATOS configuration assets

This directory holds **JATOS-specific files** consumed by `deploy/compose/services/jatos.yml`.

- **`jatos.conf`** — mounted into the JATOS container
- **`jatos-api.yaml`** — API reference (optional tooling / docs)

There is **no** separate Docker Compose stack here; use `make dev-jatos-only`, `make dev-host-app`, `make dev-fullstack`, or `make prod-up` from the repository root (see `deploy/README.md`).
