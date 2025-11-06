import type { EnrichedJatosStudyResult } from "@/src/types/jatos"

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

// Variable Types
export interface ExtractedVariable {
  variableName: string
  exampleValue: string
  type: "primitive" | "object" | "array"
  occurrences: number
  dataStructure: "array" | "object"
}

export interface AvailableVariable {
  name: string
  type: "string" | "number" | "boolean"
  example: any
}

export interface AvailableField {
  name: string
  type: "string" | "number" | "boolean"
  example?: any
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
