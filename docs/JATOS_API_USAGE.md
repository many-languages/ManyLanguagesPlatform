# JATOS API Usage Guidelines

## Overview

This document provides guidelines for using JATOS API integration in the codebase. Following these patterns ensures consistency, maintainability, and proper separation of server/client concerns.

---

## Two-Pattern Architecture

### Pattern A: Server-Side Direct Lib Functions

**Use for**: Server components, server actions, RSC helpers

**Location**: `src/lib/jatos/api/*.ts`

**Characteristics**:

- Direct `fetch()` calls to JATOS API
- Use `process.env.JATOS_BASE` and `process.env.JATOS_TOKEN`
- Some marked with `"use server"` directive
- Return typed data directly
- No HTTP wrapper layer

**Example**:

```typescript
// Server component or RSC helper
import { getResultsMetadata } from "@/src/lib/jatos/api/getResultsMetadata"

const metadata = await getResultsMetadata({ studyIds: [studyId] })
```

**When to use**:

- ✅ Server components fetching initial data
- ✅ Server-side queries/mutations
- ✅ RSC helper functions
- ✅ Server actions

---

### Pattern B: Client-Side API Routes

**Use for**: Client components that need to call JATOS API

**Location**: `src/app/api/jatos/*/route.ts`

**Characteristics**:

- Next.js API route handlers (GET/POST/DELETE)
- Can wrap lib functions OR call JATOS directly
- Consistent error handling with `JatosApiError` type
- Return typed JSON responses or binary data
- Handle authentication/authorization at route level

**Example**:

```typescript
// Client component
const res = await fetch("/api/jatos/get-results-metadata", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ studyUuids: [studyUUID] }),
})

if (!res.ok) {
  const error = await res.json()
  throw new Error(error.error)
}

const metadata = await res.json()
```

**When to use**:

- ✅ Client components making interactive API calls
- ✅ Real-time data fetching from client
- ✅ File uploads/downloads from client

---

## API Route Standards

### Naming Convention

All API routes use **kebab-case** with action verbs:

- `get-*` - Retrieve data
- `create-*` - Create resources
- `delete-*` - Delete resources
- `update-*` - Update resources (not yet used)

**Examples**:

- ✅ `/api/jatos/get-results-metadata`
- ✅ `/api/jatos/create-personal-studycode`
- ✅ `/api/jatos/delete-study`
- ❌ `/api/jatos/getResultsMetadata` (camelCase)
- ❌ `/api/jatos/results-metadata` (missing verb)

---

### Error Handling

All API routes follow a consistent error handling pattern:

```typescript
import type { JatosApiError } from "@/src/types/jatos-api"

// Validation errors (400)
if (!requiredParam) {
  const errorResponse: JatosApiError = { error: "Missing required parameter" }
  return NextResponse.json(errorResponse, { status: 400 })
}

// Server errors (500)
catch (error: any) {
  console.error("Error description:", error)
  const errorResponse: JatosApiError = {
    error: error.message || "Descriptive error message",
  }
  return NextResponse.json(errorResponse, { status: 500 })
}
```

**Error Response Structure**:

```typescript
interface JatosApiError {
  error: string // Required: user-friendly error message
  details?: string | unknown // Optional: technical details for debugging
}
```

---

### TypeScript Types

All API routes have typed responses using types from `@/src/types/jatos-api`:

```typescript
import type { CreatePersonalStudyCodeResponse, JatosApiError } from "@/src/types/jatos-api"

export async function POST(
  req: Request
): Promise<NextResponse<CreatePersonalStudyCodeResponse | JatosApiError>> {
  // ...
}
```

**Available Types**:

- `JatosApiError` - Standard error response
- `JatosImportResponse` - Import success response
- `JatosImportConflictResponse` - Import conflict (409) response
- `CreatePersonalStudyCodeResponse` - Study code creation response
- `CreateComponentResponse` - Component creation response
- `GetStudyCodeResponse` - Study code retrieval response
- `CreatePersonalLinksResponse` - Personal links creation response

---

### Documentation

All API routes include JSDoc comments:

```typescript
/**
 * JATOS API Route: Get Results Metadata
 *
 * Fetches results metadata from JATOS for specified studies.
 * This route wraps the server-side lib function for client-side usage.
 *
 * @route POST /api/jatos/get-results-metadata
 * @body { studyIds?: number[], studyUuids?: string[] }
 * @returns JATOS results metadata
 */
```

---

### Runtime Configuration

All API routes include consistent runtime configuration:

```typescript
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
```

This ensures:

- Routes run in Node.js runtime (required for JATOS API calls)
- Routes are never statically optimized (always dynamic)

---

## Migration Guide

### Replacing Hybrid Wrapper Functions

**Before** (hybrid wrapper):

```typescript
import uploadJatosFile from "@/src/lib/jatos/api/uploadJatosFile"

const result = await uploadJatosFile(file)
```

**After** (direct API route):

```typescript
const fd = new FormData()
fd.append("studyFile", file, file.name)

const res = await fetch("/api/jatos/import", {
  method: "POST",
  body: fd,
})

const data = await res.json()

if (!res.ok) {
  throw new Error(data.error || `Upload failed: ${res.status}`)
}

const result = res.status === 409 ? { studyExists: true, ...data } : data
```

---

### Converting Business Logic to Pure Functions

**Before** (client-callable wrapper):

```typescript
export async function checkPilotCompletion(jatosStudyUUID: string) {
  const res = await fetch("/api/jatos/get-results-metadata", ...)
  const metadata = await res.json()
  // Business logic here
  return hasCompleted
}
```

**After** (pure function + direct API call):

```typescript
// Pure function (lib/jatos/api/checkPilotCompletion.ts)
export function checkPilotCompletionFromMetadata(metadata: any, jatosStudyUUID: string): boolean {
  // Business logic only
  return hasCompleted
}

// Client component
const res = await fetch("/api/jatos/get-results-metadata", ...)
const metadata = await res.json()
const completed = checkPilotCompletionFromMetadata(metadata, studyUUID)
```

---

## Best Practices

### 1. Prefer Server-Side When Possible

Always prefer server-side lib functions for initial data fetching:

```typescript
// ✅ Good: Server component
const metadata = await getResultsMetadata({ studyIds: [studyId] })

// ❌ Avoid: Client component fetching initial data
const [metadata] = useQuery(...) // Use API route only if reactive updates needed
```

---

### 2. Keep Client Components Minimal

Client components should only fetch data when:

- User interaction triggers it (button click, form submission)
- Real-time updates are needed (reactive queries)
- Data changes after user actions

---

### 3. Error Handling

**Server-side**:

```typescript
try {
  const data = await getResultsMetadata(params)
} catch (error: any) {
  if (error.name === "NotFoundError") {
    notFound()
  }
  throw error
}
```

**Client-side**:

```typescript
try {
  const res = await fetch("/api/jatos/...", ...)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error)
  }
  const data = await res.json()
} catch (error) {
  toast.error(error.message)
}
```

---

### 4. Type Safety

Always use typed responses:

```typescript
import type { CreatePersonalStudyCodeResponse, JatosApiError } from "@/src/types/jatos-api"

const res = await fetch("/api/jatos/create-personal-studycode", ...)
const data = await res.json() as CreatePersonalStudyCodeResponse | JatosApiError

if ("error" in data) {
  // Handle error
  throw new Error(data.error)
}

// TypeScript knows data is CreatePersonalStudyCodeResponse here
const code = data.code
```

---

## API Route Reference

| Route                                  | Method | Purpose               | Wraps Lib Function?        |
| -------------------------------------- | ------ | --------------------- | -------------------------- |
| `/api/jatos/import`                    | POST   | Import study file     | No (calls JATOS directly)  |
| `/api/jatos/get-results-metadata`      | POST   | Get results metadata  | Yes (`getResultsMetadata`) |
| `/api/jatos/get-results-data`          | POST   | Get results ZIP file  | Yes (`getResultsData`)     |
| `/api/jatos/get-study-properties`      | GET    | Get study properties  | Yes (`getStudyProperties`) |
| `/api/jatos/get-study-code`            | GET    | Get study code        | No (calls JATOS directly)  |
| `/api/jatos/create-personal-studycode` | POST   | Create personal code  | No (calls JATOS directly)  |
| `/api/jatos/create-personal-links`     | POST   | Create multiple codes | No (calls JATOS directly)  |
| `/api/jatos/create-component`          | POST   | Create component      | No (calls JATOS directly)  |
| `/api/jatos/delete-study`              | DELETE | Delete study          | Yes (`deleteStudy`)        |
| `/api/jatos/get-all-results`           | POST   | Get all results ZIP   | No (calls JATOS directly)  |
| `/api/jatos/get-asset-structure`       | GET    | Get asset structure   | No (calls JATOS directly)  |

---

## Examples

### Example 1: Server Component Fetching Data

```typescript
// app/studies/[studyId]/page.tsx
import { getResultsMetadata } from "@/src/lib/jatos/api/getResultsMetadata"

export default async function StudyPage({ params }: { params: Promise<{ studyId: string }> }) {
  const study = await getStudyRsc(studyId)

  let metadata = null
  if (study.jatosStudyId) {
    metadata = await getResultsMetadata({ studyIds: [study.jatosStudyId] })
  }

  return <StudyContent study={study} metadata={metadata} />
}
```

---

### Example 2: Client Component Fetching Data on Interaction

```typescript
// components/client/ResultsCard.tsx
"use client"

const fetchResults = async () => {
  try {
    const res = await fetch(`/api/jatos/get-results-data?studyIds=${jatosStudyId}`, {
      method: "POST",
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error)
    }

    const blob = await res.blob()
    // Process blob...
  } catch (error: any) {
    toast.error(error.message)
  }
}
```

---

## Troubleshooting

### Common Issues

**Issue**: "Missing studyId" error  
**Solution**: Ensure required parameters are provided in query params or body

**Issue**: "JATOS API error: 401"  
**Solution**: Check `JATOS_TOKEN` environment variable is set correctly

**Issue**: Type errors in API responses  
**Solution**: Import and use types from `@/src/types/jatos-api`

---

## Future Enhancements

- [ ] Consider unified API client for type-safe calls (future enhancement)
- [ ] Add request/response validation with Zod (future enhancement)
- [ ] Consider server actions for authenticated operations (evaluate case-by-case)

---

## Related Documentation

- [JATOS API Audit](./JATOS_API_AUDIT.md) - Detailed audit of current patterns
- [Server Component Patterns](./SERVER_COMPONENT_PATTERNS.md) - Server/client component guidelines
