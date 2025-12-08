"use client"

import { useMemo } from "react"
import type { SkippedValue } from "../../../../variables/types"
import type { ColumnDef } from "@tanstack/react-table"
import Table from "@/src/app/components/Table"
import { formatJson } from "@/src/lib/utils/formatJson"

interface SkippedValuesTableProps {
  skippedValues: SkippedValue[]
}

export default function SkippedValuesTable({ skippedValues }: SkippedValuesTableProps) {
  const errorValues = skippedValues.filter((s) => s.severity === "error")

  const columns = useMemo<ColumnDef<SkippedValue>[]>(
    () => [
      {
        accessorKey: "path",
        header: "Path",
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.path || <span className="text-muted-content">(root)</span>}
          </span>
        ),
      },
      {
        accessorKey: "reason",
        header: "Reason",
        cell: ({ row }) => (
          <span className="badge badge-error badge-sm">
            {row.original.reason.replace(/_/g, " ")}
          </span>
        ),
      },
      {
        accessorKey: "context",
        header: "Context",
        cell: ({ row }) => <span className="text-xs">{row.original.context}</span>,
      },
      {
        accessorKey: "value",
        header: "Value",
        cell: ({ row }) => {
          const value = row.original.value
          return (
            <span className="font-mono text-xs max-w-xs truncate block">
              {typeof value === "object" ? formatJson(value) : String(value)}
            </span>
          )
        },
      },
    ],
    []
  )

  if (errorValues.length === 0) return null

  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold mb-2 text-error">
        Errors - Skipped Values ({errorValues.length})
      </h3>
      <div className="card bg-base-200 p-4">
        <p className="text-xs text-muted-content mb-3">
          These values were found but could not be extracted as variables and were skipped. See
          reasons below.
        </p>
        <div className="overflow-x-auto">
          <Table
            columns={columns}
            data={errorValues}
            enableSorting={true}
            enableFilters={true}
            addPagination={false}
            classNames={{
              table: "table table-zebra table-sm",
            }}
          />
        </div>
      </div>
    </div>
  )
}
