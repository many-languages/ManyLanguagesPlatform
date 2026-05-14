# Error handling policy (ManyLanguagesPlatform)

This document is the **canonical policy** for how errors are classified, surfaced to users, logged, and tested. Use it when adding features or cleaning up existing code.

**Related:**

- **[MVP checklist §3](./refactor/mvp-pre-ship-checklist.md#3-error-handling)** — release bar.
- **[Pre-MVP audit](./refactor/errors.md)** — as-built gaps vs this policy (cleanup backlog).
- **[JATOS API usage](./JATOS_API_USAGE.md#error-handling)** — JATOS-specific types and `mapJatosErrorToUserMessage`.
- **[Server component patterns](./SERVER_COMPONENT_PATTERNS.md#error-handling)** — `NotFoundError` → `notFound()` snippet.

If this policy disagrees with behavior in production, **update code** or **explicitly document** the exception here first.

---

## 1. Goals

| Goal             | Meaning                                                                                                                                                                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Safe**         | User-visible copy must not expose stack traces, raw DB/JATOS text, tokens, or internal paths in **production**.                                                                                                                           |
| **Robust**       | Expected failures are handled explicitly; unexpected failures are **logged** before becoming a generic message.                                                                                                                           |
| **Maintainable** | One set of conventions per **layer** (RSC, client boundary, server actions, HTTP routes); avoid ad hoc `error.message` in HTML/JSON.                                                                                                      |
| **DRY**          | Reuse **`mapJatosErrorToUserMessage`** for JATOS; reuse **Blitz semantic errors** for app auth/not-found until a post-Blitz migration; add a small **`logAndReturnSafeMessage`** (or equivalent) for generic catches if copy-paste grows. |

---

## 2. Expected vs unexpected errors

Use the same mental model as the MVP checklist:

**Expected (handle explicitly, often no “scary” UX):**

- Invalid input (Zod / validation — clear field or summary message).
- Forbidden access (`AuthorizationError` or equivalent).
- Missing resource (`NotFoundError` → `notFound()` or 404 semantics).
- Duplicate / conflict (e.g. 409 with a **fixed** message — no raw DB text).
- JATOS unavailable or HTTP error (typed **`JatosApiError`** / **`JatosTransportError`** — user copy via **`mapJatosErrorToUserMessage`**).

**Unexpected (bug, invariant broken, unknown `Error`):**

- Log **full** detail server-side (`console.error` today; error reporting later).
- Surface **generic** copy to users in production (`Something went wrong` + retry/support).
- Optional **developer detail** only when `process.env.NODE_ENV === "development"` (see §5).

Do **not** `catch` and ignore without logging unless the case is intentionally best-effort (e.g. `localStorage` in a theme bootstrap script).

---

## 3. Layers and conventions

### 3.1 Server Components & RSC loaders

- Prefer **throwing** semantic errors from **`features/*/server`** helpers (e.g. Blitz **`NotFoundError`**, **`AuthorizationError`**) when the page should abort or map to **`notFound()`**.
- In the **page** (or thin orchestration), use **`try/catch`** to:
  - **`if (error.name === "NotFoundError") notFound()`** (or `instanceof` if you migrate away from `name` checks).
  - **Re-throw** other errors **or** render a fatality UI with **safe** copy — do not render raw **`error.message`** in production (see §5).
- **`catch` that returns UI:** log **`console.error`** with context (studyId, route) before returning a generic **`Alert`**.

### 3.2 Route `error.tsx` (Client)

- Must be a **Client Component** (Next.js requirement).
- **Production:** generic title/body; **no** unconditional **`error.message`**.
- **Development:** optional monospace / secondary line showing **`error.message`** (see **`src/app/(app)/studies/[studyId]/error.tsx`**).
- **`useEffect`:** always **`console.error(error)`** (or project logger) so failures are visible in server/client logs.

### 3.3 `not-found.tsx` vs errors

- **`notFound()`** / **`not-found.tsx`**: user expected “this thing isn’t here” (and/or **privacy-preserving** combined copy for “no access”).
- **Uncaught throw / boundary**: **`error.tsx`** — “something failed” — keep copy distinct from 404 where possible.

### 3.4 Server Actions (`"use server"`)

Two valid patterns — **choose per call site**, do not mandate one globally:

| Pattern                                                                 | When                                                                                                                                                                                           |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Return `{ success: false, error: string }`** (or discriminated union) | Client invokes the action for a **single interaction** (form submit, button); UI shows toast / inline error. Prefer **safe** strings; use **`mapJatosErrorToUserMessage`** for JATOS failures. |
| **Throw**                                                               | Rare for actions; use when aligning with a framework convention or you want the error to propagate to a boundary (unusual for typical mutations).                                              |

**Rule:** Broad **`catch`** that swallows must **`console.error`** unless the failure is fully expected and already represented in the return value (e.g. validated branch).

### 3.5 HTTP Route Handlers (`route.ts`)

- **4xx:** stable, intentional messages (validation, auth). Avoid echoing raw upstream text.
- **5xx:** **generic** JSON message to the client; **`console.error`** full error server-side. **Never** return raw **`Error.message`** for unauthenticated or broad clients (see import route hardening in **[refactor/errors.md](./refactor/errors.md)**).

### 3.6 JATOS integration

- App code uses **`jatosAccessService`** (not raw **`client/*`** except the documented browser upload).
- HTTP failures are typed via **`throwIfJatosError`** → **`JatosApiError`** subclasses and **`JatosTransportError`** ([`src/lib/jatos/errors.ts`](../src/lib/jatos/errors.ts)).
- **User-facing:** **`mapJatosErrorToUserMessage(unknown)`** — do **not** default to **`error.message`** for browser/toast/API JSON.
- **Operator-facing:** **`logJatosError`** / **`sanitizeJatosLogContext`** ([`src/lib/jatos/logger.ts`](../src/lib/jatos/logger.ts)) when logging JATOS operations.

### 3.7 Blitz RPC (`queries/` / `mutations/`)

- **`NotFoundError`**, **`AuthorizationError`**, **`AuthenticationError`** remain the **standard** semantic throws for resolvers until Blitz is removed.
- Client handling of RPC errors should not surface **raw** server messages to end users in production.
- **Future (post-Blitz):** replace with app-owned error classes **same semantics** (404/401/403) at resolver boundaries — no need to introduce a parallel hierarchy before migration unless the team prefers it.

---

## 4. `try/catch` vs return objects

- **`try/catch`** is **recommended** wherever code **throws** (including `await` on throwing helpers). It is not an anti-pattern.
- **`{ success: false, error }`** is **recommended** for **server actions** that return structured outcomes to the client **without** relying on an error boundary for every click.
- **Do not** migrate the whole codebase to **Result / railway** types for MVP; hybrid is normal.

---

## 5. Production vs development user-visible detail

| Environment     | User-visible error detail                                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Production**  | Fixed or **`mapJatosErrorToUserMessage`** / validation summaries only.                                                        |
| **Development** | Optional **`error.message`** (or digest) in **`error.tsx`** / debug UI **only if** gated on **`NODE_ENV === "development"`**. |

**Never** send tokens, pseudonyms of other users, or full JATOS payloads in error messages.

---

## 6. Logging minimum

Until a centralized service (e.g. Sentry) is adopted:

1. **`error.tsx`:** `useEffect` → `console.error(error)`.
2. **`catch` in RSC / actions / routes:** `console.error` with a short label and ids (studyId, userId when safe).
3. **JATOS:** prefer **`logJatosError`** when the failure is JATOS-shaped.

---

## 7. Root `global-error.tsx`

**Implemented:** [`src/app/global-error.tsx`](../src/app/global-error.tsx). It handles failures in the **root** `layout.tsx` (when a normal `error.tsx` cannot render because the layout itself failed). Per Next.js, it defines its own `<html>` / `<body>`, imports **`global.css`**, and uses the same **production-safe** copy + **dev-only** `error.message` detail as segment boundaries. Logs with **`useEffect` → `console.error`**.

### Optional later

- **Central helper** (e.g. `logUnexpectedError` + `getSafePublicMessage`) for non-JATOS unknowns.
- **Error reporting SDK** (Sentry, etc.) alongside `console.error`.

---

## 8. Loading states (sibling concern)

Pending UI (**`loading.tsx`**, **Suspense** fallbacks) is part of the same **async UX** story as errors but uses **different** mechanisms. See MVP checklist §3 and existing **`loading.tsx`** files. Do not merge loading and error helpers into one module unless the team explicitly wants a shared “async state” abstraction.

---

## 9. Cleanup backlog (from audit)

Track detailed file-level gaps in **[refactor/errors.md](./refactor/errors.md)**. Policy-level items to close for MVP:

1. Unify segment **`error.tsx`** on the dev-gated detail pattern.
2. Harden **`POST /api/jatos/import`** 500 body (no raw `Error.message`).
3. Remove or gate **RSC** `error.message` in production alerts.
4. Ensure **catch-all** server actions log unexpected failures.

---

## 10. Review checklist (new code)

- [ ] User-visible strings are **safe** in production (no raw `Error.message` / Prisma / JATOS body).
- [ ] JATOS path uses **`mapJatosErrorToUserMessage`** (or fixed copy) at trust boundaries.
- [ ] **`catch`** paths log unexpected errors.
- [ ] **`NotFoundError`** is handled with **`notFound()`** where the product expects a 404 UX.
- [ ] HTTP **5xx** responses use **generic** client bodies; detail stays server-only.
