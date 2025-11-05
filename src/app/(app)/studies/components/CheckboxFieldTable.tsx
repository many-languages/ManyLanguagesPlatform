"use client"

import React, { useCallback, useMemo, useRef, useEffect } from "react"
import { useFormContext } from "react-hook-form"
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
  const {
    watch,
    setValue,
    formState: { isSubmitting, errors },
  } = useFormContext()

  const selectedIds = watch(name) || []
  const error = errors[name]

  // ✅ Toggle one
  const toggleSelection = useCallback(
    (id: number) => {
      const currentIds = watch(name) || []
      const isSelected = currentIds.includes(id)
      const newSelectedIds = isSelected
        ? currentIds.filter((selectedId: number) => selectedId !== id)
        : [...currentIds, id]
      setValue(name, newSelectedIds, { shouldValidate: true, shouldDirty: true })
    },
    [watch, setValue, name]
  )

  // ✅ Toggle all
  const toggleAll = useCallback(() => {
    const currentIds = watch(name) || []
    if (currentIds.length === options.length) {
      setValue(name, [], { shouldValidate: true, shouldDirty: true }) // deselect all
    } else {
      setValue(
        name,
        options.map((o) => o.id),
        { shouldValidate: true, shouldDirty: true }
      ) // select all
    }
  }, [watch, setValue, name, options])

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
    [selectedIds, toggleSelection, extraColumns, isSubmitting, toggleAll, options.length, watch]
  )

  const data = useMemo(
    () => options.map((item, index) => ({ ...item, ...extraData[index] })),
    [options, extraData]
  )

  return (
    <div className="flex flex-col gap-1">
      <Table columns={columns} data={data} addPagination={true} />
      {error && <span className="text-error text-sm">{error.message as string}</span>}
    </div>
  )
}

export default CheckboxFieldTable
