# Error handling policy (ManyLanguagesPlatform)

This document is the **canonical policy** for how errors are classified, surfaced to users, and logged. Use it when adding features or changing existing behavior.

**See also:**

- **[JATOS API usage](./JATOS_API_USAGE.md#error-handling)** — JATOS-specific types, `mapJatosErrorToUserMessage`, logging helpers.
- **[Server component patterns](./SERVER_COMPONENT_PATTERNS.md#error-handling)** — `NotFoundError` → `notFound()` snippet.

When production behavior deliberately differs from this document, either **change the code** or **document the exception in a short “Policy exceptions” subsection at the bottom of this file** so the divergence is intentional and visible.

---

## 1. Goals

| Goal             | Meaning                                                                                                                                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Safe**         | User-visible copy must not expose stack traces, raw DB/JATOS text, tokens, internal paths, or payloads in **production**.                                                                                                                                  |
| **Robust**       | Expected failures are handled explicitly; unexpected failures are **logged** server-side before the user sees a generic message.                                                                                                                           |
| **Maintainable** | One set of conventions per **layer** (RSC, client boundary, server actions, HTTP routes); avoid ad hoc `error.message` in HTML/JSON.                                                                                                                       |
| **DRY**          | Reuse **`mapJatosErrorToUserMessage`** at JATOS trust boundaries; reuse **Blitz semantic errors** (`NotFoundError`, `AuthorizationError`, …) for resolver/auth semantics until migration; factor repeated “log + safe string” helpers if copy-paste grows. |

---

## 2. Expected vs unexpected errors

**Expected** (handle explicitly; UX can stay calm):

- Invalid input (Zod / validation — clear field or summary message).
- Forbidden access (`AuthorizationError` or equivalent).
- Missing resource (`NotFoundError` → `notFound()` or 404 semantics).
- Duplicate / conflict (e.g. **409** with a **fixed** message — no raw DB text).
- JATOS HTTP or transport failures (typed **`JatosApiError`** / **`JatosTransportError`**) → user-facing string via **`mapJatosErrorToUserMessage`** (never raw `error.message` by default).

**Unexpected** (bug, invariant broken, unknown **`Error`**):

- Log **full** detail server-side (`console.error` for now; a reporting SDK may supplement later).
- User sees **generic** copy in production (retry / generic failure wording).
- **Developer-only** detail: optional `error.message` only when gated on **`process.env.NODE_ENV === "development"`** (§5).

Do **not** `catch` and ignore without logging unless the case is intentionally best-effort (e.g. `localStorage` in a theme bootstrap script).

---

## 3. Layers and conventions

### 3.1 Server Components & RSC loaders

- Prefer **throwing** semantic errors from **`features/*/server`** helpers (Blitz **`NotFoundError`**, **`AuthorizationError`**, …) when the page should abort or map to **`notFound()`**.
- In the **page** (or thin orchestration), use **`try/catch`** to:
  - **`if (error.name === "NotFoundError") notFound()`** (or **`instanceof`** if you migrate away from **`name`** checks).
  - **Re-throw** other errors **or** render a recovery UI with **safe** fixed copy — do not render raw **`error.message`** in production (§5).
- **`catch` that returns UI:** log **`console.error`** with route/study identifiers (nothing sensitive to participants or third parties) before returning a generic **`Alert`**.

### 3.2 Route `error.tsx` (Client)

- Must be a **Client Component** (Next.js requirement).
- **Production:** generic title/body; **no** unconditional **`error.message`**.
- **Development:** optional secondary line showing **`error.message`**.
- **`useEffect`:** always **`console.error`** (prefer a stable label + the error).
- Prefer shared [`SegmentRouteError`](../src/components/ui/SegmentRouteError.tsx) in segment **`error.tsx`** files for one dev-gated pattern and optional **`extraActions`**. Root [`src/app/error.tsx`](../src/app/error.tsx) stays a minimal standalone boundary.

### 3.3 `not-found.tsx` vs errors

- **`notFound()`** / **`not-found.tsx`:** “this URL resource isn’t available” — may use **privacy-preserving** wording that avoids distinguishing “wrong id” vs “no access”.
- Uncaught failures: **`error.tsx`** — distinct “something failed” copy vs 404 where product allows it.

### 3.4 Server Actions (`"use server"`)

Choose per call site; both patterns are valid:

| Pattern                                                                 | When                                                                                                                                                                      |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Return `{ success: false, error: string }`** (or discriminated union) | Single interaction from the client; UI shows toast/inline feedback. Prefer **fixed** safe strings at trust boundaries; JATOS failures → **`mapJatosErrorToUserMessage`**. |
| **Throw**                                                               | Rare; align with framework behavior or deliberate propagation to a boundary.                                                                                              |

Broad **`catch`** that maps to user-safe payloads must **`console.error`** when the thrown value is **not** fully expected operational noise (**§6**).

For actions that **`catch`**, **`mapJatosErrorToUserMessage`**, and return **`{ success: false }`**: **`JatosApiError`** and **`JatosTransportError`** are treated as typed operational failures (**`isJatosMappedError`** in [`errors.ts`](../src/lib/jatos/errors.ts)); **omit** redundant **`console.error`** for those **only where** deeper layers already log or where duplicate noise would hide signal. Always log **`console.error`** for other thrown values (unexpected bugs, infra, Prisma, etc.) before returning generic copy.

Validated branches that return **`{ ok: false }`** without throwing do not need logging.

### 3.5 HTTP Route Handlers (`route.ts`)

- **4xx:** stable, deliberate messages (validation, auth). Do not echo arbitrary upstream/JATOS/DB strings to clients.
- **5xx:** **generic** JSON body for the client; **`console.error`** the full failure server-side. **Never** put raw **`Error.message`** in JSON for broad or unauthenticated consumers.
- JATOS-related routes: map failures with **`mapJatosErrorToUserMessage`** (and appropriate status when using **`JatosApiError`**) so client bodies stay safe.

### 3.6 JATOS integration

- App code uses **`jatosAccessService`** (not raw **`client/*`** except the documented browser upload path).
- HTTP failures are typed via **`throwIfJatosError`** → **`JatosApiError`** subclasses and **`JatosTransportError`** ([`src/lib/jatos/errors.ts`](../src/lib/jatos/errors.ts)).
- **User-facing:** **`mapJatosErrorToUserMessage(unknown)`** — do **not** default to **`error.message`** for browser, toast, or API JSON.
- **Operator / server logs:** **`logJatosError`** / **`sanitizeJatosLogContext`** ([`src/lib/jatos/logger.ts`](../src/lib/jatos/logger.ts)) when logging JATOS-shaped failures.

### 3.7 Blitz RPC (`queries/` / `mutations/`)

- **`NotFoundError`**, **`AuthorizationError`**, **`AuthenticationError`** are the **standard** semantic throws for resolvers while Blitz is in use.
- Client handling of RPC errors must not surface **raw** server messages to end users in production.
- After Blitz removal, keep the **same semantics** (404/401/403) at resolver boundaries with app-owned error types if needed.

---

## 4. `try/catch` vs return objects

- **`try/catch`** is appropriate wherever code **throws** (including **`await`** on throwing helpers).
- **`{ success: false, error }`** (or similar) fits **server actions** that report outcomes per interaction without using an error boundary for every click.
- A full **Result / railway** style across the codebase is **not** required; a hybrid is normal.

---

## 5. Production vs development user-visible detail

| Environment     | User-visible error detail                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Production**  | Fixed copy, **`mapJatosErrorToUserMessage`**, or validation summaries only.                                       |
| **Development** | Optional **`error.message`** in **`error.tsx`** or similar **only if** gated on **`NODE_ENV === "development"`**. |

**Never** put tokens, other users’ pseudonyms, or full JATOS payloads in user-visible error strings.

---

## 6. Logging minimum

Until consolidated error reporting (e.g. Sentry) is standard:

1. **`error.tsx`:** `useEffect` → **`console.error`** (label + error).
2. **`catch` in RSC, server actions, and routes:** **`console.error`** with a short stable label and safe correlation ids (e.g. **studyId**; omit participant pseudonyms unless a controlled internal diagnostic).
3. **JATOS-shaped failures:** prefer **`logJatosError`** where the codebase already attaches operation context.

---

## 7. Root `global-error.tsx`

Failures in **root** `layout.tsx` use [`src/app/global-error.tsx`](../src/app/global-error.tsx) — a normal **`error.tsx`** cannot render if the layout failed. Per Next.js, it supplies its own **`<html>` / `<body>`** and imports **`global.css`**. Use **production-safe** copy, **development-only** `error.message`, and **`useEffect` → `console.error`** on the boundary.

**Optional later:** a small **`logUnexpectedError`** + **`getSafePublicMessage`** helper for non-JATOS unknowns at scale; pairing **`console.error`** with an external reporting SDK.

---

## 8. Loading states (sibling concern)

**`loading.tsx`** and **Suspense** fallbacks belong to async UX alongside errors but **not** to the error module: keep loaders separate unless the team explicitly adds a shared “async state” abstraction.

**Detailed inventory:** [Loading UX audit](./refactor/loading.md) (`docs/refactor/loading.md`) — route loaders, Suspense effectiveness, navbar, accessibility notes.

---

## 9. Policy exceptions

Document here any deliberate, long-lived divergence from this file (what differs, why, when to reconsider). **None at present.**
