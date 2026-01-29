import { useState } from "react"
import { ExtractedVariable } from "../../../../../variables/types"
import {
  CodeBracketIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline"

interface AggregatedVariableTableProps {
  variables: ExtractedVariable[]
  totalRuns: number
}

export default function AggregatedVariableTable({
  variables,
  totalRuns,
}: AggregatedVariableTableProps) {
  const [expandedVar, setExpandedVar] = useState<string | null>(null)

  const toggleExpand = (variableKey: string) => {
    setExpandedVar(expandedVar === variableKey ? null : variableKey)
  }

  // Helper to determine presence color
  const getPresenceColor = (runIds: number[] = []) => {
    const count = runIds.length
    if (totalRuns === 0) return "progress-error"
    const ratio = count / totalRuns
    if (ratio === 1) return "progress-success"
    if (ratio > 0.8) return "progress-warning"
    return "progress-error"
  }

  return (
    <div className="overflow-x-auto bg-base-100 rounded-lg shadow">
      <table className="table w-full">
        <thead>
          <tr>
            <th className="w-8"></th>
            <th>Variable</th>
            <th>Type</th>
            <th
              className="tooltip tooltip-bottom"
              data-tip="The number of pilot runs where this variable was found. 100% presence means every participant's data contains this field."
            >
              Presence
            </th>
            <th>Diagnostics</th>
            <th>Depth</th>
          </tr>
        </thead>
        <tbody>
          {variables.map((variable) => (
            <>
              <tr
                key={variable.variableKey}
                className={`hover:bg-base-200 cursor-pointer ${
                  expandedVar === variable.variableKey ? "bg-base-200" : ""
                }`}
                onClick={() => toggleExpand(variable.variableKey)}
              >
                <td>
                  {expandedVar === variable.variableKey ? (
                    <ChevronUpIcon className="w-4 h-4" />
                  ) : (
                    <ChevronDownIcon className="w-4 h-4" />
                  )}
                </td>
                <td className="font-mono text-sm">
                  {variable.variableName}
                  {variable.isTopLevel && (
                    <span className="ml-2 badge badge-xs badge-ghost">Top Level</span>
                  )}
                </td>
                <td>
                  <span className="badge badge-outline family-mono">{variable.type}</span>
                  {variable.flags.includes("TYPE_DRIFT") && (
                    <span
                      className="ml-2 text-warning tooltip tooltip-right"
                      data-tip="Type varies between runs"
                    >
                      <ExclamationTriangleIcon className="w-4 h-4 inline" />
                    </span>
                  )}
                </td>
                <td className="w-32">
                  <div className="flex items-center gap-2">
                    <progress
                      className={`progress w-16 ${getPresenceColor(
                        variable.runIds || variable.componentIds
                      )}`}
                      value={(variable.runIds || variable.componentIds).length}
                      max={totalRuns}
                    ></progress>
                    <span className="text-xs text-base-content/70">
                      {(variable.runIds || variable.componentIds).length}/{totalRuns}
                    </span>
                  </div>
                </td>
                <td>
                  <div className="flex gap-1">
                    {variable.flags.map((flag) => (
                      <div key={flag} className="tooltip" data-tip={flag}>
                        <span className="badge badge-warning badge-xs">{flag}</span>
                      </div>
                    ))}
                    {(!variable.flags || variable.flags.length === 0) && (
                      <span className="text-success text-xs">OK</span>
                    )}
                  </div>
                </td>
                <td className="text-xs text-base-content/60">{variable.depth}</td>
              </tr>
              {expandedVar === variable.variableKey && (
                <tr className="bg-base-100/50">
                  <td colSpan={6} className="p-0">
                    <div className="p-4 bg-base-200/30">
                      <h4 className="font-semibold text-xs uppercase mb-2">Examples</h4>
                      <div className="space-y-1">
                        {variable.examples.slice(0, 3).map((ex, i) => (
                          <div key={i} className="text-xs font-mono flex gap-2">
                            <span className="text-base-content/50">{ex.sourcePath}:</span>
                            <span className="truncate max-w-md bg-base-100 px-1 rounded">
                              {ex.value}
                            </span>
                          </div>
                        ))}
                      </div>

                      {variable.diagnostics && variable.diagnostics.length > 0 && (
                        <div className="mt-3">
                          <h4 className="font-semibold text-xs uppercase mb-1 text-warning">
                            Issues
                          </h4>
                          <ul className="list-disc list-inside text-xs text-error">
                            {variable.diagnostics.map((d, i) => (
                              <li key={i}>{d.message}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}
