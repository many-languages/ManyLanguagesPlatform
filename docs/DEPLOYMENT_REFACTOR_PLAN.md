# Deployment Refactor Plan

## Purpose

This document defines a deployment refactor for the ManyLanguagesPlatform repository. The goal is to create a clean, mature deployment architecture with clear boundaries between:

- service definitions
- environment and mode overlays
- configuration
- secrets
- operational scripts
- documentation

The refactor must preserve the two valid operational modes that already exist:

1. **Standalone JATOS for local integration work**
2. **Full stack deployment for running the app, databases, JATOS, and reverse proxy together**

The problem is not that both modes exist. The problem is that they are currently expressed in different places with overlapping concerns and duplicated operational knowledge.

Running **two Compose projects that both define a `jatos` service** (for example root `docker-compose.yml` and `deploy/jatos/` at the same time) causes confusing failures: duplicate containers, port contention, Traefik routing to the wrong upstream, and misleading validation commands. The refactor must make **one canonical JATOS definition** and **explicit modes** so developers do not start overlapping stacks by accident.

> **Phase 5 (done):** Legacy root `docker-compose*.yml` files and the standalone `deploy/jatos` Compose stack (overrides, Makefile, duplicate cert scripts) are **removed**. JATOS config files remain under `deploy/jatos/` (`jatos.conf`, `jatos-api.yaml`). Use **`deploy/compose/`**, **`deploy/scripts/`**, and **`make`** targets — see `deploy/README.md`.

## Current State

**Canonical deployment** lives under `deploy/` (`compose/`, `env/`, `scripts/`, `traefik/`). The following described the **pre-refactor** split (kept for context):

- ~~Root-level Compose files~~ _(removed in Phase 5)_
- ~~Standalone `deploy/jatos` Docker Compose package~~ _(removed in Phase 5; config assets kept)_

### Problems in the current structure

- Deployment concerns are split between repo root and `deploy/jatos`.
- JATOS and Traefik concerns exist in more than one place (risk of **drift**: different image tags, labels, or mounts).
- Documentation is mode-specific instead of architecture-first.
- Runtime assets such as certs and dynamic Traefik config are not organized as part of one deployment system.
- The current structure makes it harder to see what is canonical and what is an override.
- **Operational hazard:** convenience targets that invoke root Compose (for example token validation) can start a **second** JATOS alongside `deploy/jatos`, breaking `jatos.localhost` or producing 404/502 until one stack is stopped.
- Future migration to Helm or Kubernetes would require untangling duplicated intent first.

## Refactor Goals

The refactor should produce a deployment architecture that is:

- **centralized**: all deployment assets live under a single top-level deployment directory
- **modular**: each service has one canonical definition
- **overlay-driven**: each deployment mode only overrides what it actually changes
- **explicit**: local dev, local HTTPS, standalone JATOS, and production are clearly named modes
- **documented**: one primary README explains the system before mode-specific instructions
- **migration-friendly**: service/config/mode separation should map cleanly to Helm values or Kubernetes overlays later

## Non-Goals

This refactor does **not** aim to:

- introduce Kubernetes now
- redesign all runtime infrastructure choices
- change application business logic
- remove support for standalone JATOS development
- optimize for every possible environment variant from day one

The scope is architecture cleanup, not infrastructure expansion.

## Design Principles

### 1. One deployment system

The repository should have one deployment home, for example `deploy/compose/` or `deploy/docker/`. Root should not be the long-term home for deployment entry points.

### 2. One canonical definition per service

Each service should be defined once in a base or service file. Overlays should only change:

- ports
- labels
- entrypoints
- mounted local certs
- environment-specific URLs
- startup commands when truly necessary

They should not re-specify full service definitions unless unavoidable.

### 3. Mode overlays, not separate systems

The following are modes of the same deployment architecture:

- `dev-jatos-only`
- `dev-host-app`
- `dev-fullstack`
- `prod`

These are not separate deployment products.

### 4. Clear separation of responsibilities

- **Service files** define containers, networks, volumes, health checks, and stable internal wiring.
- **Mode overlays** define how a given environment runs those services.
- **Env files** define configuration values.
- **Secrets** are injected externally or through environment-specific secret files excluded from git.
- **Scripts/Makefiles** are convenience wrappers only. They must not become the source of truth.
- **Docs** explain the architecture, then explain how to use each mode.

### 5. Prefer composition over duplication

If the same JATOS, Traefik, or database configuration appears in multiple places, it should be factored into a shared layer.

## Target Architecture

### Proposed top-level structure

```text
deploy/
├── README.md                          # Primary entry: architecture, modes, exact commands
├── compose/
│   ├── base.yml                       # Shared networks, default naming conventions (keep thin)
│   ├── services/                      # One canonical fragment per service (source of truth)
│   │   ├── app.yml
│   │   ├── postgres.yml
│   │   ├── jatos.yml                  # Same fragment included by dev-jatos-only AND dev-fullstack
│   │   ├── jatos-db.yml
│   │   ├── traefik.yml
│   │   ├── mailhog.yml
│   │   └── cron-study-status.yml
│   ├── modes/                         # Thin overlays: labels, ports, TLS, which services to run
│   │   ├── dev-jatos-only.yml
│   │   ├── dev-host-app.yml
│   │   ├── dev-fullstack.yml
│   │   ├── dev-local-https.yml        # TLS/mkcert overlay where applicable (see below)
│   │   └── prod.yml
│   └── bundles/                       # Optional: tiny files that only list compose `-f` chains for ergonomics
│       ├── standalone-jatos.yml       # include-only or documented equivalent; not a second JATOS definition
│       └── fullstack.yml
├── env/
│   ├── shared.env.example
│   ├── dev-jatos-only.env.example
│   ├── dev-host-app.env.example
│   ├── dev-fullstack.env.example
│   └── prod.env.example
├── traefik/
│   ├── dynamic/
│   ├── certs/
│   └── acme/
├── jatos/
│   ├── jatos.conf
│   └── jatos-api.yaml                 # Reference / OpenAPI (if kept in repo)
└── scripts/
    ├── dev-jatos-only.sh
    ├── dev-fullstack.sh
    ├── prod-up.sh
    └── gen-certs.sh
```

**Naming:** Root `docker-compose.yml` is not required long-term; `deploy/compose/` is the canonical home. Convenience wrappers should not remain at the repo root after the migration.

This exact shape can be adjusted, but the responsibilities should remain the same: **services/** holds definitions once; **modes/** selects and tweaks; **bundles/** are optional sugar, not parallel architectures.

## Boundary Definitions

### `deploy/compose/services/`

Contains service-level Compose fragments. These are the closest thing to canonical service definitions.

Rules:

- each file owns one service or a tightly coupled pair
- definitions should be reusable across modes
- no environment-specific domain assumptions unless they are intrinsic to the service
- no local-only cert paths unless the file exists specifically for Traefik base behavior

Example ownership:

- `app.yml`: Next.js/Blitz container
- `postgres.yml`: app PostgreSQL
- `jatos.yml`: JATOS app container
- `jatos-db.yml`: JATOS MySQL container
- `traefik.yml`: proxy container with base provider wiring

### `deploy/compose/modes/`

Contains environment and runtime overlays.

Rules:

- overlays may adjust labels, ports, mounts, and env values
- overlays should not redefine all services from scratch
- each overlay should correspond to a named operational mode with a clear use case
- overlays should be thin and declarative

Examples:

- `dev-jatos-only.yml`: JATOS + JATOS DB + optional Traefik, no app container
- `dev-host-app.yml`: infra in Docker, app runs on host
- `dev-fullstack.yml`: app + all dependencies in Docker
- `prod.yml`: production labels, TLS, hardened defaults

### `deploy/env/`

Contains checked-in templates only.

Rules:

- commit only `.example` files
- do not mix root `.env` ownership with deployment templates long-term
- clearly separate shared variables from mode-specific variables
- document which values are required and who consumes them

### `deploy/scripts/`

Contains helper scripts for common commands.

Rules:

- scripts wrap Compose commands
- scripts must not carry unique business logic that is undocumented elsewhere
- scripts should be optional convenience, not the only usable interface

### `deploy/README.md`

This becomes the primary entry point for deployment documentation.

Rules:

- explain architecture first
- document available modes second
- give exact commands third
- keep mode-specific detail close to the mode, not scattered across unrelated directories

## Recommended Compose Model

The most maintainable model for this repository is:

1. A small `base.yml` for shared Compose concerns (networks, conventions)
2. **Service files** for canonical service definitions (`services/jatos.yml` is the only place the JATOS container image, mounts, and stable env are defined)
3. **Thin mode overlays** that select which services run and adjust labels, TLS, and published ports
4. **Optional** `bundles/*.yml` only if they improve ergonomics—they must **compose** the same service files, not duplicate them

### Compose composition mechanics

Document in `deploy/README.md` for every mode:

- **Merge order:** Multiple `-f` files merge left-to-right; **later files override** earlier ones for the same keys. The documented order per mode must be copy-pasteable.
- **`include:` (Compose v2.20+):** Optional alternative to long `-f` chains; either style is fine—pick one and document it consistently.
- **Build and volume paths:** After moving Compose under `deploy/compose/`, `build.context` for the app image and host bind mounts may need paths relative to the compose file (for example `context: ../..` to repo root). Validate each mode once.
- **Pinning:** JATOS image version (for example `jatos/jatos:3.10.1`) should be set in **one** service file so standalone and full stack never drift.

### Why this model is mature

- it makes the canonical location of each concern obvious
- it reduces duplication drift (one `jatos.yml` for all modes that need JATOS)
- it supports both standalone and full-stack operation without special-casing the repo
- it creates a natural path to Helm values files or Kustomize overlays later

## Role of Makefiles

`Makefile`s are valid in the target architecture, but only as convenience wrappers around the canonical deployment system.

They should improve ergonomics, not define a separate operational model.

### Allowed role

- provide short commands for common workflows
- wrap long `docker compose -f ...` invocations
- give the team stable entrypoints for the supported deployment modes

Examples:

- `make dev-jatos-only`
- `make dev-host-app`
- `make dev-fullstack`
- `make prod-up`
- `make prod-down`
- `make logs`

### Disallowed role

- owning unique deployment logic that does not exist in Compose files
- becoming the only place where a mode is defined
- preserving a mode-specific sub-system that drifts from the shared deployment architecture

### Recommendation

Prefer one top-level deployment `Makefile`, for example `deploy/Makefile`, or a very small number of clearly owned wrappers.

Do not keep standalone mode-specific `Makefile`s that imply separate deployment systems unless there is a strong operational reason.

## Recommended Modes

Modes are **not** separate products—they are different **`-f` selections** over the same `services/` layer.

| Mode             | App                   | App Postgres    | JATOS stack | Typical use                                                       |
| ---------------- | --------------------- | --------------- | ----------- | ----------------------------------------------------------------- |
| `dev-jatos-only` | host (out of Compose) | host or absent  | yes         | JATOS-only integration; minimal containers                        |
| `dev-host-app`   | host (out of Compose) | in Compose      | yes         | Day-to-day full-app dev: DB + JATOS in Docker, hot reload on host |
| `dev-fullstack`  | in Compose            | in Compose      | yes         | Onboarding, CI-like parity, reproducing “all in Docker”           |
| `prod`           | in Compose            | per prod choice | yes         | Deployed environment                                              |

`dev-local-https` is a **TLS overlay** (mkcert / local certs) applied on top of one of the dev modes—not a separate row: it swaps Traefik entrypoints/labels/certs without duplicating service definitions.

### 1. `dev-jatos-only`

Use case:

- local JATOS integration work (API, UI, studies)
- **no** app container; Next.js and app Postgres may run on the host or not at all

Includes:

- `jatos-db`
- `jatos`
- optional `traefik` (HTTP and/or HTTPS overlays)

Excludes:

- `app`
- `postgres` (app database)

Excludes optional extras unless explicitly added: `mailhog`, app cron.

This preserves the current **standalone JATOS** workflow and should use the **same** `services/jatos.yml` as full stack.

### 2. `dev-host-app`

Use case:

- **default “mature” local dev** for full-stack feature work: app and tooling on the host for fast iteration
- **infrastructure** (app Postgres, JATOS, MySQL, Traefik, Mailhog, etc.) in Docker

Includes:

- `postgres` (app)
- `jatos-db`
- `jatos`
- optional `traefik`, `mailhog`, and other dev dependencies as needed

Excludes:

- `app` container

**Difference from `dev-jatos-only`:** includes **app Postgres** (and any other deps the host app needs from Compose). Both modes assume the **Next.js app runs on the host**; the split is whether the **app database** is part of the Compose project.

### 3. `dev-fullstack`

Use case:

- everything runs in Docker
- useful for onboarding, reproduction, and environment parity checks

Includes:

- `app`
- `postgres`
- `jatos-db`
- `jatos`
- `traefik`
- optional support services such as `mailhog`

### 4. `dev-local-https` (overlay)

Use case:

- TLS for `jatos.localhost` / `app.localhost` using local certs (for example mkcert)

Rules:

- implement as a **thin overlay** combined with `dev-jatos-only` or `dev-host-app` or `dev-fullstack`, not as a duplicate Traefik service definition
- document cert generation (`gen-certs.sh`) and required files under `deploy/traefik/certs/` (or equivalent)

### 5. `prod`

Use case:

- full deployed stack
- stable public routing
- secrets and domains provided externally

Includes:

- production app container
- databases as applicable
- JATOS
- reverse proxy / TLS
- background jobs that belong to production operation

## Migration Strategy

The refactor should be done incrementally so the branch remains understandable and reversible.

### Phase 1. Establish the new deployment home

Create the new top-level deployment structure under `deploy/`.

Deliverables:

- `deploy/README.md`
- `deploy/compose/`
- `deploy/env/`
- `deploy/scripts/`
- relocated shared assets such as Traefik dynamic config and cert tooling

Rules:

- no behavioral changes yet unless required by relocation
- root Compose files may temporarily remain as compatibility wrappers

Status:

- implemented

### Phase 2. Extract canonical service definitions

Move shared service definitions out of the root and `deploy/jatos` split into service files.

Deliverables:

- canonical `jatos`
- canonical `jatos-db`
- canonical `traefik`
- canonical `app`
- canonical `postgres`

Success criteria:

- each service has one obvious source of truth
- duplicated labels, mounts, and env wiring are reduced

Status:

- implemented

### Phase 3. Define mode overlays

Create explicit overlays for:

- `dev-jatos-only`
- `dev-host-app`
- `dev-fullstack`
- `prod`

Success criteria:

- each mode is runnable with a documented Compose invocation
- each mode only overrides what differs from the shared service layer

Status:

- in progress

### Phase 4. Replace ad hoc docs and wrappers

Move mode-specific documentation into `deploy/README.md` and, if needed, short focused mode docs.

Deliverables:

- remove or rewrite `deploy/jatos/README.md`
- add consistent command examples
- add compatibility notes for developers currently using old commands

### Phase 5. Retire legacy layout

Once the new structure is stable:

- remove old root deployment files if no longer needed
- or keep minimal root wrappers that delegate to `deploy/compose/*`
- remove the old standalone `deploy/jatos` package if fully superseded

This phase should only happen after the new path is proven.

Status:

- **implemented** — Root `docker-compose*.yml` files removed. Standalone `deploy/jatos` Compose stack (`docker-compose.yml`, overrides, `Makefile`, `.env.example`, duplicate `dynamic/` + `scripts/gen-certs.sh`) removed. `deploy/jatos/` retains `jatos.conf`, `jatos-api.yaml`, and a short `README.md`. Use `make` / `deploy/scripts/*.sh` and `deploy/compose/` only.

## Compatibility Strategy

To reduce disruption, the refactor should preserve old workflows briefly.

Recommended approach:

- keep existing commands working during the transition if easy
- add a short deprecation note in old entry points
- migrate docs first, then switch defaults
- remove legacy files only after the new commands have been validated

Examples:

- root `docker-compose.yml` could temporarily become a thin compatibility bundle
- `deploy/jatos/Makefile` could call the new mode bundle during transition

### Validation and one-off tooling

Some scripts (for example **JATOS API token validation**) today run a **Compose service** that **`depends_on` JATOS** and uses the internal hostname `http://jatos:9000`. That implicitly starts **this repo’s** JATOS container and can collide with **`dev-jatos-only`** if both are run at once.

After the refactor:

- document **which mode** validation targets (typically **`dev-fullstack`** or the same compose project that includes `jatos`), **or**
- provide a **host-based** check (`curl` / `node` with `JATOS_BASE=https://jatos.localhost`) for developers who only run JATOS via **`dev-jatos-only`**

Goal: no hidden second stack when validating tokens.

## Configuration Strategy

The refactor should make configuration ownership explicit.

### Shared config

Values used by multiple modes should live in a shared template, for example:

- service names
- database names
- default ports
- app and JATOS public base URLs

### Mode-specific config

Values that differ by mode should be isolated, for example:

- local domains
- TLS settings
- production email provider values
- production secrets

### Secrets

Secrets should not be embedded in Compose files beyond variable references.

Examples:

- `SESSION_SECRET_KEY`
- `JATOS_TOKEN`
- database passwords
- TLS email

The plan should move the repo toward:

- committed example env files
- local untracked env files per mode
- clear documentation of secret ownership

## Documentation Strategy

The documentation should reflect the architecture, not just commands.

### Required docs

- `deploy/README.md`: architecture and usage
- `docs/DEPLOYMENT_REFACTOR_PLAN.md`: this refactor plan

### Optional docs

- `deploy/docs/modes.md`
- `deploy/docs/env.md`
- `deploy/docs/troubleshooting.md`

### Documentation order

Each deployment doc should explain:

1. what this mode/system is for
2. which services it includes
3. which config it requires
4. how to run it
5. how to debug it

## Rules for a Mature Structure

The refactor should enforce these boundaries:

- repo root is for application source and a minimal number of top-level operational entry points
- `deploy/` owns deployment artifacts
- service definitions do not carry environment-specific sprawl
- overlays do not become full copies of services
- scripts do not become hidden architecture
- docs describe the canonical workflow, not historical exceptions

## Kubernetes / Helm Friendliness

This refactor should intentionally improve later migration without prematurely adopting Kubernetes concepts.

The proposed structure helps because it separates:

- stable service intent
- environment-specific overrides
- config templates
- secret references
- ingress/proxy concerns

Those map naturally later to:

- Deployments / StatefulSets
- Services
- ConfigMaps / Secrets
- Ingress
- Helm values files or Kustomize overlays

The key principle is: **normalize deployment boundaries now, not Kubernetes syntax now**.

## Acceptance Criteria

The refactor is successful when all of the following are true:

- all deployment assets live under a single canonical deployment area (`deploy/`)
- standalone JATOS remains supported (`dev-jatos-only` or equivalent)
- full stack deployment remains supported (`dev-fullstack` + `prod`)
- **JATOS is defined once** in `deploy/compose/services/jatos.yml` (or equivalent) and **included** by every mode that needs it—no copy-pasted `jatos:` service blocks
- Traefik-related deployment logic has one obvious home under `deploy/traefik/` (or `deploy/compose/services/traefik.yml` plus shared dynamic config)
- env templates are mode-aware and clearly documented under `deploy/env/*.env.example`
- the primary **`deploy/README.md`** explains the full architecture, **which modes exist**, **exact `-f` compose chains**, and **warning: do not run two stacks that both own `jatos.localhost` / ports 80–443**
- a new contributor can identify the available deployment modes in under a few minutes
- token validation and similar tooling either target a documented mode or a host-based URL—**no surprise second JATOS**
- the structure would allow a later migration to Helm/Kubernetes without first reorganizing the repo again

## Suggested Implementation Sequence

1. Create the new `deploy/` structure and documentation skeleton (`deploy/README.md`, `deploy/compose/services/`, `deploy/compose/modes/`, `deploy/env/`).
2. Move shared Traefik and JATOS assets into stable canonical paths (`deploy/traefik/`, `deploy/jatos/jatos.conf`, etc.).
3. Extract **canonical** Compose fragments: `jatos`, `jatos-db`, `traefik`, `postgres`, `app`—**verify** `dev-jatos-only` and `dev-fullstack` both reference the same `jatos.yml`.
4. Define **`dev-jatos-only`** and **`dev-fullstack`** first (current main use cases: standalone JATOS vs everything in Docker).
5. Add **`dev-host-app`** to formalize “Postgres + JATOS in Docker, app on host” (common daily workflow).
6. Add **`dev-local-https`** overlay and wire mkcert/certs paths once base HTTP modes work.
7. Add **`prod`** overlay last, after shared pieces are stable.
8. Align validation scripts and Makefile targets with the new modes (or document host-only validation for `dev-jatos-only`).
9. Validate commands and documentation for each mode on a clean machine checklist.
10. Remove or deprecate the old split layout (`deploy/jatos/` as a duplicate tree, root compose as sole source of truth) after the new path is proven.

## Final Recommendation

Keep both **operational** options (JATOS-only containers vs full stack), but **one** deployment system: shared **service** definitions, **mode** overlays, and **explicit** docs.

The mature structure is:

- **one** deployment home under `deploy/`
- **one** canonical definition per service (`deploy/compose/services/*.yml`)
- **multiple** clearly named modes (`deploy/compose/modes/*.yml`) that only differ by inclusion and overrides
- **thin** overlays (no full service duplication)
- **explicit** env templates (`deploy/env/*.env.example`)
- **centralized** documentation (`deploy/README.md` first, then this plan)

That gives cleaner boundaries now, avoids duplicate JATOS stacks, and makes a future move to Helm or Kubernetes materially easier.
