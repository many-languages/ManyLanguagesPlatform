# Server Component Patterns

## Overview

This document outlines the patterns for using Server Components vs Client Components in this Next.js 15 application, following React Server Components (RSC) best practices.

---

## When to Use Server Components

**Use Server Components for:**

- Initial data fetching (database queries, API calls)
- Pages that primarily display data
- Components that don't need interactivity
- SEO-critical content
- Sensitive operations (authentication checks)

**Benefits:**

- Zero JavaScript shipped to client (smaller bundles)
- Direct database/API access
- Better SEO (fully rendered HTML)
- Automatic request deduplication via `cache()`

---

## When to Use Client Components

**Use Client Components for:**

- Interactive UI (forms, buttons, modals)
- Browser APIs (localStorage, window, etc.)
- Event handlers (onClick, onChange)
- React hooks (useState, useEffect, useQuery for reactive updates)
- Real-time updates

**Note:** Client components should receive data as props from server components, not fetch it themselves on initial load.

---

## Server-Side Data Fetching Pattern

### Standard Query Pattern

All queries should follow this three-part structure:

```typescript
// 1. Core database function (reusable, no auth/session logic)
export async function findDataById(id: number) {
  const data = await db.model.findUnique({ where: { id } })
  if (!data) throw new NotFoundError()
  return data
}

// 2. Server-side helper for RSCs (uses cache() and getBlitzContext)
export const getDataRsc = cache(async (id: number) => {
  const { session } = await getBlitzContext()
  if (!session.userId) throw new Error("Not authenticated")
  return findDataById(id)
})

// 3. Blitz RPC for client usage (reactive updates, real-time data)
export default resolver.pipe(resolver.zod(DataSchema), resolver.authorize(), async ({ id }) =>
  findDataById(id)
)
```

### Key Principles

1. **Single Source Function**: The core `find*` function is reused by both RSC and RPC
2. **Authentication**: RSC helpers use `getBlitzContext()` to check auth
3. **Caching**: RSC helpers use React's `cache()` for automatic request deduplication
4. **Type Safety**: Export return types for type inference
5. **Error Handling**: Use `NotFoundError` for 404 cases, regular errors for others

---

## Example: Converting a Page to Server Component

### Before (Client Component)

```tsx
"use client"

export default function EditStudy() {
  const params = useParams()
  const [study] = useQuery(getStudy, { id: Number(params.studyId) })

  return <StudyForm study={study} />
}
```

### After (Server Component)

```tsx
import { getStudyRsc } from "../queries/getStudy"

export default async function EditStudy({ params }: { params: Promise<{ studyId: string }> }) {
  const { studyId } = await params
  const study = await getStudyRsc(Number(studyId))

  return <EditStudyForm study={study} studyId={Number(studyId)} />
}
```

---

## Query Helper Checklist

When creating a new query, ensure it has:

- [ ] Core `find*` function (no session/auth logic)
- [ ] `get*Rsc` helper using `cache()` and `getBlitzContext()`
- [ ] BlitzJS RPC resolver for client-side usage
- [ ] Exported return type (e.g., `export type DataWithRelations = ...`)
- [ ] Zod validation schema

---

## Common Patterns

### Parallel Data Fetching

```tsx
const [study, metadata] = await Promise.all([getStudyRsc(studyId), getMetadataRsc(studyId)])
```

### Conditional Data Fetching

```tsx
let metadata = null
if (study.jatosStudyId) {
  metadata = await getMetadataRsc(study.jatosStudyId)
}
```

### Error Handling

```tsx
try {
  const data = await getDataRsc(id)
} catch (error: any) {
  if (error.name === "NotFoundError") {
    notFound()
  }
  throw error
}
```

### Type Safety

```tsx
import type { StudyWithRelations } from "../queries/getStudy"

interface Props {
  study: StudyWithRelations
}
```

---

## Migration Checklist

When converting a page from client to server component:

1. Remove `"use client"` directive
2. Change `useParams()` to `params: Promise<{...}>` prop
3. Replace `useQuery` with RSC helper function
4. Add `async` to component function
5. Extract interactive parts to separate client component
6. Pass data as props to client component
7. Use `notFound()` for 404 cases
8. Use `Suspense` boundaries where appropriate

---

## Best Practices

1. **Keep Server Components Simple**: They should primarily fetch and pass data
2. **Minimize Client Components**: Only mark components as client when absolutely necessary
3. **Prop Drilling is Fine**: Pass data through props rather than fetching in client components
4. **Use Suspense**: Wrap async server components in Suspense for better UX
5. **Cache Everything**: All RSC helpers should use `cache()` for performance

---

## Examples in Codebase

- ✅ **Good**: `src/app/(app)/studies/[studyId]/page.tsx` - Server component fetching data
- ✅ **Good**: `src/app/(app)/studies/[studyId]/edit/page.tsx` - Server component, client form
- ✅ **Good**: `src/app/(app)/studies/queries/getStudy.ts` - Follows three-part pattern
- ❌ **Avoid**: Client components using `useQuery` for initial data load

---

## Resources

- [Next.js 15 Server Components Docs](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [React Server Components](https://react.dev/reference/rsc/server-components)
