"use client"

import type { SelectedPath } from "../../../types"
import { getPathTypeBadgeClass } from "../../../utils/badgeHelpers"

type VariableBadgeType = "string" | "number" | "boolean" | "array" | "object"
type VariableBadgeSize = "sm" | "lg"

interface VariableBadgeProps {
  variableKey: string
  variableName: string
  type: VariableBadgeType
  componentId: number
  selectedPath?: SelectedPath | null
  size?: VariableBadgeSize
  onSelect: (variableKey: string, componentId: number) => void
}

export default function VariableBadge({
  variableKey,
  variableName,
  type,
  componentId,
  selectedPath,
  size = "sm",
  onSelect,
}: VariableBadgeProps) {
  const badgeClass = getPathTypeBadgeClass(type)

  const isSelected =
    selectedPath?.selectedPath === variableKey && selectedPath?.componentId === componentId

  const tooltip = `Type: ${type} — Click to highlight in raw data`

  return (
    <button
      type="button"
      className={`badge ${badgeClass} badge-${size} font-mono cursor-pointer hover:opacity-80 transition-opacity ${
        isSelected ? "ring-2 ring-info ring-offset-2" : ""
      }`}
      title={tooltip}
      onClick={() => onSelect(variableKey, componentId)}
    >
      {variableName}
    </button>
  )
}
