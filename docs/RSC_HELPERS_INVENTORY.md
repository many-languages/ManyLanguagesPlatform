# RSC Helpers Inventory

This document tracks the server-side loaders that routes and Server Components
may call directly. The canonical placement is **`src/features/<feature>/server/`**
or a narrow **`services/`** facade; do not import RSC helpers from Blitz
`queries/` or `mutations/` files.

## Current Pattern

Most feature reads now use this split:

1. **Server implementation** under `server/` or `services/` with authorization and IO.
2. **RSC helper** exported from that server module, usually wrapped in React `cache()`.
3. **Blitz RPC wrapper** under `queries/` only when a client component needs `useQuery`.

Small exceptions exist where the server helper name does not end in `Rsc`
(for example dashboard card loaders and `getStudies`). Those are still
server-only exports and should not be moved into RPC folders.

## Auth

| Server helper       | Location                                     | Primary use                         |
| ------------------- | -------------------------------------------- | ----------------------------------- |
| `getCurrentUserRsc` | `src/features/auth/server/getCurrentUser.ts` | App/admin layouts and profile pages |

## Admin Invitations

| Server helper                    | Location                                                               | Primary use            |
| -------------------------------- | ---------------------------------------------------------------------- | ---------------------- |
| `getAdminInvitesRsc`             | `src/features/admin-invitations/server/getAdminInvites.ts`             | Admin invitations page |
| `getStalePendingAdminInvitesRsc` | `src/features/admin-invitations/server/getStalePendingAdminInvites.ts` | Admin dashboard        |

## Codebook

| Server helper                          | Location                                                 | Primary use                               |
| -------------------------------------- | -------------------------------------------------------- | ----------------------------------------- |
| `getCodebookDataRsc`                   | `src/features/codebook/server/getCodebookData.ts`        | Setup step 5 and feedback preview context |
| `fetchCodebookMergedVariablesForStudy` | `src/features/codebook/server/getCodebookData.ts`        | Server-side codebook data assembly        |
| `updateVariableCodebookRsc`            | `src/features/codebook/server/updateVariableCodebook.ts` | Codebook mutation wrapper                 |

## Dashboard

| Server helper                           | Location                                                                 | Primary use                   |
| --------------------------------------- | ------------------------------------------------------------------------ | ----------------------------- |
| `getActiveStudiesWithResponseCounts`    | `src/features/dashboard/server/getActiveStudiesWithResponseCounts.ts`    | Researcher dashboard card     |
| `getParticipantCompletedNotPaidStudies` | `src/features/dashboard/server/getParticipantCompletedNotPaidStudies.ts` | Participant dashboard card    |
| `getParticipantIncompleteStudies`       | `src/features/dashboard/server/getParticipantIncompleteStudies.ts`       | Participant dashboard card    |
| `getParticipantStudyCounts`             | `src/features/dashboard/server/getParticipantStudyCounts.ts`             | Participant dashboard summary |
| `getResearcherStudyCounts`              | `src/features/dashboard/server/getResearcherStudyCounts.ts`              | Researcher dashboard summary  |
| `getUpcomingDeadlines`                  | `src/features/dashboard/server/getUpcomingDeadlines.ts`                  | Researcher dashboard card     |

## Feedback

| Server helper                          | Location                                                  | Primary use                                |
| -------------------------------------- | --------------------------------------------------------- | ------------------------------------------ |
| `getFeedbackTemplateRsc`               | `src/features/feedback/server/getFeedbackTemplate.ts`     | Setup step 6 and RPC wrapper               |
| `getFeedbackTemplateForParticipantRsc` | `src/features/feedback/server/getFeedbackTemplate.ts`     | Participant feedback loading               |
| `getFeedbackTemplateForResearcherRsc`  | `src/features/feedback/server/getFeedbackTemplate.ts`     | Researcher feedback preview                |
| `getFeedbackStep6DataRsc`              | `src/features/feedback/server/loadFeedbackStep6Data.ts`   | Setup step 6                               |
| `loadParticipantFeedbackViewModel`     | `src/features/feedback/server/loadParticipantFeedback.ts` | Participant feedback action                |
| `loadResearcherFeedbackViewModel`      | `src/features/feedback/server/loadResearcherFeedback.ts`  | Researcher feedback preview                |
| `createFeedbackTemplateRsc`            | `src/features/feedback/server/createFeedbackTemplate.ts`  | Feedback template mutation/action wrappers |
| `updateFeedbackTemplateRsc`            | `src/features/feedback/server/updateFeedbackTemplate.ts`  | Feedback template mutation/action wrappers |

## Notifications

| Server helper                     | Location                                                            | Primary use                              |
| --------------------------------- | ------------------------------------------------------------------- | ---------------------------------------- |
| `getNotificationsRsc`             | `src/features/notifications/server/getNotifications.ts`             | Portal/admin notifications pages         |
| `getLatestUnreadNotificationsRsc` | `src/features/notifications/server/getLatestUnreadNotifications.ts` | Notification menu client refresh via RPC |
| `getUnreadNotificationCountRsc`   | `src/features/notifications/server/getUnreadNotificationCount.ts`   | Notification menu client refresh via RPC |

## Studies

| Server helper                                   | Location                                                          | Primary use                                          |
| ----------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------- |
| `getStudyRsc`                                   | `src/features/studies/server/getStudy.ts`                         | Study detail route                                   |
| `getResearcherStudyRsc`                         | `src/features/studies/server/getStudy.ts`                         | Setup route loader                                   |
| `getStudies`                                    | `src/features/studies/server/getStudies.ts`                       | Researcher/explore study lists and RPC wrapper       |
| `getStudiesRsc`                                 | `src/features/studies/server/getAdminStudies.ts`                  | Admin studies page                                   |
| `getParticipantStudiesWithStatus`               | `src/features/studies/server/getParticipantStudiesWithStatus.ts`  | Participant study list                               |
| `getAdminStudyCounts`                           | `src/features/studies/server/getAdminStudyCounts.ts`              | Admin dashboard/studies surfaces                     |
| `getPendingAdminApprovalStudiesForDashboardRsc` | `src/features/studies/server/getPendingAdminApprovalStudies.ts`   | Admin dashboard                                      |
| `loadStudySetupPage`                            | `src/features/studies/server/loadStudySetupPage.ts`               | Setup step pages/layout                              |
| `loadResearcherStudyData`                       | `src/features/studies/server/loadResearcherStudyData.ts`          | Researcher study detail JATOS/participant view model |
| `getValidationDataRsc`                          | `src/features/studies/server/getValidationData.ts`                | Setup step 4                                         |
| `getCachedExtractionBundleRsc`                  | `src/features/studies/server/getCachedExtractionBundle.ts`        | Setup step 4 client RPC wrapper                      |
| `getStudyDataByCommentRsc`                      | `src/features/studies/server/getStudyDataByComment.ts`            | Pilot data lookup                                    |
| `getAllPilotResultsRsc`                         | `src/features/studies/server/getAllPilotResults.ts` / `services/` | Feedback preview and validation                      |
| `getPilotResultByIdRsc`                         | `src/features/studies/server/getPilotResultById.ts`               | Pilot result lookup                                  |
| `getResearcherRunUrlRsc`                        | `src/features/studies/server/getResearcherRunUrl.ts`              | Setup step 3 RPC wrapper                             |
| `getSetupCompletionRsc`                         | `src/features/studies/services/setup.ts`                          | Setup actions and feedback submission                |
| `getStudyMetadataRsc`                           | `src/features/studies/server/getStudyMetadata.ts`                 | Study metadata RPC wrapper                           |
| `getStudyVariablesRsc`                          | `src/features/studies/server/getStudyVariables.ts`                | Study variables RPC wrapper                          |
| `getStudyParticipantsRsc`                       | `src/features/studies/server/getStudyParticipants.ts`             | Researcher study data                                |
| `getStudyParticipantRsc`                        | `src/features/studies/server/getStudyParticipant.ts`              | Participant study data                               |
| `getStudyResearcherRsc`                         | `src/features/studies/server/getStudyResearcher.ts`               | Setup step 2 imports                                 |
| `getParticipantPseudonymRsc`                    | `src/features/studies/server/getParticipantPseudonym.ts`          | Participant run URL flows                            |
| `isParticipantInStudyRsc`                       | `src/features/studies/server/isParticipantInStudy.ts`             | Join-study client RPC wrapper                        |

## Route Usage Snapshot

MVP-critical routes currently load through feature server helpers:

- `src/app/(app)/dashboard/page.tsx` uses dashboard server loaders.
- `src/app/admin/dashboard/page.tsx` uses admin invitation and study dashboard helpers.
- `src/app/admin/studies/page.tsx` uses `getStudiesRsc`.
- `src/app/(app)/studies/[studyId]/page.tsx` uses `getStudyRsc`.
- `src/app/(app)/studies/[studyId]/setup/**/page.tsx` uses `loadStudySetupPage` plus step-specific helpers.
- `src/app/(app)/studies/page.tsx` and `src/app/(app)/explore/page.tsx` use `getStudies`.
- `src/app/(app)/notifications/page.tsx` and `src/app/admin/notifications/page.tsx` use `getNotificationsRsc`.
- Profile and app/admin layouts use `getCurrentUserRsc`.

## Maintenance Checklist

When adding or changing a server-side loader:

- [ ] Put reusable server logic in `server/` or a narrow `services/` facade.
- [ ] Keep Blitz `queries/` and `mutations/` as default-export transport wrappers only.
- [ ] Keep authorization in the server helper, not only in the Blitz wrapper.
- [ ] Export route-facing helpers from the feature barrel only when they are part of the feature's public server surface.
- [ ] Update this inventory when MVP-critical routes or helpers change.
