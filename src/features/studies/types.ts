/**
 * Study-centric types surfaced through `@/src/features/studies` (Phase 9).
 */

import type { Prisma } from "db"
import {
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
type ParticipantWithEmailRecord = Prisma.ParticipantStudyGetPayload<typeof participantWithEmailArgs>

export type StudyWithRelations = WithLatestJatosStudyUpload<StudyWithRelationsRecord>
export type StudyWithLatestUpload = WithLatestJatosStudyUpload<StudyWithLatestUploadRecord>
export type ParticipantWithEmail = ParticipantWithEmailRecord
export type { StudySummaryCounts } from "./server/studySummaryCounts"
export type { StudyView } from "./domain/studyView"
export type { ParticipantStudyView } from "./domain/participantStudyView"
export type { StudyWithMinimalRelations, SetupStepFlags } from "./domain/setup/setupStatus"

export interface AdminStudyLatestUploadDto {
  id: number
  step1Completed: boolean
  step2Completed: boolean
  step3Completed: boolean
  step4Completed: boolean
  step5Completed: boolean
  step6Completed: boolean
  jatosWorkerType: string
  jatosFileName: string | null
}

export interface AdminStudyCodebookEntryDto {
  variableKey: string
  variableName: string
  description: string | null
  personalData: boolean
}

export interface AdminStudyListItemDto {
  id: number
  createdAt: Date
  title: string | null
  description: string | null
  status: string
  jatosStudyUUID: string | null
  adminApproved: boolean | null
  archived: boolean
  hasParticipantResponses: boolean | null
  latestJatosStudyUpload: AdminStudyLatestUploadDto | null
  feedbackTemplate: {
    id: number
    content: string
  } | null
  codebook: {
    entries: AdminStudyCodebookEntryDto[]
  } | null
}

export interface PendingAdminApprovalStudyRow {
  id: number
  title: string
  feedbackTemplateCreatedAt: Date
}
