"use client"

import type { ExtractedVariable } from "../../../variables/types"

interface VariableStatsProps {
  extractedVariables: ExtractedVariable[]
}

export default function VariableStats({ extractedVariables }: VariableStatsProps) {
  return (
    <div className="stats shadow mb-4">
      <div className="stat">
        <div className="stat-title">Variables Extracted</div>
        <div className="stat-value text-primary">{extractedVariables.length}</div>
      </div>
      <div className="stat">
        <div className="stat-title">Total Occurrences</div>
        <div className="stat-value text-secondary">
          {extractedVariables.reduce((sum, v) => sum + v.occurrences, 0)}
        </div>
      </div>
    </div>
  )
}
