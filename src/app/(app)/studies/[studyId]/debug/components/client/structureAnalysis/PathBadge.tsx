"use client"

import { getTypeBadgeClass, getPathTypeBadgeClass } from "../../../utils/badgeHelpers"
import { scrollToComponentData } from "../../../utils/pathHighlighting"

interface PathBadgeProps {
  path: string
  type: "primitive" | "array" | "object" | "string" | "number" | "boolean" | "null" | string
  componentId: number
  highlightedPath?: { path: string; componentId: number } | null
  size?: "sm" | "lg"
  onClick?: (path: string, componentId: number) => void
  tooltipType?: string
  unshownObservationsCount?: number // Number of observations not shown (for variables)
}

export default function PathBadge({
  path,
  type,
  componentId,
  highlightedPath,
  size = "sm",
  onClick,
  tooltipType,
  unshownObservationsCount,
}: PathBadgeProps) {
  // Determine badge class based on type
  const badgeClass =
    type === "primitive" || type === "array" || type === "object"
      ? getTypeBadgeClass(type)
      : getPathTypeBadgeClass(
          type as "string" | "number" | "boolean" | "null" | "array" | "object" | "primitive"
        )

  // Check if this path is highlighted
  const isHighlighted =
    highlightedPath?.path === path && highlightedPath?.componentId === componentId

  // Normalize tooltip type
  const displayTooltipType =
    tooltipType ||
    (type === "string" || type === "number" || type === "boolean" || type === "null"
      ? "primitive"
      : type)

  // Build tooltip message
  let tooltipMessage = `Type: ${displayTooltipType} - Click to highlight in raw data`
  if (unshownObservationsCount !== undefined && unshownObservationsCount > 0) {
    tooltipMessage += `\n${unshownObservationsCount} more observation(s) not highlighted`
  }

  const handleClick = () => {
    if (onClick) {
      onClick(path, componentId)
    } else {
      // Default behavior: scroll to component data
      scrollToComponentData(componentId)
    }
  }

  return (
    <button
      className={`badge ${badgeClass} badge-${size} font-mono cursor-pointer hover:opacity-80 transition-opacity ${
        isHighlighted ? "ring-2 ring-info ring-offset-2" : ""
      }`}
      title={tooltipMessage}
      onClick={handleClick}
    >
      {path}
    </button>
  )
}
