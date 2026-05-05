# Project structure

This document is the **canonical guide** for where code lives in **ManyLanguagesPlatform**. Use it when adding or moving files so the codebase stays consistent and easy to navigate.

**Naming note.** We use top-level **`src/features/`** for product modules. A folder named **`domain/`** means **`features/<feature>/domain/`** (pure rules for that feature), not a separate top-level `domains/` tree.

---

## Goals

- **Predictable placement** — apply the same rules without debating every file.
- **Thin routes** — `src/app/**` is for the App Router: layouts, pages, and thin composition. Business logic does not live in route files.
- **Cohesive features** — each product surface owns its UI, data access, validations, and types in one place.
- **`lib/` stays generic** — infrastructure and reusable utilities without product meaning.
- **Admin and portal** share data and patterns, not duplicated implementations — variant UI, shared queries.

---

## The three-question rule

When you add or move a file, ask in this order:

1. **Is it generic UI with no business meaning?**  
   (Primitives: buttons, cards, alerts, tables, form fields.)  
   → **`src/components/ui/`** (design system).

2. **Does it belong to exactly one product feature?**  
   (Dashboard, studies, feedback, codebook, notifications, profile, admin invitations, auth helpers, shell, …)  
   → **`src/features/<feature>/`** — typically `ui/`, `queries/`, `mutations/`, `actions/`, `validations.ts` (or `validations/`), optional `domain/`, `server/`, `context/`, `hooks/`, `types.ts`, `index.ts`.

3. **Is it cross-cutting infrastructure or a pure utility?**  
   (Auth guards, DB client, JATOS, email, logging, date formatting.)  
   → **`src/lib/`**.

If nothing fits cleanly, default to **a feature** — even a small one.

**Route folders** (`src/app/**`) should contain:

- `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `route.ts`, and similar App Router files.
- **Thin** composition: import from `@/src/features/...`, `@/src/components/ui/...`, and `@/src/lib/...`.
- **Route-only** snippets that are not reused elsewhere. If it grows or is imported from multiple routes, move it into the right feature or the design system.

---

## Target layout (reference)

```text
src/
├─ app/                            # Next.js App Router — routes only
│  ├─ (app)/                       # Portal (researcher + participant)
│  ├─ admin/                         # Staff admin
│  ├─ (auth)/                        # Login, signup, password flows
│  └─ api/                           # Route handlers, webhooks, cron
│
├─ features/                         # Product modules
│  ├─ shared/types.ts                # Cross-feature domain types (sparingly)
│  ├─ dashboard/
│  ├─ studies/
│  ├─ feedback/
│  ├─ codebook/
│  ├─ notifications/
│  ├─ profile/
│  ├─ admin-invitations/
│  ├─ auth/                          # e.g. current-user query, auth hooks
│  ├─ shell/                         # App chrome (e.g. navbar)
│  └─ …
│
├─ components/
│  └─ ui/                            # Design system (target location)
│
├─ lib/                              # Infrastructure & generic utilities
│  ├─ auth/
│  ├─ jatos/
│  ├─ email/
│  ├─ logger/
│  ├─ validation/                    # Zod primitives (no product meaning)
│  └─ utils/
│
└─ types/                            # Global TS types (rare)
```

**Today:** many design-system-style components still live under **`src/app/components/`** (historical). New generic UI should follow **`src/components/ui/`**, and existing files should **migrate over time** when you touch them or in a dedicated drain PR.

---

## Naming conventions

- **Feature folders** are **nouns**: `dashboard`, `studies`, `notifications`, …
- **Standard subfolders** (use when you have enough files to justify them):

  | Folder                             | Role                                                                             |
  | ---------------------------------- | -------------------------------------------------------------------------------- |
  | `ui/`                              | Components — Server Components by default                                        |
  | `ui/client/` or nested `client/`   | Client-only files; each file should start with `"use client"`                    |
  | `context/`                         | Feature-owned React context                                                      |
  | `queries/`                         | Blitz **read** RPC — each file must `export default` a resolver (see below)      |
  | `mutations/`                       | Blitz **write** RPC — same default-export rule                                   |
  | `actions/`                         | Blitz **actions** / workflows — same default-export rule                         |
  | `domain/`                          | **Pure** logic: no React, no Prisma, no JATOS in the same module                 |
  | `server/`                          | Private server implementation: DB, JATOS, RSC loaders, orchestration             |
  | `services/`                        | Optional: stable **server** APIs **other features** may call (export via barrel) |
  | `hooks/`                           | Feature hooks                                                                    |
  | `validations.ts` or `validations/` | Zod DTOs — prefer one file until ≥2 modules are needed                           |
  | `types.ts`                         | Feature-public TypeScript types                                                  |
  | `index.ts`                         | **Public** exports for routes and other features                                 |

- **`features/shared/`** — cross-feature **domain** pieces that are not generic enough for `lib/`. Prefer **`features/shared/types.ts`** for shared types; do not turn `shared/` into a junk drawer.

---

## Admin vs portal inside one feature

When both **admin** and **portal** use the same product area (e.g. studies):

- **Shared data** — `queries/`, `mutations/`, `domain/`; authorisation inside resolvers or guards.
- **Separate UI** — e.g. `ui/admin/`, `ui/researcher/`, `ui/participant/`, `ui/shared/`. Prefer **different files** over one huge component full of `if (role)` branches.
- **Imports** — admin pages must not import implementation from portal route folders, or vice versa. Both import **`features/<feature>/`**.

---

## Cross-feature dependencies

- Prefer **loose coupling**. Features may import **`components/ui/`** and **`lib/`** freely.
- **Avoid feature → feature** imports when possible. For shared **non-UI** symbols, use **`features/shared/types.ts`** or promote generic pieces to **`lib/validation/`** / **`lib/utils/`**.
- **Orchestration** at the boundary: **`page.tsx`** may compose multiple features.
- **`lib/` must not depend on `features/`** in the general case: `lib/` is a lower layer.  
  **Documented exceptions** (unavoidable integration): e.g. cron or JATOS code that must call study lifecycle APIs may import from **`@/src/features/studies`**. Prefer a **narrow import** (specific module) over pulling in wide barrels unless necessary. Some **`lib/jatos`** code may import **`features/feedback/domain`** for cohort statistics — treat as a deliberate edge and avoid widening the dependency.

**`services/` vs `server/`** (inside a feature):

- **`server/`** — private helpers used by this feature’s queries, mutations, actions, and routes.
- **`services/`** — entrypoints **other features’ server code** is expected to call (e.g. sending a notification). Export only what is stable from **`index.ts`**.

---

## Types and validation

| Kind                                                    | Where                                                   |
| ------------------------------------------------------- | ------------------------------------------------------- |
| Zod **primitives** (email, password, trimmed string, …) | `src/lib/validation/`                                   |
| Generic TS helpers (`Result`, `Maybe`, …)               | `src/lib/utils/` (or next to single use)                |
| Feature **forms / DTOs**                                | `features/<feature>/validations.ts` (or `validations/`) |
| Types owned by one feature                              | `features/<feature>/types.ts`                           |
| Cross-feature domain types                              | `features/shared/types.ts` (≥2 real consumers)          |
| Must be importable from `lib/`                          | `lib/` or `src/types/` — **not** under `features/`      |
| Database shapes                                         | `@prisma/client` — do not duplicate                     |

Promote a Zod field to **`lib/validation/`** when a **second** feature needs the same primitive.

Do not put Zod schemas in **`src/types/`** — that folder is for **TypeScript** declarations; Zod is runtime validation.

---

## Design system vs feature UI

| Location                     | Use for                                                               |
| ---------------------------- | --------------------------------------------------------------------- |
| **`src/components/ui/`**     | Generic building blocks: no domain types, no product-specific rules.  |
| **`features/<feature>/ui/`** | Screens and components that **know** domain shapes and product flows. |

If a file under **`src/app/components/`** imports **features**, **routes**, or **domain** logic, it probably belongs in a **feature**, not the design system.

---

## Feature UI: server vs client, and context

- **Default:** components under **`features/<feature>/ui/`** are **Server Components** unless they use **`"use client"`** or only exist for client behaviour.
- **`ui/client/`** (or `ui/<role>/client/`) — hooks, Blitz `useMutation`, browser APIs. Keep **`"use client"`** at the top of every file in those client-only trees.
- **`context/`** — providers and hooks that **only** make sense with that feature’s tree. **App-wide** chrome may live in **`features/shell/`** instead.

Prefer loading data in Server Components and passing props into small client islands.

---

## Layering inside a feature

### `domain/`

Pure business rules: in-memory testable, **no React**, **no Prisma**, **no JATOS** in the same module. Subfolders such as **`domain/setup/`**, **`domain/variables/`** group pure logic by topic.

### `server/`

Server-only code that **does** IO: Prisma, JATOS, RSC loaders, orchestration **behind** resolvers or pages. Not a Blitz RPC folder.

### `queries/`, `mutations/`, `actions/` (Blitz)

- **`queries/`** — reads; **`mutations/`** — writes; **`actions/`** — multi-step or workflow RPC today, aligned with a future move toward Next.js **server actions** under the same naming.
- **`actions/`** holds **public** entrypoints (default export callable from the client via Blitz).
- **`server/`** holds **private** helpers used only on the server.

|                 | `actions/` (and mutations/queries as RPC)     | `server/`                     |
| --------------- | --------------------------------------------- | ----------------------------- |
| **Role**        | Public RPC (or future `"use server"` exports) | Private implementation        |
| **Called from** | Client / Blitz                                | **Only** other server modules |

---

## Blitz RPC: scanner rules and gotchas

Blitz scans **`features/*/queries/*`**, **`mutations/*`**, and **`actions/*`** and wraps each file’s **default export** as an RPC handler.

1. **Every file** in those folders must **`export default`** something Blitz accepts as a resolver (e.g. `resolver.pipe(...)`). If there is no default or it is not resolver-shaped, the app can fail **at runtime** when the route loads — TypeScript may not warn you.

2. **Do not put non-resolver modules** (shared Prisma selects, plain constants-only files, RSC-only helpers) **inside** `queries/`, `mutations/`, or `actions/`. Place them at the **feature root** (e.g. `inviteSelect.ts`), in **`domain/`**, or in **`server/`**, depending on purity and IO.

3. **`"use server"`** — Next only allows certain exports from server action modules. Do not re-export **plain values** (numbers, objects) from `"use server"` files through the feature **`index.ts`** unless they are async callable functions. Keep constants in a non–`"use server"` sibling module if needed.

---

## What exists where (quick map)

| Concern                                                                       | Typical location                                                    |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Portal routes                                                                 | `src/app/(app)/` — thin `page.tsx` / `layout.tsx`                   |
| Admin routes                                                                  | `src/app/admin/`                                                    |
| Auth pages                                                                    | `src/app/(auth)/`                                                   |
| Dashboard, studies, feedback, codebook, notifications, profile, admin invites | `src/features/<name>/`                                              |
| Navbar / shell pieces                                                         | `src/features/shell/` (and related)                                 |
| Current user session query                                                    | `src/features/auth/queries/getCurrentUser.ts` (and hooks alongside) |
| JATOS, email, generic auth routing                                            | `src/lib/`                                                          |
| Database (Prisma)                                                             | Project `db/` module (Blitz / Next convention)                      |

This map is indicative; **`src/features/`** is the source of truth for module boundaries.
