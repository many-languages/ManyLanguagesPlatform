# RSC Helpers Inventory

This document tracks which queries have RSC (React Server Component) helpers for server-side data fetching.

## Pattern

All queries should follow this structure:

1. **Core function** - Pure database/API logic (no auth)
2. **RSC helper** - `cache()` + `getBlitzContext()` for server components
3. **Blitz RPC** - For client-side reactive updates with `useQuery`

## Queries with RSC Helpers ✅

| Query                     | RSC Helper                     | Status | Notes                  |
| ------------------------- | ------------------------------ | ------ | ---------------------- |
| `getStudy`                | `getStudyRsc`                  | ✅     | Used in multiple pages |
| `getStudies`              | `getStudies` (exported as RSC) | ✅     | Used in list pages     |
| `getStudyDataByComment`   | `getStudyDataByCommentRsc`     | ✅     | Used in setup step 4   |
| `getResearcherRunUrl`     | `getResearcherRunUrlRsc`       | ✅     | Used in setup step 3   |
| `getFeedbackTemplate`     | `getFeedbackTemplateRsc`       | ✅     | Used in setup step 4   |
| `getStudyParticipants`    | `getStudyParticipantsRsc`      | ✅     | Added in Phase 2.2     |
| `getStudyParticipant`     | `getStudyParticipantRsc`       | ✅     | Added in Phase 2.2     |
| `getStudyResearcher`      | `getStudyResearcherRsc`        | ✅     | Added in Phase 2.2     |
| `isParticipantInStudy`    | `isParticipantInStudyRsc`      | ✅     | Added in Phase 2.2     |
| `getParticipantPseudonym` | `getParticipantPseudonymRsc`   | ✅     | Added in Phase 2.2     |
| `getStudyMetadata`        | `getStudyMetadataRsc`          | ✅     | Added in Phase 2.2     |
| `getCurrentUser`          | `getCurrentUserRsc`            | ✅     | Added in Phase 2.2     |

## Usage in Server Components

All the following pages use RSC helpers correctly:

- ✅ `src/app/(app)/studies/[studyId]/page.tsx` - Uses `getStudyRsc`
- ✅ `src/app/(app)/studies/[studyId]/edit/page.tsx` - Uses `getStudyRsc`
- ✅ `src/app/(app)/studies/[studyId]/setup/step2/page.tsx` - Uses `getStudyRsc`
- ✅ `src/app/(app)/studies/[studyId]/setup/step3/page.tsx` - Uses `getStudyRsc`, `getResearcherRunUrlRsc`
- ✅ `src/app/(app)/studies/[studyId]/setup/step4/page.tsx` - Uses `getStudyRsc`, `getStudyDataByCommentRsc`, `getFeedbackTemplateRsc`
- ✅ `src/app/(app)/studies/page.tsx` - Uses `getStudies`
- ✅ `src/app/(app)/explore/page.tsx` - Uses `getStudies`

## Client Components Using RPC

The following client components correctly use BlitzJS RPC (`useQuery`) for reactive data updates:

- ✅ `StudyContent.tsx` - Uses `getFeedbackTemplate`, `getStudyParticipant`, `getStudyParticipants` (conditional, reactive)
- ✅ Other interactive components that need real-time updates

## Migration Checklist

When creating new queries:

- [ ] Create core database function
- [ ] Create RSC helper using `cache()` and `getBlitzContext()`
- [ ] Create Blitz RPC resolver for client usage
- [ ] Export return types
- [ ] Add to this inventory
