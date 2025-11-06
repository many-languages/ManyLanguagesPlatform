# Project Structure Guidelines

This document outlines the recommended project structure for organizing business logic, data fetching, mutations, server actions, and related code in a scalable and maintainable way.

## Overview

The current project structure works well for:

- ✅ **Components, layouts, routes, and pages** (Next.js App Router structure)

However, we need better organization for:

- ❌ **Business logic** (currently scattered in component handlers)
- ❌ **Data fetchers** (queries)
- ❌ **Mutations** (write operations)
- ❌ **Server actions** (complex workflows)
- ❌ **Reusable logic** (currently embedded in components)

## Recommended Structure

```
src/
├── app/                          # Next.js App Router (routes, pages, layouts)
│   ├── (app)/
│   │   └── studies/
│   │       └── [studyId]/
│   │           ├── components/   # ✅ UI components only
│   │           ├── page.tsx       # ✅ Thin route handlers
│   │           └── ...
│   └── api/                       # ✅ API routes (keep as-is)
│
├── domains/                       # 🆕 Domain-driven structure
│   └── studies/
│       ├── services/              # Business logic & orchestration
│       │   ├── participant.ts
│       │   ├── feedback.ts
│       │   └── results.ts
│       │
│       ├── queries/               # Data fetching (read operations)
│       │   ├── participant.ts
│       │   ├── study.ts
│       │   └── results.ts
│       │
│       ├── mutations/             # Data mutations (write operations)
│       │   ├── participant.ts
│       │   └── study.ts
│       │
│       ├── actions/                # Server actions (complex workflows)
│       │   ├── feedback.ts
│       │   └── results.ts
│       │
│       ├── hooks/                  # 🆕 Custom React hooks
│       │   ├── useParticipant.ts
│       │   ├── useStudy.ts
│       │   └── useFeedback.ts
│       │
│       ├── validations/            # 🆕 Domain-specific schemas
│       │   ├── participant.ts
│       │   ├── study.ts
│       │   └── feedback.ts
│       │
│       ├── types/                  # 🆕 Domain-specific types
│       │   ├── participant.ts
│       │   ├── study.ts
│       │   └── index.ts
│       │
│       ├── errors/                 # 🆕 Domain-specific errors
│       │   ├── participant.errors.ts
│       │   └── study.errors.ts
│       │
│       └── utils/                  # Domain-specific utilities
│           ├── calculateStudySummary.ts
│           └── enrichResults.ts
│
├── lib/                           # Shared libraries
│   ├── jatos/                     # ✅ External API clients
│   └── utils/                     # ✅ Pure utilities
│
└── types/                         # ✅ Shared types (keep as-is)
```

## Naming Conventions

**Important:** Follow the existing codebase pattern where the **folder name indicates the type**, and the **filename is just the feature/entity name**.

### ✅ Correct (Current Pattern)

```
domains/studies/
├── services/
│   ├── participant.ts          # ✅ Not participant.service.ts
│   └── feedback.ts
├── queries/
│   ├── study.ts                # ✅ Not study.queries.ts
│   └── participant.ts
├── mutations/
│   ├── participant.ts          # ✅ Not participant.mutations.ts
│   └── study.ts
└── actions/
    ├── feedback.ts              # ✅ Not feedback.actions.ts
    └── results.ts
```

### ❌ Avoid

- `participant.service.ts` (redundant - folder already indicates type)
- `study.queries.ts` (redundant - folder already indicates type)
- `feedback.actions.ts` (redundant - folder already indicates type)

**Exception:** Hooks can keep the `use` prefix (e.g., `useParticipant.ts`) as it's a React convention.

## Layer Responsibilities

### 1. Services (Business Logic Layer)

Services orchestrate multiple operations and contain reusable business logic. They should:

- Combine multiple queries/mutations
- Contain business rules and validation logic
- Transform data between layers
- Handle error transformation

**Example:**

```typescript
// domains/studies/services/participant.service.ts
"use server"

import { calculateParticipantProgress } from "../utils/participantCalculations"
import { matchJatosResultsToParticipants } from "../utils/matchJatosToParticipants"
import { getParticipants } from "../queries/participant"

export async function getParticipantsWithProgress(studyId: number) {
  const participants = await getParticipants(studyId)
  const metadata = await getJatosMetadata(studyId)

  return participants.map((participant) => ({
    ...participant,
    progress: calculateParticipantProgress(participant, metadata),
    jatosResult: matchJatosResultsToParticipants(participant, metadata),
  }))
}

export async function toggleParticipantStatus(
  participantIds: number[],
  action: "active" | "payed"
) {
  // Business logic: determine new state
  const participants = await getParticipantsByIds(participantIds)
  const newState = determineNewState(participants, action)

  // Delegate to mutation
  return action === "active"
    ? await toggleActiveMutation({ participantIds, makeActive: newState })
    : await togglePayedMutation({ participantIds, makePayed: newState })
}
```

### 2. Queries (Read Operations)

Pure data fetching with no business logic. Should:

- Use `cache()` for React Server Components
- Use `unstable_cache()` for API routes with revalidation tags
- Be simple, focused functions
- Return raw data (transformations happen in services)

**Example:**

```typescript
// domains/studies/queries/participant.ts
import db from "db"
import { cache } from "react"
import { unstable_cache } from "next/cache"

// For RSC (React Server Components)
export const getParticipants = cache(async (studyId: number) => {
  return db.participantStudy.findMany({
    where: { studyId },
    include: { user: true },
  })
})

// For API routes with revalidation
export const getParticipantsCached = unstable_cache(
  async (studyId: number) => {
    return db.participantStudy.findMany({
      where: { studyId },
      include: { user: true },
    })
  },
  ["participants"],
  {
    tags: [`study-${studyId}-participants`],
    revalidate: 3600, // 1 hour
  }
)
```

### 3. Mutations (Write Operations)

Simple database writes with authorization. Should:

- Use Blitz resolver pattern
- Include authorization checks
- Be focused on single operations
- Return updated data

**Example:**

```typescript
// domains/studies/mutations/participant.ts
import { resolver } from "@blitzjs/rpc"
import db from "db"
import { ToggleParticipantActiveSchema } from "../validations/participant"

export const toggleParticipantActive = resolver.pipe(
  resolver.zod(ToggleParticipantActiveSchema),
  resolver.authorize("RESEARCHER"),
  async ({ participantIds, makeActive }, ctx) => {
    if (!ctx.session.userId) throw new Error("Not authenticated")

    return db.participantStudy.updateMany({
      where: { id: { in: participantIds } },
      data: { active: makeActive },
    })
  }
)
```

### 4. Server Actions (Complex Workflows)

For multi-step operations, form actions, and workflows. Should:

- Use React 19 `useActionState` pattern
- Handle complex workflows
- Combine multiple operations
- Return state objects for form handling

**Example:**

```typescript
// domains/studies/actions/feedback.ts
"use server"

import { z } from "zod"
import { renderTemplate } from "../utils/feedbackRenderer"

const PreviewSchema = z.object({
  template: z.string().min(1),
  enrichedResult: z.any(),
})

export async function previewFeedbackAction(
  prevState: { rendered: string; error: string | null },
  formData: FormData
) {
  try {
    const template = String(formData.get("template") || "")
    const enrichedResultRaw = String(formData.get("enrichedResult") || "{}")
    const parsed = PreviewSchema.parse({
      template,
      enrichedResult: JSON.parse(enrichedResultRaw),
    })

    const rendered = renderTemplate(parsed.template, {
      enrichedResult: parsed.enrichedResult,
    })

    return { rendered, error: null }
  } catch (e: any) {
    return { rendered: "", error: e?.message || "Failed to render" }
  }
}
```

### 5. Hooks (Client-Side State & Data Fetching)

Custom React hooks for client components. Should:

- Use React 19 features (`useOptimistic`, `useActionState`)
- Encapsulate data fetching logic
- Provide clean APIs for components
- Handle loading/error states

**Example:**

```typescript
// domains/studies/hooks/useParticipant.ts
"use client"

import { useQuery, useMutation } from "@blitzjs/rpc"
import { useOptimistic } from "react" // React 19
import { getParticipants } from "../queries/participant"
import { toggleParticipantActive } from "../mutations/participant"

export function useParticipants(studyId: number) {
  const [participants, { refetch }] = useQuery(getParticipants, { studyId }, { staleTime: 30000 })

  return { participants, refetch }
}

export function useToggleParticipantStatus() {
  const [toggleActive] = useMutation(toggleParticipantActive)
  const [optimisticParticipants, setOptimisticParticipants] = useOptimistic(
    [],
    (state, { participantIds, makeActive }) => {
      return state.map((p) => (participantIds.includes(p.id) ? { ...p, active: makeActive } : p))
    }
  )

  const toggle = async (participantIds: number[], makeActive: boolean) => {
    setOptimisticParticipants({ participantIds, makeActive })
    await toggleActive({ participantIds, makeActive })
  }

  return { toggle, optimisticParticipants }
}
```

### 6. Validations (Schema Definitions)

Domain-specific Zod schemas. Should:

- Be co-located with domain logic
- Export both schemas and inferred types
- Group related validations together

**Example:**

```typescript
// domains/studies/validations/participant.ts
import { z } from "zod"

export const ToggleParticipantActiveSchema = z.object({
  participantIds: z.array(z.number().int().positive()).min(1),
  makeActive: z.boolean(),
})

export type ToggleParticipantActiveInput = z.infer<typeof ToggleParticipantActiveSchema>

export const GetParticipantsSchema = z.object({
  studyId: z.number().int().positive(),
})

export type GetParticipantsInput = z.infer<typeof GetParticipantsSchema>
```

### 7. Types (Domain-Specific Types)

TypeScript types specific to the domain. Should:

- Export domain-specific types
- Re-export Prisma types with modifications
- Provide clean type exports via index

**Example:**

```typescript
// domains/studies/types/participant.ts
import type { ParticipantStudy, User } from "@prisma/client"

export type ParticipantWithEmail = ParticipantStudy & {
  user: Pick<User, "id" | "email" | "firstname" | "lastname">
}

export type ParticipantProgress = {
  participantId: number
  finished: boolean
  progress: number
  lastSeen: Date | null
}

// domains/studies/types/index.ts
export * from "./participant"
export * from "./study"
export * from "./feedback"
```

### 8. Errors (Domain-Specific Errors)

Custom error classes for better error handling. Should:

- Extend base Error class
- Provide context-specific information
- Be catchable and type-safe

**Example:**

```typescript
// domains/studies/errors/participant.errors.ts
export class ParticipantNotFoundError extends Error {
  constructor(participantId: number) {
    super(`Participant ${participantId} not found`)
    this.name = "ParticipantNotFoundError"
  }
}

export class UnauthorizedParticipantActionError extends Error {
  constructor(action: string) {
    super(`Unauthorized to perform ${action} on participant`)
    this.name = "UnauthorizedParticipantActionError"
  }
}
```

### 9. Utils (Pure Functions)

Domain-specific utility functions. Should:

- Be pure functions (no side effects)
- Be easily testable
- Focus on calculations and transformations

**Example:**

```typescript
// domains/studies/utils/participantCalculations.ts
import type { ParticipantStudy } from "@prisma/client"
import type { JatosMetadata } from "@/src/types/jatos"

export function calculateParticipantProgress(
  participant: ParticipantStudy,
  metadata: JatosMetadata
): number {
  const jatosResult = metadata.data?.[0]?.studyResults.find(
    (r) => r.comment === participant.pseudonym
  )

  const finishedComponents =
    jatosResult?.componentResults.filter((c) => c.componentState === "FINISHED").length ?? 0

  const totalComponents = jatosResult?.componentResults.length || 1
  return Math.round((finishedComponents / totalComponents) * 100)
}
```

## Refactoring Client Components

### Before (Logic in Component)

```typescript
// ❌ Current: ParticipantManagementCard.tsx
const handleClick = async () => {
  const selectedIds = watch("selectedParticipantIds")
  const isValid = await trigger("selectedParticipantIds")

  if (!isValid || selectedIds.length === 0) return

  setIsSubmitting(true)
  try {
    if (action === "TOGGLE_ACTIVE") {
      const areAllActive = participants
        .filter((p) => selectedIds.includes(p.id))
        .every((p) => p.active)

      await toggleActiveMutation({
        participantIds: selectedIds,
        makeActive: !areAllActive,
      })
      toast.success(areAllActive ? "Participants deactivated" : "Participants activated")
    }
    // ... more logic
  } catch (error) {
    // ... error handling
  }
}
```

### After (Logic Extracted)

```typescript
// ✅ Component becomes thin:
const handleClick = async () => {
  const selectedIds = watch("selectedParticipantIds")
  if (!(await trigger("selectedParticipantIds")) || selectedIds.length === 0) return

  setIsSubmitting(true)
  try {
    const result = await toggleParticipantStatus(selectedIds, action)
    toast.success(getSuccessMessage(action, result.newState))
    setValue("selectedParticipantIds", [])
    router.refresh()
  } catch (error) {
    toast.error(error?.message || "An error occurred")
  } finally {
    setIsSubmitting(false)
  }
}
```

## Migration Strategy

1. **Create domain structure** alongside existing code (no breaking changes)
2. **Move validations first** (low risk, high impact)
3. **Extract hooks** from components
4. **Move business logic** to services
5. **Update imports incrementally**
6. **Keep route-level folders** as thin wrappers during transition:

```typescript
// app/(app)/studies/mutations/toggleParticipantActive.ts
// During migration - re-export from domain
export { toggleParticipantActive } from "@/domains/studies/mutations/participant"
```

## Benefits

- ✅ **Separation of Concerns**: UI, data fetching, business logic, and mutations are clearly separated
- ✅ **Reusability**: Services can be used across components and server actions
- ✅ **Testability**: Business logic is easy to unit test in isolation
- ✅ **Maintainability**: Clear structure makes it easy to find and modify code
- ✅ **Scalability**: New features follow a consistent pattern
- ✅ **React 19 Ready**: Uses `useOptimistic`, `useActionState`, proper server/client boundaries
- ✅ **Next.js 15 Ready**: Proper caching with `unstable_cache` and revalidation tags
- ✅ **Type Safety**: Domain-specific types prevent cross-domain coupling
- ✅ **Error Handling**: Domain errors with clear boundaries

## Testing Structure

Tests should be co-located with the code they test:

```
domains/
└── studies/
    ├── services/
    │   ├── participant.ts
    │   └── participant.test.ts      # 🆕 Co-located tests
    ├── queries/
    │   ├── participant.ts
    │   └── participant.test.ts      # 🆕
    └── utils/
        ├── calculateStudySummary.ts
        └── calculateStudySummary.test.ts    # 🆕
```

## Public API (Index Files)

Create index files for clean imports:

```typescript
// domains/studies/index.ts
// Public API - only export what's needed
export * from "./queries"
export * from "./mutations"
export * from "./services"
export * from "./actions"
export * from "./hooks"
export * from "./types"
export * from "./validations"

// Usage: import { getStudy, useParticipants } from "@/domains/studies"
```

## Next.js 15 & React 19 Best Practices

### Caching Strategy

- Use `cache()` from React for RSC
- Use `unstable_cache()` from Next.js for API routes
- Use revalidation tags for cache invalidation
- Set appropriate `staleTime` for client queries

### Server Actions

- Use `useActionState` for form actions
- Return state objects for better UX
- Handle errors gracefully

### Optimistic Updates

- Use `useOptimistic` for instant UI feedback
- Rollback on error
- Keep UI in sync with server state

## References

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [React 19 Documentation](https://react.dev)
- [Blitz.js Documentation](https://blitzjs.com)
- Existing codebase patterns in `src/app/(app)/studies/`
