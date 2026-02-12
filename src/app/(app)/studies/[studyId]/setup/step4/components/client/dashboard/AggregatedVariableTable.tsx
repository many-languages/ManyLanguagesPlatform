import { useMemo, useCallback } from "react"
import { ExtractedVariable } from "../../../../../variables/types"
import {
  CodeBracketIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline"
import Table from "@/src/app/components/Table"
import { ColumnDef, Row } from "@tanstack/react-table"

interface AggregatedVariableTableProps {
  variables: ExtractedVariable[]
  totalRuns: number
}

export default function AggregatedVariableTable({
  variables,
  totalRuns,
}: AggregatedVariableTableProps) {
  // Helper to determine presence color
  const getPresenceColor = useCallback(
    (runIds: number[] = []) => {
      const count = runIds.length
      if (totalRuns === 0) return "progress-error"
      const ratio = count / totalRuns
      if (ratio === 1) return "progress-success"
      if (ratio > 0.8) return "progress-warning"
      return "progress-error"
    },
    [totalRuns]
  )

  const columns = useMemo<ColumnDef<ExtractedVariable>[]>(
    () => [
      {
        id: "expander",
        header: () => null,
        cell: ({ row }) => (
          <div className="flex justify-center">
            {row.getIsExpanded() ? (
              <ChevronUpIcon className="w-4 h-4" />
            ) : (
              <ChevronDownIcon className="w-4 h-4" />
            )}
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "variableName",
        header: () => (
          <div
            className="tooltip tooltip-bottom whitespace-nowrap"
            data-tip="The variable extracted from all pilot runs."
          >
            Variable
          </div>
        ),
        cell: ({ row }) => (
          <div className="font-mono text-sm">
            {row.original.variableName}
            {row.original.isTopLevel && (
              <span className="ml-2 badge badge-xs badge-ghost">Top Level</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "type",
        header: () => (
          <div
            className="tooltip tooltip-bottom whitespace-nowrap"
            data-tip="The inferred data type for this variable (e.g., number, string, boolean)."
          >
            Type
          </div>
        ),
        cell: ({ row }) => (
          <div>
            <span className="badge badge-outline font-mono">{row.original.type}</span>
            {row.original.flags.includes("TYPE_DRIFT") && (
              <span
                className="ml-2 text-warning tooltip tooltip-right"
                data-tip="Type varies between runs"
              >
                <ExclamationTriangleIcon className="w-4 h-4 inline" />
              </span>
            )}
          </div>
        ),
      },
      {
        id: "presence",
        header: () => (
          <div
            className="tooltip tooltip-bottom whitespace-nowrap"
            data-tip="The number of pilot runs where this variable was found. 100% presence means every pilot data contains this field."
          >
            Presence
          </div>
        ),
        accessorFn: (row) => (row.runIds || row.componentIds).length,
        cell: ({ row }) => {
          const runIds = row.original.runIds || row.original.componentIds
          return (
            <div className="flex items-center gap-2">
              <progress
                className={`progress w-16 ${getPresenceColor(runIds)}`}
                value={runIds.length}
                max={totalRuns}
              ></progress>
              <span className="text-xs text-base-content/70 whitespace-nowrap">
                {runIds.length}/{totalRuns}
              </span>
            </div>
          )
        },
      },
      {
        accessorKey: "occurrences",
        header: () => (
          <div
            className="tooltip tooltip-bottom whitespace-nowrap"
            data-tip="The total number of observations (data points) found for this variable across all runs and components."
          >
            Occurrences
          </div>
        ),
        cell: ({ row }) => (
          <span className="text-sm font-semibold">{row.original.occurrences.toLocaleString()}</span>
        ),
      },
      {
        id: "diagnostics",
        header: () => (
          <div
            className="tooltip tooltip-bottom whitespace-nowrap"
            data-tip="These checks are aggregated across all pilot runs for this variable based on the collected observations."
          >
            Diagnostics
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex gap-1 flex-wrap">
            {row.original.flags.map((flag) => (
              <div key={flag} className="tooltip" data-tip={flag}>
                <span className="badge badge-warning badge-xs">{flag}</span>
              </div>
            ))}
            {(!row.original.flags || row.original.flags.length === 0) && (
              <span className="text-success text-xs">OK</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "depth",
        header: () => (
          <div
            className="tooltip tooltip-bottom whitespace-nowrap"
            data-tip="The nesting level of the variable within the JSON structure (1 = top level)."
          >
            Depth
          </div>
        ),
        cell: ({ row }) => (
          <span className="text-xs text-base-content/60">{row.original.depth}</span>
        ),
      },
    ],
    [totalRuns, getPresenceColor]
  )

  const renderSubComponent = ({ row }: { row: Row<ExtractedVariable> }) => {
    const variable = row.original
    return (
      <div className="p-4 bg-base-200/30 rounded-md m-2">
        <h4 className="font-semibold text-xs uppercase mb-2">Examples</h4>
        <div className="space-y-1">
          {variable.examples.slice(0, 3).map((ex, i) => (
            <div key={i} className="text-xs font-mono flex gap-2">
              <span className="text-base-content/50">{ex.sourcePath}:</span>
              <span className="truncate max-w-md bg-base-100 px-1 rounded">{ex.value}</span>
            </div>
          ))}
        </div>

        {variable.diagnostics && variable.diagnostics.length > 0 && (
          <div className="mt-3">
            <h4 className="font-semibold text-xs uppercase mb-1 text-warning">Issues</h4>
            <ul className="list-disc list-inside text-xs text-error">
              {variable.diagnostics.map((d, i) => (
                <li key={i}>{d.message}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-base-100 rounded-lg shadow overflow-x-auto">
      <Table
        data={variables}
        columns={columns}
        enableSorting={true}
        enableFilters={false}
        renderSubComponent={renderSubComponent}
        onRowClick={(row) => row.toggleExpanded()}
        classNames={{
          table: "table w-full",
          thead: "bg-base-200/50 text-xs font-bold uppercase text-base-content/70",
          tbody: "text-sm",
          th: "px-4 py-3",
          td: "px-4 py-2",
          tr: "hover:bg-base-200 transition-colors",
        }}
      />
    </div>
  )
}
