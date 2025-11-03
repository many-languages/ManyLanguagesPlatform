# Route-by-Route Loading & Error States Audit (Phase 3 & 8)

## Overview

This document provides a comprehensive audit of data fetching, loading states, and error handling for each route in the application. The goal is to track data flow from pages through components, ensuring clean patterns and consistent UX.

**Date**: Phase 3 & 8 Implementation
**Status**: Audit Complete

---

## Methodology

For each route, we analyze:

1. **Data Flow**: Where data is fetched (server vs client), how it flows through components
2. **Loading States**: What loading states exist, what's missing, opportunities for improvement
3. **Error States**: What error boundaries exist, how errors are handled
4. **Component Hierarchy**: How data flows from page → components
5. **Improvements**: Specific recommendations for each route

---

## Route Analysis

### Route 1: `/` (Home Page)

**File**: `src/app/page.tsx`

**Current State**:

- ✅ Server Component
- ✅ No data fetching
- ✅ No loading state needed
- ❌ No error boundary (uses root error.tsx)

**Data Flow**:

- None - static page

**Loading States**:

- N/A - no async operations

**Error States**:

- Relies on root `error.tsx`

**Status**: ✅ Complete - No changes needed

---

### Route 2: `/dashboard`

**File**: `src/app/(app)/dashboard/page.tsx`

**Current State**:

- ✅ Server Component
- ✅ Data fetched server-side using `getCurrentUserRsc`
- ✅ Has `loading.tsx` with DashboardSkeleton
- ✅ Has `error.tsx` for error boundary
- ✅ Uses Suspense boundary for progressive loading

**Data Flow**:

```
page.tsx (server)
  └─> getBlitzContext() - get session
  └─> getCurrentUserRsc() - fetch user data (cached if already in layout)
  └─> Suspense fallback={<DashboardSkeleton />}
       └─> DashboardContent (client, receives currentUser as prop)
```

**Loading States**:

- ✅ Has `loading.tsx` - shows DashboardSkeleton
- ✅ Uses Suspense boundary - shows skeleton while content loads
- ✅ Route-level loading state during navigation

**Error States**:

- ✅ Has `error.tsx` - shows Alert with error message and retry button
- ✅ Consistent error UI pattern

**Implementation** (✅ Completed):

1. ✅ **Converted to Server Component**: Now fetches user data server-side
2. ✅ **Fetch user data server-side**: Uses `getCurrentUserRsc()` (cached from layout)
3. ✅ **Added loading.tsx**: Shows DashboardSkeleton during route navigation
4. ✅ **Added error.tsx**: Shows error boundary with retry functionality
5. ✅ **Created DashboardContent client component**: Receives user data as prop

**Benefits**:

- ✅ User data fetched server-side (better performance)
- ✅ Leverages layout user data (cached, no redundant fetch)
- ✅ Consistent loading/error states
- ✅ Better UX with progressive loading via Suspense

**Status**: ✅ Complete (Phase 3.1 & 3.2)

**Files Created/Modified**:

- ✅ `src/app/(app)/dashboard/page.tsx` - Converted to server component
- ✅ `src/app/(app)/dashboard/components/DashboardContent.tsx` - New client component
- ✅ `src/app/(app)/dashboard/components/DashboardSkeleton.tsx` - New skeleton component
- ✅ `src/app/(app)/dashboard/loading.tsx` - Route-level loading state
- ✅ `src/app/(app)/dashboard/error.tsx` - Route-level error boundary

---

### Route 3: `/explore`

**File**: `src/app/(app)/explore/page.tsx`

**Current State**:

- ✅ Server Component
- ✅ Data fetched server-side
- ✅ Has `loading.tsx` with ExploreSkeleton
- ✅ Has `error.tsx` for error boundary
- ✅ Fixed Suspense misuse (removed unnecessary Suspense boundaries)

**Data Flow**:

```
page.tsx (server)
  └─> getBlitzContext() - get userId
  └─> ExploreContent (server)
       └─> getStudies() - server-side
       └─> StudyList (server, receives data)
       └─> PaginationControls (client, receives data)
```

**Loading States**:

- ✅ Has `loading.tsx` - shows ExploreSkeleton (includes StudyListSkeleton and PaginationControlsSkeleton)
- ✅ Route-level loading state during navigation
- ✅ Removed unnecessary Suspense boundaries (data already loaded synchronously)

**Error States**:

- ✅ Has `error.tsx` - shows Alert with error message and retry button
- ✅ Consistent error UI pattern

**Implementation** (✅ Completed):

1. ✅ **Fixed Suspense misuse**: Removed Suspense boundaries that wrapped components with already-loaded data
2. ✅ **Added loading.tsx**: Shows ExploreSkeleton during route navigation
3. ✅ **Added error.tsx**: Shows error boundary with retry functionality
4. ✅ **Simplified data flow**: Direct rendering without unnecessary Suspense wrapping

**Benefits**:

- ✅ Cleaner code (removed unnecessary Suspense)
- ✅ Consistent loading/error states
- ✅ Better UX with route-level loading skeleton
- ✅ Proper error handling with retry functionality

**Status**: ✅ Complete (Phase 3.1 & 3.2)

**Files Created/Modified**:

- ✅ `src/app/(app)/explore/page.tsx` - Removed Suspense misuse
- ✅ `src/app/(app)/explore/components/ExploreSkeleton.tsx` - New skeleton component
- ✅ `src/app/(app)/explore/loading.tsx` - Route-level loading state
- ✅ `src/app/(app)/explore/error.tsx` - Route-level error boundary

---

### Route 4: `/studies`

**File**: `src/app/(app)/studies/page.tsx`

**Current State**:

- ✅ Server Component
- ✅ Data fetched server-side
- ✅ Has `loading.tsx` with StudiesSkeleton
- ✅ Has `error.tsx` for error boundary
- ✅ Fixed Suspense misuse (removed unnecessary Suspense boundaries)

**Data Flow**:

```
page.tsx (server)
  └─> getBlitzContext() - get userId
  └─> StudiesContent (server)
       └─> getStudies() - server-side
       └─> StudyList (server, receives data)
       └─> PaginationControls (client, receives data)
```

**Loading States**:

- ✅ Has `loading.tsx` - shows StudiesSkeleton (includes StudyListSkeleton, PaginationControlsSkeleton, and UI elements)
- ✅ Route-level loading state during navigation
- ✅ Removed unnecessary Suspense boundaries (data already loaded synchronously)

**Error States**:

- ✅ Has `error.tsx` - shows Alert with error message and retry button
- ✅ Consistent error UI pattern

**Implementation** (✅ Completed):

1. ✅ **Fixed Suspense misuse**: Removed Suspense boundaries that wrapped components with already-loaded data
2. ✅ **Added loading.tsx**: Shows StudiesSkeleton during route navigation
3. ✅ **Added error.tsx**: Shows error boundary with retry functionality
4. ✅ **Simplified data flow**: Direct rendering without unnecessary Suspense wrapping

**Benefits**:

- ✅ Cleaner code (removed unnecessary Suspense)
- ✅ Consistent loading/error states
- ✅ Better UX with route-level loading skeleton
- ✅ Proper error handling with retry functionality

**Status**: ✅ Complete (Phase 3.1 & 3.2)

**Files Created/Modified**:

- ✅ `src/app/(app)/studies/page.tsx` - Removed Suspense misuse
- ✅ `src/app/(app)/studies/components/StudiesSkeleton.tsx` - New skeleton component
- ✅ `src/app/(app)/studies/loading.tsx` - Route-level loading state
- ✅ `src/app/(app)/studies/error.tsx` - Route-level error boundary

---

### Route 5: `/studies/new`

**File**: `src/app/(app)/studies/new/page.tsx`

**Current State**:

- ❌ Client Component
- ❌ Data mutation only (no initial data fetch)
- ❌ No loading.tsx
- ❌ No error.tsx
- ⚠️ Manual loading state via button click

**Data Flow**:

```
page.tsx (client)
  └─> useMutation(createStudy)
       └─> Creates study, navigates to /setup/step1
```

**Loading States**:

- ❌ Missing: No route-level `loading.tsx`
- ⚠️ Loading handled by button (AsyncButton could be used)

**Error States**:

- ❌ Missing: No route-specific `error.tsx`
- ⚠️ Errors shown via toast only

**Issues**:

1. Could use `AsyncButton` for consistency
2. No route-level error boundary
3. Simple page, but could benefit from loading/error boundaries

**Recommendations**:

1. Add `error.tsx` (optional, low priority)
2. Consider using `AsyncButton` for create button

**Priority**: Low

---

### Route 6: `/studies/[studyId]` (Study Detail Page)

**File**: `src/app/(app)/studies/[studyId]/page.tsx`

**Current State**:

- ✅ Server Component
- ✅ Complex data fetching with progressive loading
- ✅ Has `loading.tsx` (uses StudySkeleton)
- ✅ Has `error.tsx` (shows Alert with retry, no side effects)
- ✅ Has `not-found.tsx`
- ✅ Uses Suspense boundaries for progressive loading

**Data Flow**:

```
page.tsx (server)
  └─> getBlitzContext() - get session
  └─> getStudyRsc(studyId) - core study data (always fetched first)
  └─> Promise.all([
       getFeedbackTemplateRsc() - if researcher
       getStudyParticipantRsc() - if participant
       getStudyParticipantsRsc() - if researcher (prefetched)
     ])
  └─> StudyContent (client component) - receives core data immediately
  └─> Suspense fallback={<skeleton />}
       └─> JatosDataFetcher (server, async) - JATOS data progressively
       └─> ParticipantData (server, async) - participant data progressively
```

**Loading States**:

- ✅ Has `loading.tsx` - shows StudySkeleton
- ✅ Uses Suspense boundaries for progressive loading (JATOS data, participant data)
- ✅ Core study data shows immediately, secondary data loads progressively
- ✅ Participants prefetched server-side, refetch via router.refresh() after mutations

**Error States**:

- ✅ Has `error.tsx` - shows Alert with error message and retry button (no side effects)
- ✅ Has `not-found.tsx` - for invalid studyId
- ✅ Handles NotFoundError correctly
- ✅ Consistent error UI pattern

**Implementation** (✅ Completed):

1. ✅ **Fixed error.tsx**: Removed toast side effect, shows Alert with retry functionality
2. ✅ **Added Suspense boundaries**: JATOS data and participant data wrapped in Suspense for progressive loading
3. ✅ **Prefetched participants server-side**: Participants fetched in parallel with other role-specific data
4. ✅ **Updated StudyContent**: Receives participants as prop, removed useQuery for participants
5. ✅ **Updated ParticipantManagementCard**: Uses router.refresh() directly for refetching after mutations
6. ✅ **Progressive loading**: Core study data shows first, JATOS and participant data load progressively

**Benefits**:

- ✅ Better perceived performance (core data shows immediately)
- ✅ Progressive loading UX (secondary data loads as available)
- ✅ Participants prefetched server-side (no client-side fetch on initial load)
- ✅ Cleaner error handling (no side effects in error boundary)
- ✅ Next.js 15 best practices (Suspense for async server components)

**Status**: ✅ Complete (Phase 3.1, 3.2, 8.1)

**Files Created/Modified**:

- ✅ `src/app/(app)/studies/[studyId]/error.tsx` - Fixed side effects
- ✅ `src/app/(app)/studies/[studyId]/page.tsx` - Added Suspense, prefetched participants
- ✅ `src/app/(app)/studies/[studyId]/components/JatosDataContentServer.tsx` - New async component for JATOS data
- ✅ `src/app/(app)/studies/[studyId]/components/JatosDataFetcher.tsx` - Wrapper for JATOS data
- ✅ `src/app/(app)/studies/[studyId]/components/RoleSpecificDataFetcher.tsx` - Async component for participant data
- ✅ `src/app/(app)/studies/[studyId]/components/client/StudyContent.tsx` - Updated to receive participants as prop
- ✅ `src/app/(app)/studies/[studyId]/components/client/ParticipantManagementCard.tsx` - Uses router.refresh() directly

---

### Route 7: `/studies/[studyId]/edit`

**File**: `src/app/(app)/studies/[studyId]/edit/page.tsx`

**Current State**:

- ✅ Server Component
- ✅ Data fetched server-side
- ❌ No loading.tsx
- ❌ No error.tsx
- ✅ Uses Suspense (correct usage - wraps client component)

**Data Flow**:

```
page.tsx (server)
  └─> getStudyRsc(studyId)
  └─> Suspense fallback={<StudyFormSkeleton />}
       └─> EditStudyForm (client component)
            └─> Receives study data as props
```

**Loading States**:

- ✅ Suspense with StudyFormSkeleton (good)
- ❌ Missing: No route-level `loading.tsx`
- ⚠️ Suspense fallback only covers EditStudyForm, not initial page load

**Error States**:

- ✅ Handles NotFoundError (calls notFound())
- ❌ Missing: No route-specific `error.tsx`

**Issues**:

1. No route-level loading - Suspense only covers EditStudyForm rendering
2. No error boundary for route

**Recommendations**:

1. Add `loading.tsx` for route-level loading (covers getStudyRsc)
2. Add `error.tsx` for route-specific error boundary
3. Keep Suspense for EditStudyForm (good pattern)

**Priority**: Medium

---

### Route 8:

**File**: `src/app/(app)/studies/[studyId]/setup/step1/page.tsx`

**Current State**:

- ✅ Server Component (uses StepPageWrapper pattern, consistent with other steps)
- ✅ Uses study data from context (StudySetupProvider via StepPageWrapper)
- ✅ Has defaultValues from study data
- ✅ Loading/error handled at setup layout level

**Data Flow**:

```
setup/layout.tsx (server)
  └─> getStudyRsc(studyId) - study data fetched once
  └─> StudySetupProvider (client) - provides study via context
       └─> step1/page.tsx (server)
            └─> StepPageWrapper (client) - gets study from context
            └─> Step1Content (client component)
                 └─> Receives study as props
                 └─> StudyForm (client component)
                      └─> defaultValues from study
                      └─> useMutation(updateStudy)
```

**Loading States**:

- ✅ Handled at setup layout level (`setup/loading.tsx`)
- ✅ Suspense boundary in layout shows SetupContentSkeleton
- ✅ Form loading handled by FormSubmitButton

**Error States**:

- ✅ Handled at setup layout level (`setup/error.tsx`)
- ✅ Study fetching errors caught by layout
- ✅ Form errors shown inline via form error display

**Implementation** (✅ Completed):

1. ✅ **Study data from context**: Uses `useStudySetup()` hook to get study from layout
2. ✅ **Default values**: Study data used for form defaultValues
3. ✅ **Layout-level loading/error**: Setup layout has `loading.tsx` and `error.tsx`
4. ✅ **No redundant fetching**: Study data fetched once in layout, not per step

**Benefits**:

- ✅ Study data immediately available (from layout context)
- ✅ Consistent loading/error handling across all setup steps
- ✅ No redundant data fetching
- ✅ Clean separation: layout handles data, page handles form

**Status**: ✅ Complete (Phase 3.1 & 3.2)

**Note**: Loading and error states are handled at the setup layout level (`/studies/[studyId]/setup/loading.tsx` and `error.tsx`), not at individual step pages. This provides consistent UX across all setup steps.

**Files Created/Modified**:

- ✅ `src/app/(app)/studies/[studyId]/setup/step1/page.tsx` - Converted to use StepPageWrapper pattern (consistent with other steps)
- ✅ `src/app/(app)/studies/[studyId]/setup/step1/components/client/Step1Content.tsx` - New client component (extracted from page)
- ✅ `src/app/(app)/studies/[studyId]/setup/components/StepNavigation.tsx` - Updated to use `useStudySetup()` instead of `useParams()`
- ✅ `src/app/(app)/studies/[studyId]/setup/loading.tsx` - Route-level loading state (covers all steps)
- ✅ `src/app/(app)/studies/[studyId]/setup/error.tsx` - Route-level error boundary (covers all steps)

**Priority**: ✅ Medium - **COMPLETED**

---

### Route 9: `/studies/[studyId]/setup/step2`

**File**: `src/app/(app)/studies/[studyId]/setup/step2/page.tsx`

**Current State**:

- ✅ Server Component (wrapped in StepPageWrapper)
- ✅ Uses study data from context (StudySetupProvider)
- ✅ Loading/error handled at setup layout level

**Data Flow**:

```
setup/layout.tsx (server)
  └─> getStudyRsc(studyId) - study data fetched once
  └─> StudySetupProvider (client) - provides study via context
       └─> step2/page.tsx (server, wrapped in StepPageWrapper)
            └─> StepPageWrapper (client) - gets study from context
            └─> Step2Content (client component)
                 └─> Receives study data as props
                 └─> Handles file upload (client-side)
```

**Loading States**:

- ✅ Handled at setup layout level (`setup/loading.tsx`)
- ✅ Suspense boundary in layout shows SetupContentSkeleton
- ✅ File upload loading handled by Step2Content component internally

**Error States**:

- ✅ Handled at setup layout level (`setup/error.tsx`)
- ✅ Study fetching errors caught by layout
- ✅ File upload errors shown inline via component

**Implementation** (✅ Completed):

1. ✅ **Study data from context**: Uses `StepPageWrapper` to get study from layout context
2. ✅ **Removed redundant fetching**: No longer fetches study data (handled by layout)
3. ✅ **Layout-level loading/error**: Setup layout has `loading.tsx` and `error.tsx`
4. ✅ **No redundant fetching**: Study data fetched once in layout, not per step

**Benefits**:

- ✅ Study data immediately available (from layout context)
- ✅ Consistent loading/error handling across all setup steps
- ✅ No redundant data fetching
- ✅ Clean separation: layout handles data, page handles step-specific logic

**Status**: ✅ Complete (Phase 3.1 & 3.2)

**Note**: Loading and error states are handled at the setup layout level (`/studies/[studyId]/setup/loading.tsx` and `error.tsx`), not at individual step pages. This provides consistent UX across all setup steps.

**Files Created/Modified**:

- ✅ `src/app/(app)/studies/[studyId]/setup/step2/page.tsx` - Uses context, removed redundant study fetch
- ✅ `src/app/(app)/studies/[studyId]/setup/loading.tsx` - Route-level loading state (covers all steps)
- ✅ `src/app/(app)/studies/[studyId]/setup/error.tsx` - Route-level error boundary (covers all steps)

**Priority**: ✅ Medium - **COMPLETED**

---

### Route 10: `/studies/[studyId]/setup/step3`

**File**: `src/app/(app)/studies/[studyId]/setup/step3/page.tsx`

**Current State**:

- ✅ Server Component (wrapped in StepPageWrapper)
- ✅ Uses study data from context (StudySetupProvider)
- ✅ Suspense for progressive loading (step-specific data)
- ✅ Loading/error handled at setup layout level

**Data Flow**:

```
setup/layout.tsx (server)
  └─> getStudyRsc(studyId) - study data fetched once
  └─> StudySetupProvider (client) - provides study via context
       └─> step3/page.tsx (server, wrapped in StepPageWrapper)
            └─> StepPageWrapper (client) - gets study from context
            └─> Suspense fallback={<SetupContentSkeleton />}
                 └─> Step3DataFetcher (server, async)
                      └─> getResearcherRunUrlRsc(studyId) - step-specific data
                 └─> Step3Content (client component)
                      └─> Receives study + researcher data as props
```

**Loading States**:

- ✅ Handled at setup layout level (`setup/loading.tsx`)
- ✅ Suspense boundary in layout shows SetupContentSkeleton
- ✅ Progressive loading: study data first, researcher data progressively

**Error States**:

- ✅ Handled at setup layout level (`setup/error.tsx`)
- ✅ Study fetching errors caught by layout
- ✅ Researcher data errors caught and handled gracefully

**Implementation** (✅ Completed):

1. ✅ **Study data from context**: Uses `StepPageWrapper` to get study from layout context
2. ✅ **Removed redundant fetching**: No longer fetches study data (handled by layout)
3. ✅ **Suspense for progressive loading**: Researcher data loads progressively via Suspense
4. ✅ **Layout-level loading/error**: Setup layout has `loading.tsx` and `error.tsx`

**Benefits**:

- ✅ Study data immediately available (from layout context)
- ✅ Progressive loading UX (study first, researcher data as it loads)
- ✅ Consistent loading/error handling across all setup steps
- ✅ No redundant data fetching

**Status**: ✅ Complete (Phase 3.1, 3.2, 8.1)

**Note**: Loading and error states are handled at the setup layout level (`/studies/[studyId]/setup/loading.tsx` and `error.tsx`), not at individual step pages. This provides consistent UX across all setup steps.

**Files Created/Modified**:

- ✅ `src/app/(app)/studies/[studyId]/setup/step3/page.tsx` - Uses context, adds Suspense for progressive loading
- ✅ `src/app/(app)/studies/[studyId]/setup/loading.tsx` - Route-level loading state (covers all steps)
- ✅ `src/app/(app)/studies/[studyId]/setup/error.tsx` - Route-level error boundary (covers all steps)

**Priority**: ✅ Medium - **COMPLETED**

---

### Route 11: `/studies/[studyId]/setup/step4`

**File**: `src/app/(app)/studies/[studyId]/setup/step4/page.tsx`

**Current State**:

- ✅ Server Component (wrapped in StepPageWrapper)
- ✅ Uses study data from context (StudySetupProvider)
- ✅ Suspense for progressive loading (step-specific data)
- ✅ Loading/error handled at setup layout level
- ✅ Handles empty state (shows Alert)

**Data Flow**:

```
setup/layout.tsx (server)
  └─> getStudyRsc(studyId) - study data fetched once
  └─> StudySetupProvider (client) - provides study via context
       └─> step4/page.tsx (server, wrapped in StepPageWrapper)
            └─> StepPageWrapper (client) - gets study from context
            └─> Suspense fallback={<SetupContentSkeleton />}
                 └─> Step4DataFetcher (server, async)
                      └─> Promise.all([
                           getStudyDataByCommentRsc(studyId, "test"),
                           getFeedbackTemplateRsc(studyId)
                         ]) - step-specific data
                 └─> Conditional: Shows Alert if no test data
                 └─> Step4Content (client component)
                      └─> Receives study + test data + feedback template as props
```

**Loading States**:

- ✅ Handled at setup layout level (`setup/loading.tsx`)
- ✅ Suspense boundary in layout shows SetupContentSkeleton
- ✅ Progressive loading: study data first, test data and feedback template progressively

**Error States**:

- ✅ Handled at setup layout level (`setup/error.tsx`)
- ✅ Study fetching errors caught by layout
- ✅ Handles missing test data (shows Alert)
- ✅ Test data and feedback template errors caught and handled gracefully

**Implementation** (✅ Completed):

1. ✅ **Study data from context**: Uses `StepPageWrapper` to get study from layout context
2. ✅ **Removed redundant fetching**: No longer fetches study data (handled by layout)
3. ✅ **Suspense for progressive loading**: Test data and feedback template load progressively via Suspense
4. ✅ **Layout-level loading/error**: Setup layout has `loading.tsx` and `error.tsx`
5. ✅ **Empty state handling**: Shows Alert when no test data found

**Benefits**:

- ✅ Study data immediately available (from layout context)
- ✅ Progressive loading UX (study first, test data and feedback template as they load)
- ✅ Consistent loading/error handling across all setup steps
- ✅ No redundant data fetching
- ✅ Good UX with empty state handling

**Status**: ✅ Complete (Phase 3.1, 3.2, 8.1)

**Note**: Loading and error states are handled at the setup layout level (`/studies/[studyId]/setup/loading.tsx` and `error.tsx`), not at individual step pages. This provides consistent UX across all setup steps.

**Files Created/Modified**:

- ✅ `src/app/(app)/studies/[studyId]/setup/step4/page.tsx` - Uses context, adds Suspense for progressive loading
- ✅ `src/app/(app)/studies/[studyId]/setup/loading.tsx` - Route-level loading state (covers all steps)
- ✅ `src/app/(app)/studies/[studyId]/setup/error.tsx` - Route-level error boundary (covers all steps)

**Priority**: ✅ Medium - **COMPLETED**

---

### Route 12: `/profile`

**File**: `src/app/(app)/profile/page.tsx`

**Current State**:

- ✅ Server Component
- ✅ Data fetched server-side using `getCurrentUserRsc()`
- ✅ Has `loading.tsx` with ProfileSkeleton
- ✅ Has `error.tsx` for error boundary
- ✅ Leverages App Layout user data (React cache dedupe)

**Data Flow**:

```
page.tsx (server)
  └─> getBlitzContext() - get session
  └─> getCurrentUserRsc() - user data (cached if already fetched in layout)
  └─> ProfileContent (client component)
       └─> Receives user data as props
       └─> Renders profile UI
```

**Loading States**:

- ✅ Has `loading.tsx` - shows ProfileSkeleton
- ✅ Route-level loading state during navigation
- ✅ User data cached from layout (React cache dedupe)

**Error States**:

- ✅ Has `error.tsx` - shows Alert with error message and retry button
- ✅ Consistent error UI pattern
- ✅ Handles authentication redirects

**Implementation** (✅ Completed):

1. ✅ **Converted to Server Component**: Fetches user data server-side
2. ✅ **Leverages layout data**: Uses `getCurrentUserRsc()` which is cached from App Layout fetch
3. ✅ **Created ProfileContent**: Client component that receives user data as props
4. ✅ **Added loading.tsx**: Shows ProfileSkeleton during route navigation
5. ✅ **Added error.tsx**: Shows error boundary with retry functionality
6. ✅ **Removed manual loading**: No more client-side `useCurrentUser()` hook

**Benefits**:

- ✅ Better performance (server-side fetching, cached from layout)
- ✅ Consistent loading/error states
- ✅ No redundant data fetching (React cache dedupe)
- ✅ Better UX with route-level loading skeleton
- ✅ Proper error handling with retry functionality

**Status**: ✅ Complete (Phase 2.1, 3.1 & 3.2)

**Files Created/Modified**:

- ✅ `src/app/(app)/profile/page.tsx` - Converted to server component
- ✅ `src/app/(app)/profile/components/ProfileContent.tsx` - New client component
- ✅ `src/app/(app)/profile/components/ProfileSkeleton.tsx` - New skeleton component
- ✅ `src/app/(app)/profile/loading.tsx` - Route-level loading state
- ✅ `src/app/(app)/profile/error.tsx` - Route-level error boundary

**Priority**: ✅ High - **COMPLETED**

---

### Route 13: `/profile/edit`

**File**: `src/app/(app)/profile/edit/page.tsx`

**Current State**:

- ✅ Server Component
- ⚠️ No data fetching (form component fetches its own data)
- ❌ No loading.tsx
- ❌ No error.tsx

**Data Flow**:

```
page.tsx (server)
  └─> EditProfileForm (client component)
       └─> useCurrentUser() hook - fetches data client-side
```

**Loading States**:

- ❌ Missing: No route-level `loading.tsx`
- ⚠️ Form component handles its own loading

**Error States**:

- ❌ Missing: No route-specific `error.tsx`

**Issues**:

1. Should fetch user data server-side and pass to form
2. No route-level loading/error states

**Recommendations**:

1. **Fetch user data server-side**: Use `getCurrentUserRsc`, pass to form
2. Add `loading.tsx` with skeleton
3. Add `error.tsx` for error boundary

**Priority**: Medium

---

### Route 14: Auth Routes (`/login`, `/signup`, `/forgot-password`, `/reset-password`)

**Files**: `src/app/(auth)/login/page.tsx`, `signup/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx`

**Current State**:

- ✅ Server Components (pages are simple wrappers)
- ✅ Forms are client components (appropriate for interactivity)
- ✅ Has `loading.tsx` at auth layout level (covers all auth routes)
- ✅ Has `error.tsx` at auth layout level (covers all auth routes)
- ✅ Auth layout handles authentication redirects

**Data Flow**:

```
auth/layout.tsx (server)
  └─> useAuthenticatedBlitzContext() - redirects if already authenticated
       └─> page.tsx (server)
            └─> Form component (client)
                 └─> Form submission (mutation)
```

**Loading States**:

- ✅ Has `loading.tsx` at auth layout level - shows skeleton during navigation
- ✅ Loading handled by form submission (FormSubmitButton)
- ✅ Route-level loading state during navigation

**Error States**:

- ✅ Has `error.tsx` at auth layout level - shows error boundary with retry
- ✅ Errors shown via form error display (for form validation errors)
- ✅ Layout-level error boundary for unexpected errors

**Implementation** (✅ Completed):

1. ✅ **Simple page structure**: Pages are server components that render client form components (appropriate)
2. ✅ **Layout-level loading/error**: Auth layout has `loading.tsx` and `error.tsx` (covers all auth routes)
3. ✅ **Form handling**: Forms handle their own errors and loading states (FormSubmitButton, FormErrorDisplay)
4. ✅ **Authentication redirects**: Layout handles redirecting authenticated users

**Benefits**:

- ✅ Consistent loading/error handling across all auth routes
- ✅ No redundant loading/error files per route
- ✅ Forms handle their own validation errors (inline)
- ✅ Layout handles unexpected errors (error boundary)
- ✅ Better UX with route-level loading skeleton

**Status**: ✅ Complete (Phase 3.1 & 3.2)

**Note**: Loading and error states are handled at the auth layout level (`/(auth)/loading.tsx` and `error.tsx`), not at individual auth pages. This provides consistent UX across all auth routes. Forms handle their own validation errors inline.

**Files Created/Modified**:

- ✅ `src/app/(auth)/loading.tsx` - Route-level loading state (covers all auth routes)
- ✅ `src/app/(auth)/error.tsx` - Route-level error boundary (covers all auth routes)
- ✅ Auth pages remain simple wrappers (no changes needed)

**Priority**: ✅ Low - **COMPLETED**

---

## Layout Analysis

### Overview

Layouts in Next.js 15 preserve state, remain interactive, and do not rerender on navigation. They're shared between multiple pages and can fetch data that persists across route changes. This is critical for UX improvements (Phase 8) and loading state optimization (Phase 3).

### Layout 1: Root Layout (`/`)

**File**: `src/app/layout.tsx`

**Current State**:

- ✅ Server Component
- ✅ Minimal - wraps children with BlitzProvider
- ✅ No data fetching
- ✅ No async operations

**Shared State**: None

**Status**: ✅ Complete - No changes needed

---

### Layout 2: App Layout (`/(app)/`)

**File**: `src/app/(app)/layout.tsx`

**Current State**:

- ✅ Server Component
- ✅ Fetches user data server-side in layout
- ✅ MainNavbar receives user as prop (no client-side fetching)
- ✅ Suspense boundary with NavbarSkeleton for progressive loading
- ✅ State preserved across navigation (layout doesn't rerender)

**Data Flow**:

```
layout.tsx (server)
  └─> getBlitzContext() - get session
  └─> getCurrentUserRsc() - fetch user data (once, cached)
  └─> Suspense fallback={<NavbarSkeleton />}
       └─> MainNavbar (client, receives currentUser as prop)
```

**Implementation** (✅ Completed):

1. ✅ **Fetches user data in layout** (Server Component): Uses `getCurrentUserRsc()` to fetch user data server-side
2. ✅ **MainNavbar receives user as prop**: Removed `useCurrentUser` hook, now receives `currentUser` as prop
3. ✅ **Suspense boundary**: Shows `NavbarSkeleton` while user data loads (only on initial load)
4. ✅ **State preservation**: User data persists across navigation (layout doesn't rerender)

**Benefits** (Phase 8 - UX Improvements):

- ✅ User data persists across navigation (no refetch)
- ✅ Faster perceived performance (navbar always shows immediately)
- ✅ Reduced server load (fetch once in layout, not on every page)
- ✅ Better loading UX (skeleton only on initial load)

**Status**: ✅ Complete (Phase 3.1 & Phase 8.1)

**Files Created/Modified**:

- ✅ `src/app/(app)/layout.tsx` - Now fetches user data server-side
- ✅ `src/app/components/MainNavbar.tsx` - Receives user as prop
- ✅ `src/app/components/NavbarSkeleton.tsx` - New skeleton component for navbar loading state

---

### Layout 3: Auth Layout (`/(auth)/`)

**File**: `src/app/(auth)/layout.tsx`

**Current State**:

- ✅ Server Component
- ✅ Fetches auth state server-side
- ✅ Handles redirects correctly
- ⚠️ Blocks all auth pages until auth check completes

**Data Flow**:

```
layout.tsx (server)
  └─> useAuthenticatedBlitzContext()
       └─> Checks authentication
       └─> Redirects if authenticated
```

**Issues**:

1. **Blocking layout**: All auth pages wait for auth check
2. **No loading state**: Users see blank page while auth check runs
3. **No error handling**: No error boundary for auth check failures

**Recommendations** (Phase 3 & 8):

1. **Add loading.tsx**: Show loading state during auth check
2. **Add error.tsx**: Handle auth check errors gracefully
3. **Consider Suspense**: Could use Suspense for progressive auth check (low priority)

**Benefits**:

- ✅ Better UX (users see loading state)
- ✅ Graceful error handling

**Priority**: Medium (Phase 3.2)

---

### Layout 4: Study Setup Layout (`/studies/[studyId]/setup/`)

**File**: `src/app/(app)/studies/[studyId]/setup/layout.tsx`

**Current State**:

- ✅ Server Component
- ✅ Fetches study data server-side (once in layout)
- ✅ Contains StepIndicator (client component)
- ✅ StudySetupProvider (client context provider)
- ✅ Suspense boundary with SetupContentSkeleton
- ✅ State preservation across step navigation

**Data Flow**:

```
layout.tsx (server)
  └─> getStudyRsc(studyId) - study data fetched once
  └─> StudySetupProvider (client) - provides study via context
       └─> StepIndicator (client)
       └─> Suspense fallback={<SetupContentSkeleton />}
            └─> children (step pages)
                 └─> StepPageWrapper (client) - consumes context
                      └─> Step-specific data fetching (async)
```

**Implementation** (✅ Completed):

1. ✅ **Fetch study data in layout**: Study data fetched server-side once in layout
2. ✅ **StudySetupProvider**: Client context provider passes study data to step pages
3. ✅ **StepPageWrapper**: Client wrapper component that consumes context and provides study to step pages
4. ✅ **Suspense boundary**: Added for progressive loading of step-specific data
5. ✅ **State preservation**: Study data persists across step navigation (no refetch)
6. ✅ **Updated step pages**: All step pages (step1-4) now use context instead of fetching study data

**Benefits** (Phase 8 - UX Improvements):

- ✅ Study data persists across step navigation (no refetch on navigation)
- ✅ Faster perceived performance (study data always available immediately)
- ✅ Reduced server load (fetch once in layout, not per step)
- ✅ Better loading UX (progressive loading with Suspense for step-specific data)
- ✅ Cleaner code (study data passed via context, no redundant fetching)

**Status**: ✅ Complete (Phase 3.1 & Phase 8.1)

**Files Created/Modified**:

- ✅ `src/app/(app)/studies/[studyId]/setup/layout.tsx` - Fetches study, adds Suspense
- ✅ `src/app/(app)/studies/[studyId]/setup/components/StudySetupProvider.tsx` - New context provider
- ✅ `src/app/(app)/studies/[studyId]/setup/components/StepPageWrapper.tsx` - New wrapper component
- ✅ `src/app/(app)/studies/[studyId]/setup/components/SetupContentSkeleton.tsx` - New skeleton component
- ✅ `src/app/(app)/studies/[studyId]/setup/step1/page.tsx` - Uses context instead of params
- ✅ `src/app/(app)/studies/[studyId]/setup/step2/page.tsx` - Uses context instead of fetching
- ✅ `src/app/(app)/studies/[studyId]/setup/step3/page.tsx` - Uses context, adds Suspense for step-specific data
- ✅ `src/app/(app)/studies/[studyId]/setup/step4/page.tsx` - Uses context, adds Suspense for step-specific data

**Priority**: ✅ High (Phase 3.1 & Phase 8.1) - **COMPLETED**

---

### Layout Summary

| Layout                                    | Fetches Data                | Has Loading   | Has Error | State Preservation | Status        |
| ----------------------------------------- | --------------------------- | ------------- | --------- | ------------------ | ------------- |
| Root (`/`)                                | ❌ N/A                      | ❌ N/A        | ❌ N/A    | ✅ Static          | ✅ Complete   |
| App (`/(app)/`)                           | ✅ (user data server-side)  | ✅ (Suspense) | ❌        | ✅                 | ✅ Complete   |
| Auth (`/(auth)/`)                         | ✅ (auth check)             | ❌            | ❌        | ✅ (session)       | 🟡 Needs Work |
| Study Setup (`/studies/[studyId]/setup/`) | ✅ (study data server-side) | ✅ (Suspense) | ❌        | ✅                 | ✅ Complete   |

**Statistics**:

- ✅ Properly utilizing layouts: 3 layouts (75%) ⬆️
- ❌ Missing data fetching in layouts: 0 layouts (0%) ✅ **ALL FIXED**
- ✅ Has loading states: 3 layouts (75%) ⬆️
- ❌ Missing error boundaries: 3 layouts (75%)

**Key Opportunities**:

1. ~~**App Layout**: Fetch user data server-side, preserve across navigation (High Priority)~~ ✅ **COMPLETED**
2. ~~**Study Setup Layout**: Fetch study data server-side, preserve across steps (High Priority)~~ ✅ **COMPLETED**
3. **Auth Layout**: Add loading/error states (Medium Priority)

---

## Not-Found Analysis

### Overview

Not-found pages provide a better UX when resources don't exist or users lack access. Next.js 15 supports `not-found.tsx` files at route segment level. They should be actionable and informative (Phase 8 - UX Improvements).

### Current Not-Found Pages

#### Not-Found 1: Study Detail (`/studies/[studyId]/not-found.tsx`)

**File**: `src/app/(app)/studies/[studyId]/not-found.tsx`

**Current State**:

- ✅ Exists
- ✅ Informative message
- ❌ Not actionable (no link back)
- ❌ No context about what went wrong
- ⚠️ Uses generic styling

**Current Code**:

```tsx
export default function NotFound() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold text-center mt-8">Study not found</h1>
      <p className="text-center mt-2 text-gray-500">
        The study you're looking for doesn't exist or you don't have access.
      </p>
    </main>
  )
}
```

**Issues**:

1. **Not actionable**: No link back to studies list or dashboard
2. **No context**: Doesn't explain what might have happened
3. **Generic styling**: Could use Alert component for consistency

**Recommendations** (Phase 3 & 8):

1. **Add action buttons**:

   ```tsx
   import Link from "next/link"
   import { Alert } from "@/src/app/components/Alert"
   import { EmptyState } from "@/src/app/components/EmptyState"

   export default function NotFound() {
     return (
       <main className="p-6">
         <Alert variant="warning" title="Study Not Found">
           <p>The study you're looking for doesn't exist or you don't have access.</p>
           <p className="text-sm mt-2">This could happen if:</p>
           <ul className="text-sm list-disc ml-5 mt-1">
             <li>The study was deleted or archived</li>
             <li>You don't have permission to view this study</li>
             <li>The study ID is incorrect</li>
           </ul>
         </Alert>
         <div className="flex gap-2 justify-center mt-6">
           <Link href="/studies" className="btn btn-primary">
             Go to My Studies
           </Link>
           <Link href="/dashboard" className="btn btn-ghost">
             Go to Dashboard
           </Link>
         </div>
       </main>
     )
   }
   ```

2. **Use consistent components**: Alert and EmptyState for consistency
3. **Improve UX**: Actionable buttons and helpful context

**Priority**: Medium (Phase 8.3)

---

### Missing Not-Found Pages

Most routes are missing `not-found.tsx` files. When `notFound()` is called, Next.js falls back to the nearest `not-found.tsx` up the tree or the root default.

**Routes Missing Not-Found Pages**:

| Route                        | Calls notFound()? | Has not-found.tsx | Should Add? |
| ---------------------------- | ----------------- | ----------------- | ----------- |
| `/dashboard`                 | ❌                | ❌                | ❌ N/A      |
| `/explore`                   | ❌                | ❌                | ❌ N/A      |
| `/studies`                   | ❌                | ❌                | ❌ N/A      |
| `/studies/new`               | ❌                | ❌                | ❌ N/A      |
| `/studies/[studyId]`         | ✅                | ✅                | ✅ Has it   |
| `/studies/[studyId]/edit`    | ✅                | ❌                | ✅ Yes      |
| `/studies/[studyId]/setup/*` | ✅                | ❌                | ✅ Yes      |
| `/profile`                   | ❌                | ❌                | ❌ N/A      |
| `/profile/edit`              | ❌                | ❌                | ❌ N/A      |
| Auth routes                  | ❌                | ❌                | ❌ N/A      |

**Recommendations** (Phase 3 & 8):

1. **Add not-found.tsx for edit route**: Study might not exist or user lacks access
2. **Add not-found.tsx for setup routes**: Study might not exist or setup might be invalid
3. **Consider shared not-found**: Could create a shared component for study-related not-found pages

**Benefits** (Phase 8 - UX Improvements):

- ✅ Better error messaging for users
- ✅ Actionable navigation (links back to safe pages)
- ✅ Consistent UX across routes

**Priority**: Low-Medium (Phase 8.3)

---

## Layout & Not-Found Integration Recommendations

### Phase 3.1: Critical Layout Optimizations

1. **Optimize App Layout** (`/(app)/layout.tsx`):

   - Fetch user data server-side in layout
   - Pass user data to MainNavbar as prop
   - Add Suspense boundary for progressive loading
   - Preserve user state across navigation

2. **Optimize Study Setup Layout** (`/studies/[studyId]/setup/layout.tsx`):

   - Fetch study data server-side in layout
   - Pass study data to step pages as props
   - Add Suspense boundary for progressive loading
   - Preserve study state across step navigation

3. **Add Loading/Error to Auth Layout**:
   - Add `loading.tsx` for auth check
   - Add `error.tsx` for auth check errors

### Phase 8.1: Progressive Loading via Layouts

4. **Implement Suspense in Layouts**:
   - App Layout: Suspense for navbar (initial load only)
   - Study Setup Layout: Suspense for step content
   - Benefits: Better perceived performance, state preservation

### Phase 8.3: Enhanced Not-Found Pages

5. **Improve Existing Not-Found**:

   - Add action buttons (Phase 8 - UX Improvements)
   - Use consistent components (Alert, EmptyState)
   - Provide helpful context

6. **Add Missing Not-Found Pages**:
   - `/studies/[studyId]/edit/not-found.tsx`
   - `/studies/[studyId]/setup/not-found.tsx`
   - Create shared not-found component for consistency

---

## Summary Statistics

### Loading States

| Route                            | Has loading.tsx | Uses Suspense | Has Skeletons | Status          |
| -------------------------------- | --------------- | ------------- | ------------- | --------------- |
| `/`                              | ❌ N/A          | ❌ N/A        | ❌ N/A        | ✅ Complete     |
| `/dashboard`                     | ✅              | ✅            | ✅            | ✅ Complete     |
| `/explore`                       | ✅              | ✅            | ✅            | ✅ Complete     |
| `/studies`                       | ✅              | ✅            | ✅            | ✅ Complete     |
| `/studies/new`                   | ❌              | ❌            | ❌            | 🟡 Low Priority |
| `/studies/[studyId]`             | ✅              | ✅            | ✅            | ✅ Complete     |
| `/studies/[studyId]/edit`        | ❌              | ✅            | ✅            | 🟡 Needs Work   |
| `/studies/[studyId]/setup/step1` | ✅ (layout)     | ✅ (layout)   | ✅ (layout)   | ✅ Complete     |
| `/studies/[studyId]/setup/step2` | ✅ (layout)     | ✅ (layout)   | ✅ (layout)   | ✅ Complete     |
| `/studies/[studyId]/setup/step3` | ✅ (layout)     | ✅ (layout)   | ✅ (layout)   | ✅ Complete     |
| `/studies/[studyId]/setup/step4` | ✅ (layout)     | ✅ (layout)   | ✅ (layout)   | ✅ Complete     |
| `/profile`                       | ✅              | ✅            | ✅            | ✅ Complete     |
| `/profile/edit`                  | ❌              | ❌            | ❌            | 🟡 Needs Work   |
| Auth routes                      | ✅ (layout)     | ✅ (layout)   | ✅ (layout)   | ✅ Complete     |

**Statistics**:

- ✅ Has loading.tsx: 7 routes (50%) ⬆️ (includes setup layout covering 4 steps, auth layout covering 4 routes)
- ✅ Uses Suspense correctly: 4 routes (29%)
- ⚠️ Uses Suspense incorrectly: 0 routes (0%) ✅ **ALL FIXED**
- ❌ Missing loading.tsx: 7 routes (50%)

### Error States

| Route                        | Has error.tsx | Handles NotFoundError | Has not-found.tsx | Status          |
| ---------------------------- | ------------- | --------------------- | ----------------- | --------------- |
| `/`                          | ❌            | ❌ N/A                | ❌ N/A            | ✅ Complete     |
| `/dashboard`                 | ✅            | ❌ N/A                | ❌ N/A            | ✅ Complete     |
| `/explore`                   | ✅            | ❌ N/A                | ❌ N/A            | ✅ Complete     |
| `/studies`                   | ✅            | ❌ N/A                | ❌ N/A            | ✅ Complete     |
| `/studies/new`               | ❌            | ❌ N/A                | ❌ N/A            | 🟢 Low Priority |
| `/studies/[studyId]`         | ✅            | ✅                    | ✅                | ✅ Complete     |
| `/studies/[studyId]/edit`    | ❌            | ✅                    | ❌                | 🟡 Needs Work   |
| `/studies/[studyId]/setup/*` | ✅ (layout)   | ✅                    | ❌                | ✅ Complete     |
| `/profile`                   | ✅            | ❌ N/A                | ❌ N/A            | ✅ Complete     |
| `/profile/edit`              | ❌            | ❌ N/A                | ❌ N/A            | 🟡 Needs Work   |
| Auth routes                  | ✅ (layout)   | ❌ N/A                | ❌ N/A            | ✅ Complete     |

**Statistics**:

- ✅ Has error.tsx: 7 routes (50%) ⬆️ (includes setup layout covering 4 steps, auth layout covering 4 routes)
- ✅ Has not-found.tsx: 1 route (7%)
- ❌ Missing error.tsx: 7 routes (50%)

---

## Critical Issues

### 1. ~~Suspense Misuse~~ ✅ **RESOLVED**

**Routes Affected**: ~~`/explore`, `/studies`~~ ✅ **FIXED**

**Problem**: ~~Suspense boundaries wrap server components that already have data loaded.~~ ✅ **RESOLVED**

**Solution Applied**: Removed unnecessary Suspense boundaries from both `/explore` and `/studies` routes. Data is fetched synchronously in server components, so Suspense was ineffective. Route-level `loading.tsx` files now handle loading states correctly during navigation.

**Status**: ✅ **All Suspense misuse issues resolved**

---

### 2. Client Components Fetching Initial Data ⚠️ HIGH PRIORITY

**Routes Affected**: `/dashboard`, `/profile`, `/profile/edit`

**Problem**: Routes use client components with hooks (`useCurrentUser`) to fetch initial data. Should be server components.

**Current Pattern** (inefficient):

```tsx
// page.tsx (client)
export default function ProfilePage() {
  const currentUser = useCurrentUser() // Client-side fetch
  if (!currentUser) return <Loading />
  // ...
}
```

**Fix Pattern**:

```tsx
// page.tsx (server)
export default async function ProfilePage() {
  const { session } = await getBlitzContext()
  const currentUser = await getCurrentUserRsc(session.userId)

  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent currentUser={currentUser} />
    </Suspense>
  )
}
```

**Recommendation**: Convert to server components, add RSC helpers if missing

---

### 3. Missing Route-Level Loading States ⚠️ MEDIUM PRIORITY

**Routes Affected**: Almost all routes except `/studies/[studyId]`

**Problem**: Most routes don't have `loading.tsx` files, so Next.js can't show route-level loading states during navigation.

**Recommendation**: Add `loading.tsx` files to all routes that fetch data

---

### 4. Missing Error Boundaries ⚠️ MEDIUM PRIORITY

**Routes Affected**: Almost all routes except `/studies/[studyId]`

**Problem**: Most routes don't have `error.tsx` files for route-specific error handling.

**Recommendation**: Add `error.tsx` files to all routes

---

### 5. Error.tsx Shows Toast (Side Effect) ⚠️ MEDIUM PRIORITY

**Route**: `/studies/[studyId]/error.tsx`

**Problem**: Error boundaries should not have side effects (toasts) in render.

**Current Code**:

```tsx
export default function Error({ error }: { error: Error }) {
  useEffect(() => {
    toast.error("Could not load study") // ❌ Side effect
  }, [error])
  // ...
}
```

**Fix**: Remove toast, show error UI only. Toasts should be in parent components or via error logging service.

**Recommendation**: Fix error.tsx to not show toasts

---

### 6. No Progressive Loading ⚠️ LOW-MEDIUM PRIORITY

**Routes Affected**: Routes with parallel data fetching (`/studies/[studyId]`, `/setup/step3`, `/setup/step4`)

**Problem**: All data fetched in parallel, user sees nothing until all data loads.

**Opportunity**: Use Suspense boundaries to show data progressively:

1. Show study data first (core data)
2. Show JATOS metadata as it loads (secondary data)
3. Show feedback template/participant data as it loads (role-specific data)

**Recommendation**: Implement progressive loading with Suspense for better perceived performance

---

## Implementation Priority

### Phase 3.1: Critical Fixes (Must Do First)

1. ~~**Optimize App Layout** (`/(app)/layout.tsx`) - **NEW - High Priority**~~ ✅ **COMPLETED**

   - ✅ Fetch user data server-side in layout
   - ✅ Convert MainNavbar to receive user as prop
   - ✅ Add Suspense boundary for progressive loading
   - ✅ Preserve user state across navigation
   - **Benefits**: Eliminates redundant data fetching, improves perceived performance
   - **Files Modified**: `src/app/(app)/layout.tsx`, `src/app/components/MainNavbar.tsx`
   - **Files Created**: `src/app/components/NavbarSkeleton.tsx`

2. **Optimize Study Setup Layout** (`/studies/[studyId]/setup/layout.tsx`) - **NEW - High Priority**

   - Fetch study data server-side in layout
   - Pass study data to step pages as props
   - Add Suspense boundary for progressive loading
   - Preserve study state across step navigation
   - **Benefits**: Eliminates redundant data fetching, faster step transitions

3. ~~**Fix Suspense misuse** (`/explore`, `/studies`)~~ ✅ **COMPLETED**

   - ✅ `/explore`: Fixed Suspense misuse (removed unnecessary Suspense)
   - ✅ `/studies`: Fixed Suspense misuse (removed unnecessary Suspense)
   - **Status**: All Suspense misuse issues resolved

4. ~~**Fix error.tsx side effects** (`/studies/[studyId]/error.tsx`)~~ ✅ **COMPLETED**

   - ✅ Removed toast from error boundary
   - ✅ Shows Alert with error message and retry button
   - ✅ No side effects in error boundary

5. ~~**Convert client components to server** (`/dashboard`, `/profile`)~~ ✅ **PARTIALLY COMPLETED** (`/dashboard` done)
   - ✅ `/dashboard`: Converted to server component, leverages layout user data
   - ⏳ `/profile`: Still needs conversion
   - Pass data as props to client components

### Phase 3.2: Add Missing Loading States

6. **Add loading.tsx files** to all routes that fetch data:

   - ✅ `/dashboard` - **COMPLETED**
   - ✅ `/explore` - **COMPLETED**
   - ✅ `/studies` - **COMPLETED**
   - ⏳ `/studies/[studyId]/edit`
   - ⏳ `/studies/[studyId]/setup/*` (all steps)
   - ⏳ `/profile`
   - ⏳ `/profile/edit`

7. **Create missing skeleton components**:
   - ⏳ ProfileSkeleton
   - ✅ DashboardSkeleton - **COMPLETED**
   - ✅ StudiesSkeleton - **COMPLETED**
   - ✅ ExploreSkeleton - **COMPLETED**
   - ⏳ Setup step skeletons (if needed)

### Phase 3.3: Add Missing Error Boundaries

6. **Add error.tsx files** to all routes:
   - Use consistent error UI pattern
   - Show actionable error messages
   - Provide retry/reset functionality

### Phase 8.1: Progressive Loading (UX Improvements)

7. **Implement Suspense for progressive loading in pages**:

   - `/studies/[studyId]` - Show study data first, JATOS data progressively
   - `/setup/step3` - Show study data first, researcher data progressively (can leverage layout data)
   - `/setup/step4` - Show study data first, test data progressively (can leverage layout data)

8. **Implement Suspense in layouts** (Partial - see Phase 3.1):

   - App Layout: Suspense for navbar (already in Phase 3.1)
   - Study Setup Layout: Suspense for step content (already in Phase 3.1)
   - **Note**: Layout optimizations are in Phase 3.1 for critical fixes

9. **Optimize data fetching patterns**:
   - Prefetch critical data
   - Defer non-critical data
   - Use streaming where appropriate

### Phase 8.2: Optimistic Updates (Future)

10. **Add optimistic updates** for mutations:
    - Study updates
    - Profile updates
    - Participant management actions

### Phase 8.3: Enhanced Not-Found Pages (UX Improvements)

11. **Improve existing not-found page** (`/studies/[studyId]/not-found.tsx`):

    - Add action buttons (links back to safe pages)
    - Use Alert component for consistency
    - Provide helpful context about what went wrong

12. **Add missing not-found pages**:
    - `/studies/[studyId]/edit/not-found.tsx`
    - `/studies/[studyId]/setup/not-found.tsx`
    - Consider shared not-found component for consistency

---

## Recommended Implementation Order

### Phase 1: Layout Optimizations (Critical - Do First)

**Why First**: Layout optimizations eliminate redundant data fetching across multiple routes and improve perceived performance.

1. ~~**App Layout** (`/(app)/layout.tsx`) - **CRITICAL**~~ ✅ **COMPLETED**

   - ✅ Fetch user data server-side
   - ✅ Convert MainNavbar to receive user as prop
   - ✅ Add Suspense boundary with NavbarSkeleton
   - **Impact**: Improves all routes under `/(app)/` (dashboard, profile, studies, explore)
   - **Files Modified**: `src/app/(app)/layout.tsx`, `src/app/components/MainNavbar.tsx`
   - **Files Created**: `src/app/components/NavbarSkeleton.tsx`

2. ~~**Study Setup Layout** (`/studies/[studyId]/setup/layout.tsx`) - **CRITICAL**~~ ✅ **COMPLETED**

   - ✅ Fetch study data server-side (fetched once in layout)
   - ✅ Update all step pages to use context (StudySetupProvider)
   - ✅ Add Suspense boundary (for progressive loading of step-specific data)
   - ✅ State preservation (study data persists across step navigation)
   - ✅ Add loading.tsx at setup layout level (covers all steps)
   - ✅ Add error.tsx at setup layout level (covers all steps)
   - **Impact**: Improves all setup step routes (step1-4)
   - **Files Modified**: `layout.tsx`, `step1/page.tsx`, `step2/page.tsx`, `step3/page.tsx`, `step4/page.tsx`
   - **Files Created**: `StudySetupProvider.tsx`, `StepPageWrapper.tsx`, `SetupContentSkeleton.tsx`, `loading.tsx`, `error.tsx`

3. ~~**Auth Layout** (`/(auth)/layout.tsx`) - **MEDIUM**~~ ✅ **COMPLETED**

   - ✅ Added loading.tsx at auth layout level (covers all auth routes)
   - ✅ Added error.tsx at auth layout level (covers all auth routes)
   - ✅ Forms handle their own validation errors (inline)
   - ✅ Layout-level error boundary for unexpected errors
   - **Impact**: Improves all auth routes (login, signup, forgot-password, reset-password)
   - **Files Created**: `(auth)/loading.tsx`, `(auth)/error.tsx`

### Phase 2: Route-by-Route Implementation

**After layout optimizations**, start with routes that have the most issues:

1. ~~**Route 6: `/studies/[studyId]`** (High Priority)~~ ✅ **COMPLETED**

   - ✅ Fixed error.tsx side effects (removed toast)
   - ✅ Added Suspense for progressive loading (JATOS data, participant data)
   - ✅ Prefetched participants server-side
   - ✅ Updated ParticipantManagementCard to use router.refresh()
   - ✅ Already has loading.tsx ✅
   - **Files Modified**: `page.tsx`, `error.tsx`, `StudyContent.tsx`, `ParticipantManagementCard.tsx`
   - **Files Created**: `JatosDataContentServer.tsx`, `JatosDataFetcher.tsx`, `RoleSpecificDataFetcher.tsx`

2. ~~**Route 3: `/explore`** (High Priority)~~ ✅ **COMPLETED**

   - ✅ Fixed Suspense misuse (removed unnecessary Suspense)
   - ✅ Added loading.tsx with ExploreSkeleton
   - ✅ Added error.tsx for error boundary
   - ✅ Can leverage App Layout user data (via session)
   - **Files Modified**: `src/app/(app)/explore/page.tsx`
   - **Files Created**: `ExploreSkeleton.tsx`, `loading.tsx`, `error.tsx`

3. ~~**Route 4: `/studies`** (High Priority)~~ ✅ **COMPLETED**

   - ✅ Fixed Suspense misuse (removed unnecessary Suspense)
   - ✅ Added loading.tsx with StudiesSkeleton
   - ✅ Added error.tsx for error boundary
   - ✅ Can leverage App Layout user data (via session)
   - **Files Modified**: `src/app/(app)/studies/page.tsx`
   - **Files Created**: `StudiesSkeleton.tsx`, `loading.tsx`, `error.tsx`

4. ~~**Route 2: `/dashboard`** (High Priority)~~ ✅ **COMPLETED**

   - ✅ Converted to server component
   - ✅ Added loading.tsx with DashboardSkeleton
   - ✅ Added error.tsx for error boundary
   - ✅ Leverages App Layout user data (cached fetch)
   - **Files Modified**: `src/app/(app)/dashboard/page.tsx`
   - **Files Created**: `DashboardContent.tsx`, `DashboardSkeleton.tsx`, `loading.tsx`, `error.tsx`

5. ~~**Route 12: `/profile`** (High Priority)~~ ✅ **COMPLETED**

   - ✅ Converted to server component
   - ✅ Added loading.tsx with ProfileSkeleton
   - ✅ Added error.tsx for error boundary
   - ✅ Leverages App Layout user data (React cache dedupe)
   - **Files Modified**: `src/app/(app)/profile/page.tsx`
   - **Files Created**: `ProfileContent.tsx`, `ProfileSkeleton.tsx`, `loading.tsx`, `error.tsx`

6. **Route 13: `/profile/edit`** (Medium Priority)

   - Fetch user data server-side
   - Add loading.tsx
   - Add error.tsx

7. ~~**Route 8: `/studies/[studyId]/setup/step1`** (Medium Priority)~~ ✅ **COMPLETED**

   - ✅ Uses study data from context (StudySetupProvider)
   - ✅ Has defaultValues from study data
   - ✅ Loading/error handled at setup layout level (`setup/loading.tsx`, `setup/error.tsx`)
   - **Files Modified**: `step1/page.tsx`
   - **Files Created**: `setup/loading.tsx`, `setup/error.tsx` (shared across all steps)

8. ~~**Routes 9-11: Setup steps 2-4** (Medium Priority)~~ ✅ **COMPLETED**

   - ✅ Study data fetched in layout (StudySetupProvider)
   - ✅ Study data passed via context (StepPageWrapper)
   - ✅ Removed redundant study data fetching from step pages
   - ✅ Suspense added for progressive loading (step-specific data in step3, step4)
   - ✅ Loading/error handled at setup layout level (`setup/loading.tsx`, `setup/error.tsx`)
   - **Files Modified**: `step2/page.tsx`, `step3/page.tsx`, `step4/page.tsx`
   - **Files Created**: `setup/loading.tsx`, `setup/error.tsx` (shared across all steps)

9. **Route 7: `/studies/[studyId]/edit`** (Medium Priority)

   - Add loading.tsx
   - Add error.tsx

10. **Route 5: `/studies/new`** (Low Priority)

    - Add error.tsx (optional)

11. ~~**Auth routes** (Low Priority)~~ ✅ **COMPLETED**

    - ✅ Added loading.tsx at auth layout level (covers all auth routes)
    - ✅ Added error.tsx at auth layout level (covers all auth routes)
    - ✅ Forms handle their own validation errors (inline)
    - ✅ Layout-level error boundary for unexpected errors
    - **Files Created**: `(auth)/loading.tsx`, `(auth)/error.tsx`

12. **Not-Found Pages** (Medium Priority - Phase 8.3)
    - Improve `/studies/[studyId]/not-found.tsx` (add actions, use Alert)
    - Add `/studies/[studyId]/edit/not-found.tsx`
    - Add `/studies/[studyId]/setup/not-found.tsx`
    - Consider shared not-found component

---

## Pattern Templates

### Standard Route Pattern

```tsx
// page.tsx (Server Component)
import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getDataRsc } from "./queries/getData"
import { Loading } from "./loading"
import Content from "./components/client/Content"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const idNum = Number(id)

  if (!Number.isFinite(idNum)) {
    notFound()
  }

  try {
    const data = await getDataRsc(idNum)

    return (
      <main>
        <Suspense fallback={<Loading />}>
          <Content data={data} />
        </Suspense>
      </main>
    )
  } catch (error: any) {
    if (error.name === "NotFoundError") {
      notFound()
    }
    throw error
  }
}

// loading.tsx
import { LoadingOverlay } from "@/src/app/components/LoadingStates"

export default function Loading() {
  return <LoadingOverlay message="Loading..." />
}

// error.tsx
;("use client")
import { Alert } from "@/src/app/components/Alert"

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="p-6">
      <Alert variant="error" title="Something went wrong">
        <p>{error.message}</p>
        <button className="btn btn-primary mt-4" onClick={reset}>
          Try again
        </button>
      </Alert>
    </main>
  )
}
```

### Progressive Loading Pattern

```tsx
// page.tsx (Server Component)
import { Suspense } from "react"

async function CoreData({ id }: { id: number }) {
  const coreData = await getCoreDataRsc(id)
  return <CoreContent data={coreData} />
}

async function SecondaryData({ id }: { id: number }) {
  const secondaryData = await getSecondaryDataRsc(id)
  return <SecondaryContent data={secondaryData} />
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    <main>
      {/* Show core data first */}
      <Suspense fallback={<CoreSkeleton />}>
        <CoreData id={Number(id)} />
      </Suspense>

      {/* Show secondary data as it loads */}
      <Suspense fallback={<SecondarySkeleton />}>
        <SecondaryData id={Number(id)} />
      </Suspense>
    </main>
  )
}
```

---

## Next Steps

### Immediate Priority (Do First)

1. ~~**Optimize App Layout** - Critical for all `/(app)/` routes~~ ✅ **COMPLETED**

   - ✅ Fetch user data server-side
   - ✅ Convert MainNavbar to receive user as prop
   - ✅ Add Suspense boundary with NavbarSkeleton
   - **Impact**: Improves UX across all authenticated routes
   - **Status**: User data now persists across navigation, eliminating redundant fetching

2. **Optimize Study Setup Layout** - Critical for all setup routes
   - Fetch study data server-side
   - Update step pages to receive study as prop
   - Add Suspense boundary
   - **Impact**: Improves UX across all setup steps

### Then Route-by-Route

3. ~~**Start with Route 6** (`/studies/[studyId]`) - Fix critical issues~~ ✅ **COMPLETED**
4. ~~**Move to Routes 3 & 4** - Fix Suspense misuse (can leverage App Layout user data)~~ ✅ **COMPLETED**
5. **Convert Routes 2 & 12** - Server component conversion (can leverage App Layout user data)
6. **Add loading.tsx** to all routes systematically
7. **Add error.tsx** to all routes systematically
8. **Implement progressive loading** for complex routes
9. **Enhance not-found pages** (Phase 8.3)

### Implementation Principles

Each route should be completed end-to-end before moving to the next, ensuring:

- ✅ Data flow is clean (leverage layouts for shared data)
- ✅ Loading states work correctly (use Suspense boundaries)
- ✅ Error states handle all cases (error.tsx + not-found.tsx)
- ✅ UX is optimal (progressive loading, state preservation)
- ✅ State preservation (layouts preserve data across navigation)
- ✅ No redundant fetching (fetch in layout, pass as props)
