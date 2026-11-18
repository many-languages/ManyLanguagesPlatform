import { ShieldExclamationIcon } from "@heroicons/react/24/solid"

import { getTypeBadgeClass } from "@/src/features/studies/domain/inspector/badgeHelpers"
import type { VariableType } from "@/src/features/studies/domain/variables/types"

const VARIABLE_TYPES = new Set<string>(["string", "number", "boolean", "array", "object"])

function isVariableType(type: string | null): type is VariableType {
  return type !== null && VARIABLE_TYPES.has(type)
}

interface CodebookVariableChipProps {
  variableName: string
  type: string | null
  personalData?: boolean
}

export default function CodebookVariableChip({
  variableName,
  type,
  personalData = false,
}: CodebookVariableChipProps) {
  const badgeClass = isVariableType(type) ? getTypeBadgeClass(type) : "badge-ghost"
  const typeLabel = type ?? "unknown"
  const title = `Type: ${typeLabel}${personalData ? " · Personal data" : ""}`

  return (
    <span className={`badge badge-sm gap-1 font-mono ${badgeClass}`} title={title}>
      {personalData && (
        <ShieldExclamationIcon className="h-3 w-3 shrink-0" aria-label="Personal data" role="img" />
      )}
      {variableName}
    </span>
  )
}
