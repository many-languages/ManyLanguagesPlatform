import type { StudyWithRelations } from "@/src/features/studies/types"

export type { UpdateVariableCodebookResult } from "./server/updateVariableCodebook"

export interface VariableCodebookEntry {
  id: number
  variableKey: string
  variableName: string
  dslKey: string
  type: string | null
  examples: CodebookVariableExample[]
  description: string | null
  personalData: boolean
}

export type CodebookVariableExample = { value: string; sourcePath: string }

export interface CodebookGroupEntry {
  groupKey: string
  description: string
  personalData: boolean
}

export interface CodebookInitialVariable {
  id: number
  variableKey: string
  variableName: string
  dslKey: string
  type: string | null
  examples: CodebookVariableExample[] | null
  description: string | null
  personalData: boolean
}

export interface CodebookInitialGroup {
  groupKey: string
  description: string | null
  personalData: boolean
}

export interface CodebookContentSnapshot {
  status?: "VALID" | "INVALID" | "NO_CODEBOOK" | "NO_EXTRACTION" | null
  missingKeys?: string[] | null
  extraKeys?: string[] | null
  updatedAt?: Date | string
}

export interface CodebookStepState {
  disableNext: boolean
  nextTooltip?: string
}

export interface CodebookContentRef {
  saveCodebook: () => Promise<boolean>
}

export interface CodebookContentProps {
  initialVariables: CodebookInitialVariable[]
  initialGroups: CodebookInitialGroup[]
  codebook: CodebookContentSnapshot | null
  approvedExtractionId: number | null
  approvedExtractionApprovedAt: Date | string | null
  study: StudyWithRelations
  onStepStateChange?: (state: CodebookStepState) => void
}
