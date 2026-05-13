/**
 * Study-centric types surfaced through `@/src/features/studies` (Phase 9).
 */

import type { Prisma } from "db"
import {
  adminStudyWithLatestUploadArgs,
  participantWithEmailArgs,
  studyWithRelationsArgs,
  studyWithLatestUploadSelect,
} from "./studySelects"

type WithLatestJatosStudyUpload<T extends { jatosStudyUploads: readonly unknown[] }> = T & {
  latestJatosStudyUpload: T["jatosStudyUploads"][number] | null
}

type StudyWithRelationsRecord = Prisma.StudyGetPayload<typeof studyWithRelationsArgs>
type StudyWithLatestUploadRecord = Prisma.StudyGetPayload<{
  select: typeof studyWithLatestUploadSelect
}>
type AdminStudyWithLatestUploadRecord = Prisma.StudyGetPayload<
  typeof adminStudyWithLatestUploadArgs
>
type ParticipantWithEmailRecord = Prisma.ParticipantStudyGetPayload<typeof participantWithEmailArgs>

export type StudyWithRelations = WithLatestJatosStudyUpload<StudyWithRelationsRecord>
export type StudyWithLatestUpload = WithLatestJatosStudyUpload<StudyWithLatestUploadRecord>
export type AdminStudyWithLatestUpload =
  WithLatestJatosStudyUpload<AdminStudyWithLatestUploadRecord> & {
    hasParticipantResponses: boolean | null
  }
export type ParticipantWithEmail = ParticipantWithEmailRecord
export type { StudySummaryCounts } from "./server/studySummaryCounts"
export type { StudyView } from "./domain/studyView"
export type { ParticipantStudyView } from "./domain/participantStudyView"
export type { StudyWithMinimalRelations, SetupStepFlags } from "./domain/setup/setupStatus"
export interface PendingAdminApprovalStudyRow {
  id: number
  title: string
  feedbackTemplateCreatedAt: Date
}
