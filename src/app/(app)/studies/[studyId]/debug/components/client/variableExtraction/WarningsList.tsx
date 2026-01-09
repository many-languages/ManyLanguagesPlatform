"use client"

import type { Diagnostic } from "@/src/app/(app)/studies/[studyId]/variables/types"

interface WarningsListProps {
  diagnostics: Diagnostic[]
}

export default function WarningsList({ diagnostics }: WarningsListProps) {
  // Filter to only show warnings
  const warnings = diagnostics.filter((d) => d.severity === "warning")
  if (warnings.length === 0) return null

  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold mb-2 text-warning">Warnings</h3>
      <div className="space-y-2">
        {warnings.map((diagnostic, index) => (
          <div key={index} className="alert alert-warning">
            <span>{diagnostic.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
