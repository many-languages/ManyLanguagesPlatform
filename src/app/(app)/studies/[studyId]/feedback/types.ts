import type { EnrichedJatosStudyResult } from "@/src/types/jatos"

// Re-export variable types from shared variables module
export type { ExtractedVariable, AvailableVariable, AvailableField } from "../../variables/types"

// Template Types
export interface FeedbackTemplate {
  id: number
  studyId: number
  content: string
  createdAt: Date
  updatedAt: Date
}

export interface FeedbackTemplateInput {
  studyId: number
  content: string
}

// Rendering Types
export interface FeedbackRenderContext {
  enrichedResult: EnrichedJatosStudyResult
  allEnrichedResults?: EnrichedJatosStudyResult[]
}

// Component Props Types
export interface FeedbackCardProps {
  studyId: number
  enrichedResult: EnrichedJatosStudyResult | null | undefined
  template: { content: string } | null | undefined
  title?: string
  className?: string
  allEnrichedResults?: EnrichedJatosStudyResult[]
}

export interface FeedbackFormEditorRef {
  saveTemplate: () => Promise<void>
  isTemplateSaved: () => boolean
}

export interface FeedbackFormEditorProps {
  enrichedResult: EnrichedJatosStudyResult
  initialTemplate?: {
    id: number
    content: string
    createdAt: Date
    updatedAt: Date
  } | null
  studyId: number
  onTemplateSaved?: () => void
  allTestResults?: EnrichedJatosStudyResult[]
}
