# UI Component Consolidation Audit (Phase 6.3)

## Overview

This document audits duplicate UI patterns across the codebase and identifies opportunities for consolidation and standardization of loading states, error displays, buttons, cards, empty states, and other UI components.

**Date**: Phase 6.3 Implementation
**Status**: Audit Complete

---

## Duplication Patterns Identified

### Pattern 1: Loading State Variations ⚠️ HIGH DUPLICATION

**Description**: Multiple inconsistent patterns for displaying loading states across buttons, components, and pages.

**Locations**:

1. **Button Loading States** (10+ instances):

   - `btn loading` class pattern
   - Inconsistent loading text: "Loading...", "Fetching...", "Generating...", "Starting...", "Please wait...", "Saving..."
   - Manual loading state management with `useState` and conditional text

   **Examples**:

   ```tsx
   // JoinStudyButton.tsx
   className={`btn ... ${loading ? "loading" : ""}`}

   // GenerateTestLinkButton.tsx
   {loading ? "Generating..." : "Generate Test Link"}

   // RunStudyButton.tsx
   {loading ? "Starting..." : "Run Study"}

   // ArchiveStudyButton.tsx
   {busy ? "Please wait..." : isArchived ? "Unarchive" : "Archive"}

   // ResultsCard.tsx
   className={`btn btn-secondary w-fit ${loading ? "loading" : ""}`}
   {loading ? "Fetching..." : "Fetch Raw Results"}
   ```

2. **Skeleton Components** (5 instances):

   - `StudySkeleton.tsx` - Full page skeleton
   - `StudyListSkeleton.tsx` - List skeleton (composed of StudyItemSkeleton)
   - `StudyItemSkeleton.tsx` - Individual item skeleton
   - `StudyFormSkeleton.tsx` - Form skeleton
   - `PaginationControlsSkeleton.tsx` - Pagination skeleton
   - Inconsistent usage: Some pages use `loading.tsx` with skeletons, others use inline loading

3. **Next.js Loading Files** (2 instances):

   - `src/app/loading.tsx` - Root loading (uses spinner)
   - `src/app/(app)/studies/[studyId]/loading.tsx` - Uses `StudySkeleton`
   - Different patterns for similar use cases

4. **Inline Loading Messages** (5+ instances):

   ```tsx
   // ResultsCard.tsx
   {loading && <div className="text-center text-sm p-3">Loading results...</div>}

   // StudyContent.tsx
   <button className="btn btn-disabled loading">Loading study...</button>

   // StudyComponentForm.tsx
   placeholder={loading ? "Loading files..." : "Select..."}
   ```

**Duplication Details**:

- **Lines duplicated**: ~50-70 lines of similar loading logic
- **Impact**: High - Inconsistent UX, harder to maintain

**Recommendation**: Create standardized loading components:

- `LoadingButton` component with consistent loading text handling
- Standardized skeleton library with reusable patterns
- Consistent loading.tsx usage

---

### Pattern 2: Error Display Variations ⚠️ MEDIUM DUPLICATION

**Description**: Multiple patterns for displaying errors (alerts, inline errors, toasts, error boundaries).

**Locations**:

1. **DaisyUI Alert Patterns** (10+ instances):

   ```tsx
   // Error.tsx (root error boundary)
   <div className="alert alert-error">...</div>

   // Step3Content.tsx
   <div className="alert alert-warning mt-4">...</div>
   <div className="alert alert-info mt-4">...</div>
   <div className="alert alert-success mt-4">...</div>

   // StudyContent.tsx
   <div className="alert alert-warning mt-4">...</div>
   <div className="alert alert-info mt-4">...</div>

   // Step2Content.tsx
   <div role="alert" className="alert alert-warning mb-6">...</div>
   ```

2. **Inline Error Messages** (5+ instances):

   ```tsx
   // ResultsCard.tsx
   {
     error && <div className="text-error text-sm p-3">{error}</div>
   }

   // Field components
   ;<div role="alert" className="text-error text-sm">
     {error}
   </div>
   ```

3. **Toast Notifications** (15+ instances):

   - Used via `react-hot-toast` for success/error feedback
   - Inconsistent usage: Sometimes used for form errors, sometimes for API errors
   - Pattern: `toast.success()` / `toast.error()` / `toast.loading()`

4. **Error Boundary Files** (1 instance):
   - `src/app/error.tsx` - Root error boundary
   - `src/app/(app)/studies/[studyId]/error.tsx` - Route-specific (if exists)
   - Different patterns from inline alerts

**Duplication Details**:

- **Lines duplicated**: ~30-40 lines of similar error display logic
- **Impact**: Medium - Multiple error display patterns create inconsistency

**Recommendation**: Standardize error display patterns:

- Create `Alert` component wrapper for DaisyUI alerts
- Standardize when to use alerts vs. toasts vs. inline errors
- Create consistent error.tsx files where needed

---

### Pattern 3: Empty State Variations ⚠️ LOW-MEDIUM DUPLICATION

**Description**: Multiple patterns for displaying empty states (no data, no results, etc.).

**Locations**:

1. **Empty State Messages** (8+ instances):

   ```tsx
   // ResultsCard.tsx
   {!loading && !error && !enrichedResults.length && (
     <div className="text-center text-sm p-3">No results found</div>
   )}

   // Table.tsx
   <td colSpan={columns.length} className="text-center p-3">
     No data found
   </td>

   // JatosInformationCard.tsx
   <p className="mt-2 text-warning">No components found for this study.</p>

   // Step4Content.tsx (in page.tsx)
   <p className="text-warning">No test run data found.</p>
   ```

2. **Conditional Empty Renders**:
   - Inconsistent conditions: `!data.length`, `data.length === 0`, `!data`
   - Different styling approaches
   - Inconsistent messaging

**Duplication Details**:

- **Lines duplicated**: ~15-20 lines
- **Impact**: Low-Medium - Minor UX inconsistency

**Recommendation**: Create standardized `EmptyState` component

---

### Pattern 4: Button Component Patterns ⚠️ HIGH DUPLICATION

**Description**: Many similar button components with loading states, disabled states, and onClick handlers.

**Locations**:

1. **Dedicated Button Components** (6 instances):

   - `JoinStudyButton.tsx` - Join study with loading
   - `RunStudyButton.tsx` - Run study with disabled/tooltip states
   - `GenerateTestLinkButton.tsx` - Generate link with loading
   - `ArchiveStudyButton.tsx` - Archive/unarchive with confirmation
   - `DownloadResultsButton.tsx` - Download with loading toast
   - `StudyComponentButton.tsx` - Open modal button

2. **Inline Buttons with Loading** (5+ instances):

   ```tsx
   // ResultsCard.tsx
   <button
     className={`btn btn-secondary w-fit ${loading ? "loading" : ""}`}
     onClick={fetchResults}
     disabled={loading}
   >
     {loading ? "Fetching..." : "Fetch Raw Results"}
   </button>

   // Similar patterns in Step2Content, Step3Content, etc.
   ```

3. **Form Submit Buttons**:
   - `FormSubmitButton.tsx` - Handles form submission loading
   - Inline submit buttons in some forms

**Duplication Details**:

- **Lines duplicated**: ~100+ lines of similar button logic
- **Impact**: High - Significant duplication, inconsistent UX

**Recommendation**: Create reusable button components:

- `AsyncButton` component for async actions with loading
- `ConfirmButton` component for actions requiring confirmation
- Standardize button loading text patterns

---

### Pattern 5: Card Component Variations ⚠️ MEDIUM DUPLICATION

**Description**: Base `Card` component exists, but multiple card-like components don't consistently use it.

**Locations**:

1. **Base Card Component**:

   - `src/app/components/Card.tsx` - Reusable card with title, children, actions

2. **Card-like Components** (4 instances):
   - `JatosInformationCard.tsx` - Uses base Card ✅
   - `ResultsCard.tsx` - Uses base Card ✅
   - `ParticipantManagementCard.tsx` - Uses base Card ✅
   - `StudyInformationCard.tsx` - Likely uses base Card ✅

**Status**: Cards are mostly consistent - this is **NOT a major issue**.

**Minor Issues**:

- Some cards have inline styling instead of using className prop
- Card actions placement could be more consistent

---

### Pattern 6: Form Action Buttons ⚠️ LOW DUPLICATION

**Description**: Inconsistent patterns for form cancel/submit buttons.

**Locations**:

1. **Cancel Buttons** (5+ instances):

   ```tsx
   // StudyForm.tsx, StudyComponentForm.tsx, etc.
   {
     onCancel && (
       <button type="button" className="btn btn-secondary" onClick={onCancel}>
         Cancel
       </button>
     )
   }
   ```

2. **Form Submit Buttons**:
   - Most use `FormSubmitButton` ✅
   - Some have custom submit buttons

**Status**: Mostly consistent - minor improvements possible

---

## Statistics

### Duplication Metrics

| Pattern                   | Instances | Lines Duplicated | Impact     | Priority |
| ------------------------- | --------- | ---------------- | ---------- | -------- |
| Loading State Variations  | 15+       | ~50-70 lines     | High       | High     |
| Button Component Patterns | 11+       | ~100+ lines      | Very High  | Critical |
| Error Display Variations  | 15+       | ~30-40 lines     | Medium     | Medium   |
| Empty State Variations    | 8+        | ~15-20 lines     | Low-Medium | Low      |
| Card Component Variations | 4         | ~10-15 lines     | Low        | Low      |
| Form Action Buttons       | 5+        | ~10 lines        | Low        | Low      |

**Total Estimated Duplication**: ~215-255 lines of duplicated UI code

---

## Recommendations

### High Priority Consolidations

#### 1. Create `AsyncButton` Component

**File**: `src/app/components/AsyncButton.tsx`

**Purpose**: Eliminate button loading state duplication

**Implementation**:

```typescript
interface AsyncButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClick: () => Promise<void> | void
  loadingText?: string
  children: React.ReactNode
}

export function AsyncButton({
  onClick,
  loadingText,
  children,
  className,
  disabled,
  ...props
}: AsyncButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (loading || disabled) return
    setLoading(true)
    try {
      await onClick()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      className={`btn ${loading ? "loading" : ""} ${className || ""}`}
      onClick={handleClick}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? loadingText || "Loading..." : children}
    </button>
  )
}
```

**Benefits**:

- ✅ Removes ~20-30 lines of boilerplate per button
- ✅ Consistent loading state handling
- ✅ Standardized loading text

**Usage Example**:

```tsx
// Before
const [loading, setLoading] = useState(false)
const handleClick = async () => {
  setLoading(true)
  try {
    await action()
  } finally {
    setLoading(false)
  }
}
<button className={`btn ${loading ? "loading" : ""}`} onClick={handleClick} disabled={loading}>
  {loading ? "Loading..." : "Action"}
</button>

// After
<AsyncButton onClick={action} loadingText="Loading...">
  Action
</AsyncButton>
```

**Affected Files**: `JoinStudyButton`, `RunStudyButton`, `GenerateTestLinkButton`, `ArchiveStudyButton`, `DownloadResultsButton`, inline buttons in `ResultsCard`, `Step2Content`, etc.

---

#### 2. Create `ConfirmButton` Component

**File**: `src/app/components/ConfirmButton.tsx`

**Purpose**: Standardize confirmation dialogs for destructive actions

**Implementation**:

```typescript
interface ConfirmButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onConfirm: () => Promise<void> | void
  confirmMessage: string
  children: React.ReactNode
}

export function ConfirmButton({
  onConfirm,
  confirmMessage,
  children,
  ...props
}: ConfirmButtonProps) {
  const handleClick = () => {
    if (window.confirm(confirmMessage)) {
      onConfirm()
    }
  }

  return (
    <AsyncButton onClick={handleClick} {...props}>
      {children}
    </AsyncButton>
  )
}
```

**Usage**:

```tsx
// Before (ArchiveStudyButton.tsx - 22 lines)
const onClick = useCallback(async () => {
  if (busy) return
  const confirmMsg = isArchived ? "Restore?" : "Archive?"
  if (!window.confirm(confirmMsg)) return
  setBusy(true)
  try {
    await mutation()
  } finally {
    setBusy(false)
  }
}, [...])

// After (5 lines)
<ConfirmButton
  onConfirm={() => isArchived ? unarchive() : archive()}
  confirmMessage={isArchived ? "Restore?" : "Archive?"}
>
  {isArchived ? "Unarchive" : "Archive"}
</ConfirmButton>
```

---

#### 3. Create Standardized `Alert` Component

**File**: `src/app/components/Alert.tsx`

**Purpose**: Standardize alert/notification display

**Implementation**:

```typescript
type AlertVariant = "error" | "warning" | "info" | "success"

interface AlertProps {
  variant: AlertVariant
  title?: string
  children: React.ReactNode
  className?: string
  onClose?: () => void
}

export function Alert({ variant, title, children, className, onClose }: AlertProps) {
  return (
    <div className={`alert alert-${variant} ${className || ""}`} role="alert">
      {title && <span className="font-semibold">{title}</span>}
      {children}
      {onClose && (
        <button className="btn btn-sm btn-ghost" onClick={onClose}>
          ×
        </button>
      )}
    </div>
  )
}
```

**Benefits**:

- ✅ Consistent alert styling
- ✅ Type-safe variants
- ✅ Optional close button

---

#### 4. Create Standardized `EmptyState` Component

**File**: `src/app/components/EmptyState.tsx`

**Purpose**: Standardize empty state displays

**Implementation**:

```typescript
interface EmptyStateProps {
  title?: string
  message: string
  icon?: React.ReactNode
  action?: React.ReactNode
}

export function EmptyState({ title, message, icon, action }: EmptyStateProps) {
  return (
    <div className="text-center p-8">
      {icon && <div className="mb-4">{icon}</div>}
      {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
      <p className="text-sm text-base-content/70 mb-4">{message}</p>
      {action && <div>{action}</div>}
    </div>
  )
}
```

**Usage**:

```tsx
// Before
{
  !loading && !error && !enrichedResults.length && (
    <div className="text-center text-sm p-3">No results found</div>
  )
}

// After
{
  !loading && !error && !enrichedResults.length && <EmptyState message="No results found" />
}
```

---

#### 5. Standardize Loading Components

**File**: `src/app/components/LoadingStates.tsx`

**Purpose**: Create reusable loading components

**Implementation**:

```typescript
// Loading spinner
export function LoadingSpinner({ size = "lg" }: { size?: "sm" | "md" | "lg" }) {
  return <span className={`loading loading-spinner loading-${size} text-secondary`} />
}

// Loading overlay
export function LoadingOverlay({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="text-center">
        <LoadingSpinner />
        {message && <p className="mt-4 text-sm">{message}</p>}
      </div>
    </div>
  )
}

// Inline loading message
export function LoadingMessage({ message }: { message: string }) {
  return <div className="text-center text-sm p-3">{message}</div>
}
```

**Benefits**:

- ✅ Consistent loading displays
- ✅ Reusable across components

---

#### 6. Create Skeleton Component Library

**File**: `src/app/components/skeletons/index.tsx`

**Purpose**: Standardize skeleton patterns

**Current Issues**:

- Skeletons exist but are scattered
- No base skeleton component
- Inconsistent styling

**Recommendation**: Create base skeleton components:

- `Skeleton` - Base skeleton element
- `CardSkeleton` - Card-shaped skeleton
- `ListSkeleton` - List with multiple items
- `FormSkeleton` - Form field skeletons

---

### Medium Priority

#### 7. Standardize Error Display Strategy

**Documentation Needed**: When to use:

- `Alert` component - User-facing warnings/info
- `toast.error()` - Non-blocking error notifications
- Inline error messages - Form validation errors
- `error.tsx` - Unexpected errors (error boundaries)

---

### Low Priority

#### 8. Form Action Button Consistency

Most forms already use `FormSubmitButton`. Minor improvements:

- Ensure all forms use it
- Standardize cancel button styling

---

## Implementation Priority

### Phase 6.3 Implementation Order

1. **Critical**: Create `AsyncButton` component

   - Highest impact (affects 11+ locations)
   - Removes most button boilerplate
   - Establishes consistent pattern

2. **High**: Create `ConfirmButton` component

   - Removes confirmation dialog duplication
   - Used in multiple destructive actions

3. **High**: Create `Alert` component

   - Standardizes alert display
   - Used in 10+ locations

4. **Medium**: Create `EmptyState` component

   - Standardizes empty state display
   - Used in 8+ locations

5. **Medium**: Standardize loading components

   - Creates reusable loading patterns
   - Used throughout the app

6. **Low**: Create skeleton component library
   - Improves skeleton consistency
   - Used in loading states

---

## Files Requiring Changes

### High Priority

1. ✅ Create `src/app/components/AsyncButton.tsx`
2. ✅ Create `src/app/components/ConfirmButton.tsx`
3. ✅ Create `src/app/components/Alert.tsx`
4. ✅ Update `JoinStudyButton.tsx` - Use `AsyncButton`
5. ✅ Update `RunStudyButton.tsx` - Use `AsyncButton`
6. ✅ Update `GenerateTestLinkButton.tsx` - Use `AsyncButton`
7. ✅ Update `ArchiveStudyButton.tsx` - Use `ConfirmButton` + `AsyncButton`
8. ✅ Update `DownloadResultsButton.tsx` - Use `AsyncButton`
9. ✅ Update `ResultsCard.tsx` - Use `AsyncButton`, `EmptyState`, `Alert`
10. ✅ Update `Step2Content.tsx` - Use `Alert`
11. ✅ Update `Step3Content.tsx` - Use `Alert`

### Medium Priority

12. ✅ Create `src/app/components/EmptyState.tsx`
13. ✅ Create `src/app/components/LoadingStates.tsx`
14. ✅ Update components with empty states - Use `EmptyState`
15. ✅ Update components with loading - Use loading components

### Low Priority

16. ⚠️ Create `src/app/components/skeletons/` library
17. ⚠️ Document error display strategy
18. ⚠️ Review form action buttons for consistency

---

## Expected Impact

### Code Reduction

- **Before**: ~215-255 lines of duplicated UI code
- **After**: ~100-120 lines of shared components
- **Savings**: ~115-135 lines removed (50-60% reduction)

### Maintainability Improvements

- ✅ Single source of truth for button loading states
- ✅ Consistent error/alert display patterns
- ✅ Standardized empty state UX
- ✅ Reusable loading components
- ✅ Type-safe component props

### Developer Experience

- ✅ Faster to create new buttons with loading states
- ✅ Less boilerplate code
- ✅ Consistent patterns easier to learn
- ✅ Better autocomplete with typed components

### User Experience

- ✅ Consistent loading states across app
- ✅ Standardized error messages
- ✅ Better empty state messaging
- ✅ More predictable button behavior

---

## Questions for Discussion

1. **Should `AsyncButton` handle toast notifications?**

   - Pros: More automatic feedback
   - Cons: Less flexible
   - **Recommendation**: Keep separate, allow optional toast via props

2. **Should we create a `Button` component that wraps all button patterns?**

   - Pros: Single button API
   - Cons: Might be over-engineering
   - **Recommendation**: Start with `AsyncButton`, expand if needed

3. **Should `Alert` component replace all DaisyUI alert usage?**

   - Pros: More consistent
   - Cons: Additional abstraction
   - **Recommendation**: Yes, for consistency

4. **Should we use a modal library for confirmations instead of `window.confirm`?**
   - Pros: Better UX, customizable
   - Cons: More complexity
   - **Recommendation**: Start with `window.confirm`, upgrade later if needed

---

## Conclusion

The audit identified significant duplication in UI component patterns, particularly in:

1. **Button loading states** (11+ instances)
2. **Error display patterns** (15+ instances)
3. **Loading state variations** (15+ instances)
4. **Empty state displays** (8+ instances)

Creating shared UI components will:

- Reduce code by ~115-135 lines (50-60% reduction)
- Improve consistency and maintainability
- Provide better developer experience
- Enhance user experience with consistent patterns

The highest impact improvements are:

1. `AsyncButton` component (eliminates most button duplication)
2. `ConfirmButton` component (standardizes destructive actions)
3. `Alert` component (standardizes error/warning displays)
4. `EmptyState` component (standardizes empty states)

These components will eliminate the majority of UI duplication while maintaining flexibility and type safety.
