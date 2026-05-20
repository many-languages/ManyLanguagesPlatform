import { getTypeBadgeClass } from "@/src/features/studies/domain/inspector/badgeHelpers"
import type { VariableType } from "@/src/features/studies/domain/variables/types"

const VARIABLE_TYPES = new Set<string>(["string", "number", "boolean", "array", "object"])

function isVariableType(type: string | null): type is VariableType {
  return type !== null && VARIABLE_TYPES.has(type)
}

interface CodebookVariableChipProps {
  variableName: string
  type: string | null
}

export default function CodebookVariableChip({ variableName, type }: CodebookVariableChipProps) {
  const badgeClass = isVariableType(type) ? getTypeBadgeClass(type) : "badge-ghost"
  const typeLabel = type ?? "unknown"

  return (
    <span
      className={`badge badge-sm font-mono ${badgeClass}`}
      title={type ? `Type: ${typeLabel}` : undefined}
    >
      {variableName}
    </span>
  )
}
