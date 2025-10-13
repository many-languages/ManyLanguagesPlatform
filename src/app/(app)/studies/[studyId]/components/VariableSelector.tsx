"use client"

import { EnrichedJatosStudyResult } from "@/src/types/jatos"

interface VariableSelectorProps {
  enrichedResult: EnrichedJatosStudyResult
  onInsert: (variableName: string) => void
}

/**
 * Dropdown that lists all variable names detected in the enriched JATOS result,
 * with example values. Selecting one inserts it as a placeholder.
 */
export default function VariableSelector({ enrichedResult, onInsert }: VariableSelectorProps) {
  const variables = enrichedResult.componentResults.flatMap((component) => {
    const data = component.parsedData ?? component.dataContent ?? {}
    return Object.entries(data).map(([key, value]) => ({
      variableName: key,
      exampleValue: typeof value === "object" ? JSON.stringify(value) : String(value),
    }))
  })

  return (
    <div className="dropdown dropdown-hover">
      <label tabIndex={0} className="btn btn-sm btn-outline m-1">
        Insert Variable ⌄
      </label>
      <ul
        tabIndex={0}
        className="dropdown-content menu bg-base-200 rounded-box shadow p-2 w-64 max-h-96 overflow-y-auto"
      >
        {variables.length === 0 && (
          <li className="text-sm opacity-70 px-2 py-1">No variables available</li>
        )}

        {variables.map((v, i) => (
          <li
            key={`${v.variableName}-${i}`}
            onClick={() => onInsert(v.variableName)}
            className="hover:bg-base-300 rounded-md cursor-pointer px-2 py-1 flex justify-between"
          >
            <span className="font-semibold">{v.variableName}</span>
            <span className="opacity-50 text-xs truncate max-w-[100px]">{v.exampleValue}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
