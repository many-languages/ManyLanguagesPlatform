import type { EnrichedJatosStudyResult } from "@/src/types/jatos"

// Re-export variable types from shared variables module
export type { ExtractedVariable } from "../../variables/types"

// Template Types
export interface FeedbackTemplate {
  id: number
  studyId: number
  content: string
  setupRevision?: number
  extractionSnapshotId?: number
  extractorVersion?: string
  requiredVariableKeys?: string[] | null
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
  requiredVariableKeyList?: string[]
}

export interface FeedbackFormEditorRef {
  saveTemplate: () => Promise<void>
  isTemplateSaved: () => boolean
}

export interface FeedbackVariable {
  variableName: string
  type: string
  variableKey?: string
}

export interface FeedbackFormEditorProps {
  initialTemplate?: {
    id: number
    content: string
    createdAt: Date
    updatedAt: Date
  } | null
  studyId: number
  onTemplateSaved?: () => void
  allPilotResults?: EnrichedJatosStudyResult[]
  variables: FeedbackVariable[]
  extractionBundle:
    | import("../setup/utils/serializeExtractionBundle").SerializedExtractionBundle
    | null
}
