/**
 * Study-centric types surfaced through `@/src/features/studies` (Phase 9).
 */

import type { Prisma } from "db"
import {
  participantStudyOverviewArgs,
  participantWithEmailArgs,
  studyWithRelationsArgs,
  studyWithLatestUploadSelect,
} from "./studySelects"
import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import type { StudySummaryResult } from "./domain/inspector/calculateStudySummary"

type WithLatestJatosStudyUpload<T extends { jatosStudyUploads: readonly unknown[] }> = T & {
  latestJatosStudyUpload: T["jatosStudyUploads"][number] | null
}

type StudyWithRelationsRecord = Prisma.StudyGetPayload<typeof studyWithRelationsArgs>
type ParticipantStudyOverviewRecord = Prisma.StudyGetPayload<typeof participantStudyOverviewArgs>
type StudyWithLatestUploadRecord = Prisma.StudyGetPayload<{
  select: typeof studyWithLatestUploadSelect
}>
type ParticipantWithEmailRecord = Prisma.ParticipantStudyGetPayload<typeof participantWithEmailArgs>

export type StudyWithRelations = WithLatestJatosStudyUpload<StudyWithRelationsRecord>
export type ParticipantStudyOverview = WithLatestJatosStudyUpload<ParticipantStudyOverviewRecord>
export type StudyWithLatestUpload = WithLatestJatosStudyUpload<StudyWithLatestUploadRecord>
export type ParticipantWithEmail = ParticipantWithEmailRecord
export type { StudySummaryCounts } from "./server/studySummaryCounts"
export type { StudyView } from "./domain/studyView"
export type { ParticipantStudyView } from "./domain/participantStudyView"
export type { StudyWithMinimalRelations, SetupStepFlags } from "./domain/setup/setupStatus"

/** Props for researcher `StudySummary` (RSC). */
export interface StudySummaryProps {
  summary: StudySummaryResult | null
}

export interface ResearcherParticipantStatusRow {
  id: number
  label: string
  finished: boolean
  lastSeen: string
  active: boolean
  progress: number
  duration: string
  payed: boolean
}

/** Props for `ParticipantManagementCard` (RSC + client). */
export interface ParticipantManagementCardProps {
  participantRows: ResearcherParticipantStatusRow[]
  /** When false, participant toggles and selection are disabled (e.g. archived study). */
  canEditStudySetup?: boolean
}

export interface ResearcherResultComponentOption {
  uuid: string
  title: string
}

/** Raw participant JATOS payloads for the researcher results card (no ZIP download). */
export type ResearcherRawResultInspectorPayload = {
  enrichedResults: EnrichedJatosStudyResult[]
}

/** Props for `ResultsCard` / `ResultsCardWrapper` (RSC loaders + client card). */
export interface ResultsCardProps {
  jatosStudyId: number
  resultComponents: ResearcherResultComponentOption[]
  rawResultInspectorPayload: ResearcherRawResultInspectorPayload
  studyId: number
  /** True when the latest upload has an approved extraction (step 4). */
  hasApprovedExtraction: boolean
  /** True when JATOS metadata reports at least one result without exposing raw result data. */
  hasResults: boolean
}

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
