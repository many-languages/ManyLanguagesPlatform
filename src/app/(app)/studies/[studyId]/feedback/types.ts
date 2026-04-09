import type { ReactNode } from "react"
import type { FeedbackTemplateRscRow } from "./feedbackTemplateRscSelect"

// Re-export variable types from shared variables module
export type { ExtractedVariable } from "../variables/types"

/** JATOS + enrichment outcome for participant feedback (see `getParticipantFeedback`). */
export type { GetParticipantFeedbackResult } from "@/src/lib/jatos/participantFeedbackTypes"

/**
 * Server-rendered markdown load for participant feedback (RSC + server action).
 * Aligns with `GetParticipantFeedbackResult` but replaces `loaded` payload with rendered markdown.
 */
export type ParticipantFeedbackMarkdownLoadResult =
  | { kind: "not_completed" }
  | {
      kind: "loaded"
      renderedMarkdown: string
      matchingResponseCount: number
      selectedResponseEndDate: number | null
    }
  | { kind: "failed"; error: string }
  /** Template references codebook variables marked personal; researcher must fix Step 6. */
  | { kind: "maintained" }

/** Full participant feedback load: template access + JATOS + render (see `loadParticipantFeedbackViewModel`). */
export type LoadParticipantFeedbackPipelineResult =
  | { kind: "not_authenticated" }
  | { kind: "not_enrolled" }
  | { kind: "no_template" }
  | { kind: "done"; loaded: ParticipantFeedbackMarkdownLoadResult }

/** Return type of `fetchParticipantFeedbackAction` (same discriminated shape as the RSC pipeline). */
export type FetchParticipantFeedbackActionResult = LoadParticipantFeedbackPipelineResult

/**
 * Server-rendered researcher preview (pilots + template). No `not_completed` — empty pilots are
 * still `loaded` with `renderedMarkdown: null`.
 */
export type ResearcherFeedbackMarkdownLoadResult =
  | { kind: "loaded"; renderedMarkdown: string | null; researcherHasPilotData: boolean }
  | { kind: "failed"; error: string }
  | { kind: "personal_data_blocked"; variableNames: string[] }

/** Full researcher feedback load: template + pilots + render (see `loadResearcherFeedbackViewModel`). */
export type LoadResearcherFeedbackPipelineResult =
  | { kind: "not_authenticated" }
  | { kind: "not_authorized" }
  | { kind: "no_template" }
  | { kind: "done"; loaded: ResearcherFeedbackMarkdownLoadResult }

// Template Types
export interface FeedbackTemplate {
  id: number
  studyId: number
  content: string
  requiredVariableNames?: string[] | null
  createdAt: Date | string
  updatedAt: Date | string
}

export interface FeedbackTemplateInput {
  studyId: number
  content: string
}

/**
 * Template row passed into the client editor and Step 6 (same shape as `FeedbackTemplateRscRow` /
 * `getFeedbackTemplateRsc` payloads; no `studyId` on this select).
 */
export type FeedbackTemplateEditorInitial = FeedbackTemplateRscRow

/** Card surface when showing `feedbackMessage` instead of markdown (whole-card tint). */
export type FeedbackCardTone = "default" | "info" | "warning" | "error"

// Component Props Types (static feedback uses server-rendered markdown via FeedbackCard)
export interface FeedbackCardProps {
  studyId: number
  /** Server-rendered markdown; null when no feedback to show yet or missing template. */
  renderedMarkdown: string | null
  /**
   * When set, shown in place of markdown / empty states (plain body; no nested alert).
   * Use `feedbackTone` for card surface color; defaults to `info` when omitted.
   */
  feedbackMessage?: ReactNode
  feedbackTone?: FeedbackCardTone
  title?: string
  className?: string
  /** Participant: false until the study run exists in JATOS. */
  participantCompleted?: boolean
  /** Researcher preview: false when no pilot results exist. */
  researcherHasPilotData?: boolean
  onRefresh?: () => Promise<void> | void
  showEditButton?: boolean
  /** When `showEditButton` is true, disable Edit (e.g. archived study) but keep the control visible. Defaults to true. */
  canEditStudySetup?: boolean
  /** Participant feedback only: shows a notice if latest of multiple responses was used. */
  participantMatchingResponseCount?: number
  participantSelectedResponseEndDate?: number | null
}

export type SaveTemplateResult = { ok: false } | { ok: true; setupComplete: boolean }

export interface FeedbackFormEditorRef {
  saveTemplate: (options?: { silentSuccessToast?: boolean }) => Promise<SaveTemplateResult>
  isTemplateSaved: () => boolean
}

export interface FeedbackVariable {
  variableName: string
  type: string
  variableKey?: string
}

export interface FeedbackFormEditorProps {
  /** Server-stored preview snapshot key (in-memory; Redis later). Required when preview runs. */
  feedbackPreviewContextKey: string
  /** Primary study result id for `var:` / `stat:…:within` when multiple pilots exist. */
  withinStudyResultId?: number
  /** Pilot count for copy in the "across" warning (no extraction bundle is sent to the client). */
  pilotResultCount?: number
  initialTemplate?: FeedbackTemplateEditorInitial | null
  studyId: number
  onTemplateSaved?: () => void
  onValidationChange?: (isValid: boolean) => void
  variables: FeedbackVariable[]
  hiddenVariables?: string[]
}
