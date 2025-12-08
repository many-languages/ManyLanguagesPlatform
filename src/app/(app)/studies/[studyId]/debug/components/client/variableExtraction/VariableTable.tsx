"use client"

import { useMemo, useState } from "react"
import type { ExtractedVariable } from "../../../../variables/types"
import type { ColumnDef } from "@tanstack/react-table"
import Table from "@/src/app/components/Table"
import VariableValuesModal from "./VariableValuesModal"
import { getTypeBadgeClass } from "../../../utils/badgeHelpers"

interface VariableTableProps {
  extractedVariables: ExtractedVariable[]
}

export default function VariableTable({ extractedVariables }: VariableTableProps) {
  const [selectedVariable, setSelectedVariable] = useState<ExtractedVariable | null>(null)

  const handleShowValues = (variable: ExtractedVariable) => {
    setSelectedVariable(variable)
  }

  const handleCloseModal = () => {
    setSelectedVariable(null)
  }

  const columns = useMemo<ColumnDef<ExtractedVariable>[]>(
    () => [
      {
        accessorKey: "variableName",
        header: "Variable Name",
        cell: ({ row }) => (
          <span className="font-mono font-medium">{row.original.variableName}</span>
        ),
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => {
          const variable = row.original
          const badgeClass = getTypeBadgeClass(variable.type)
          return (
            <div className="tooltip tooltip-top cursor-help">
              <span className={`badge ${badgeClass}`}>{variable.type}</span>
            </div>
          )
        },
      },
      {
        accessorKey: "occurrences",
        header: "Occurrences",
        cell: ({ row }) => row.original.occurrences,
      },
      {
        accessorKey: "exampleValue",
        header: "Example Value",
        cell: ({ row }) => (
          <span className="font-mono text-xs max-w-xs truncate block">
            {row.original.exampleValue}
          </span>
        ),
      },
      {
        id: "allValues",
        header: "All Values",
        cell: ({ row }) => (
          <button className="btn btn-sm btn-outline" onClick={() => handleShowValues(row.original)}>
            Show
          </button>
        ),
        enableSorting: false,
        enableColumnFilter: false,
      },
    ],
    []
  )

  if (extractedVariables.length === 0) {
    return (
      <div className="alert alert-info">
        <span>No variables extracted from this result</span>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table
          columns={columns}
          data={extractedVariables}
          enableSorting={true}
          enableFilters={true}
          addPagination={false}
          classNames={{
            table: "table table-zebra",
          }}
        />
      </div>
      <VariableValuesModal selectedVariable={selectedVariable} onClose={handleCloseModal} />
    </>
  )
}
