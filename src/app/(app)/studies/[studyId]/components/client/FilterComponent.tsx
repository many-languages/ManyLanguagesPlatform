"use client"

import React, { useState, useMemo } from "react"
import { Formik, Form } from "formik"
import Modal from "@/src/app/components/Modal"
import CheckboxFieldTable from "../../../components/CheckboxFieldTable"

interface FilterComponentProps {
  components: {
    uuid: string
    title: string
    colorClass: string
  }[]
  selectedUuids: string[] // ✅ new prop
  onFilterSelect: (selectedUuids: string[]) => void
}

/**
 * Modal that displays all study components with color-coded status spheres
 * and allows the user to select which components to show in the results table.
 */
export default function FilterComponent({
  components,
  selectedUuids,
  onFilterSelect,
}: FilterComponentProps) {
  const [open, setOpen] = useState(false)

  // ✅ Prepare CheckboxFieldTable options and color data
  const options = useMemo(
    () => components.map((c, index) => ({ id: index, label: c.title })),
    [components]
  )

  const extraData = useMemo(() => components.map((c) => ({ status: c.colorClass })), [components])

  const extraColumns = [
    {
      id: "status",
      header: "Status",
      cell: ({ row }: any) => (
        <div aria-label="status" className={`status ${row.original.status}`}></div>
      ),
    },
  ]

  // ✅ Compute initial selected IDs based on selected UUIDs
  const initialSelectedIds = useMemo(() => {
    return selectedUuids
      .map((uuid) => components.findIndex((c) => c.uuid === uuid))
      .filter((index) => index !== -1)
  }, [selectedUuids, components])

  return (
    <>
      <button className="btn btn-outline btn-primary" onClick={() => setOpen(true)}>
        Filter Components
      </button>

      <Modal open={open} size="max-w-2xl">
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-center mb-2">Select Components to Filter</h2>

          <Formik
            enableReinitialize
            initialValues={{ selectedComponentIds: initialSelectedIds }}
            validate={(values) => {
              const errors: Partial<{ selectedComponentIds: string }> = {}
              if (!values.selectedComponentIds.length) {
                errors.selectedComponentIds = "Please select at least one component"
              }
              return errors
            }}
            onSubmit={(values) => {
              const selectedUuids = values.selectedComponentIds.map((id) => components[id].uuid)
              onFilterSelect(selectedUuids)
              setOpen(false)
            }}
          >
            {({ isSubmitting }) => (
              <Form>
                <CheckboxFieldTable
                  name="selectedComponentIds"
                  options={options}
                  extraData={extraData}
                  extraColumns={extraColumns}
                />

                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    Filter
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </Modal>
    </>
  )
}
