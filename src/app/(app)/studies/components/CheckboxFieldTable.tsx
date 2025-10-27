"use client"

import React, { useCallback, useMemo, useRef, useEffect } from "react"
import { useField, useFormikContext, ErrorMessage } from "formik"
import Table from "@/src/app/components/Table"

interface CheckboxFieldTableProps<T> {
  name: string
  options: { id: number; label: string }[]
  extraData?: T[]
  extraColumns?: any[]
}

const CheckboxFieldTable = <T,>({
  name,
  options,
  extraData = [],
  extraColumns = [],
}: CheckboxFieldTableProps<T>) => {
  const [field, , helpers] = useField<number[]>({ name })
  const { isSubmitting } = useFormikContext()

  const selectedIds = field.value || []
  const { setValue } = helpers

  // ✅ Toggle one
  const toggleSelection = useCallback(
    (id: number) => {
      const isSelected = selectedIds.includes(id)
      const newSelectedIds = isSelected
        ? selectedIds.filter((selectedId) => selectedId !== id)
        : [...selectedIds, id]
      setValue(newSelectedIds)
    },
    [selectedIds, setValue]
  )

  // ✅ Toggle all
  const toggleAll = useCallback(() => {
    if (selectedIds.length === options.length) {
      setValue([]) // deselect all
    } else {
      setValue(options.map((o) => o.id)) // select all
    }
  }, [selectedIds, setValue, options])

  // ✅ Ref for indeterminate checkbox
  const headerCheckboxRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate =
        selectedIds.length > 0 && selectedIds.length < options.length
    }
  }, [selectedIds, options.length])

  const columns = useMemo(
    () => [
      {
        id: "selection",
        header: () => (
          <input
            ref={headerCheckboxRef}
            type="checkbox"
            className="checkbox checkbox-primary border-2"
            checked={selectedIds.length === options.length && options.length > 0}
            onChange={toggleAll}
            disabled={isSubmitting}
            title="Select / Deselect all"
          />
        ),
        cell: ({ row }: any) => (
          <input
            type="checkbox"
            className="checkbox checkbox-primary border-2"
            checked={selectedIds.includes(row.original.id)}
            disabled={isSubmitting}
            onChange={() => toggleSelection(row.original.id)}
          />
        ),
      },
      {
        id: "name",
        accessorKey: "label",
        header: "Name",
        cell: (info: any) => info.getValue(),
      },
      ...extraColumns,
    ],
    [selectedIds, toggleSelection, extraColumns, isSubmitting, toggleAll, options.length]
  )

  const data = useMemo(
    () => options.map((item, index) => ({ ...item, ...extraData[index] })),
    [options, extraData]
  )

  return (
    <div className="flex flex-col gap-1">
      <Table columns={columns} data={data} addPagination={true} />
      <ErrorMessage name={name}>
        {(msg) => <span className="text-error text-sm">{msg}</span>}
      </ErrorMessage>
    </div>
  )
}

export default CheckboxFieldTable
