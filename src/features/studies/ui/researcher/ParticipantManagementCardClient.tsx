"use client"

import React, { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Card from "@/src/components/ui/Card"
import CheckboxFieldTable from "@/src/components/ui/CheckboxFieldTable"
import { Form } from "@/src/components/ui/Form"
import { FormErrorDisplay } from "@/src/components/ui/FormErrorDisplay"
import { useFormContext } from "react-hook-form"
import { z } from "zod"
import toast from "react-hot-toast"
import { useMutation } from "@blitzjs/rpc"
import toggleParticipantActive from "@/src/features/studies/mutations/toggleParticipantActive"
import toggleParticipantPayed from "@/src/features/studies/mutations/toggleParticipantPayed"
import type { ParticipantManagementCardProps, ResearcherParticipantStatusRow } from "../../types"
import { ARCHIVED_STUDY_CANNOT_EDIT_MESSAGE } from "../../domain/studyEditability"

const ParticipantSchema = z.object({
  selectedParticipantIds: z.array(z.number()).min(1, "Please select at least one participant"),
})

type ParticipantFormData = z.infer<typeof ParticipantSchema>

// Custom button component that sets action and submits
function ActionButton({
  action,
  label,
  className,
  participantRows,
  canEditStudySetup,
}: {
  action: "TOGGLE_ACTIVE" | "TOGGLE_PAYED"
  label: string
  className: string
  participantRows: ResearcherParticipantStatusRow[]
  canEditStudySetup: boolean
}) {
  const { watch, setValue, formState, trigger } = useFormContext<ParticipantFormData>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const [toggleActiveMutation] = useMutation(toggleParticipantActive)
  const [togglePayedMutation] = useMutation(toggleParticipantPayed)

  const handleClick = async () => {
    if (!canEditStudySetup) return

    const selectedIds = watch("selectedParticipantIds")

    // Validate form before proceeding
    const isValid = await trigger("selectedParticipantIds")

    if (!isValid || selectedIds.length === 0) {
      // Validation will show error via FormErrorDisplay
      return
    }

    setIsSubmitting(true)
    try {
      if (action === "TOGGLE_ACTIVE") {
        const areAllActive = participantRows
          .filter((p) => selectedIds.includes(p.id))
          .every((p) => p.active)

        await toggleActiveMutation({
          participantIds: selectedIds,
          makeActive: !areAllActive,
        })

        toast.success(areAllActive ? "Participants deactivated" : "Participants activated")
      } else {
        const areAllPayed = participantRows
          .filter((p) => selectedIds.includes(p.id))
          .every((p) => p.payed)

        await togglePayedMutation({
          participantIds: selectedIds,
          makePayed: !areAllPayed,
        })

        toast.success(areAllPayed ? "Marked as unpaid" : "Marked as paid")
      }

      // Clear selection after successful mutation
      setValue("selectedParticipantIds", [], { shouldValidate: false })
      router.refresh()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred"
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const disabled = formState.isSubmitting || isSubmitting || !canEditStudySetup

  return (
    <span
      className={!canEditStudySetup ? "tooltip tooltip-top inline-block" : "inline-block"}
      data-tip={!canEditStudySetup ? ARCHIVED_STUDY_CANNOT_EDIT_MESSAGE : undefined}
    >
      <button
        type="button"
        className={`${className} ${!canEditStudySetup ? "btn-disabled" : ""}`}
        disabled={disabled}
        onClick={handleClick}
      >
        {isSubmitting ? "Processing..." : label}
      </button>
    </span>
  )
}

export default function ParticipantManagementCardClient({
  participantRows,
  canEditStudySetup = true,
}: ParticipantManagementCardProps) {
  const router = useRouter()

  // Table column definitions
  const columns = useMemo(
    () => [
      {
        id: "email",
        header: "Email",
        accessorKey: "label",
        cell: (info: any) => (
          <span className="truncate max-w-[200px]" title={info.getValue()}>
            {info.getValue()}
          </span>
        ),
      },
      {
        id: "finished",
        header: "Finished",
        cell: ({ row }: any) =>
          row.original.finished ? (
            <span className="badge badge-success">Yes</span>
          ) : (
            <span className="badge badge-ghost">No</span>
          ),
      },
      {
        id: "lastSeen",
        header: "Last Seen",
        accessorKey: "lastSeen",
        cell: (info: any) => info.getValue() ?? "—",
      },
      {
        id: "active",
        header: "Active",
        cell: ({ row }: any) =>
          row.original.active ? (
            <span className="badge badge-primary">Active</span>
          ) : (
            <span className="badge badge-error">Inactive</span>
          ),
      },
      {
        id: "progress",
        header: "Progress",
        cell: ({ row }: any) => (
          <progress
            className="progress progress-primary w-24"
            value={row.original.progress}
            max="100"
          />
        ),
      },
      {
        id: "duration",
        header: "Duration",
        accessorKey: "duration",
        cell: (info: any) => info.getValue() ?? "—",
      },
      {
        id: "payed",
        header: "Payed",
        cell: ({ row }: any) =>
          row.original.payed ? (
            <span className="badge badge-success">Yes</span>
          ) : (
            <span className="badge badge-error">No</span>
          ),
      },
    ],
    []
  )

  return (
    <Form
      schema={ParticipantSchema}
      defaultValues={{ selectedParticipantIds: [] }}
      onSubmit={async () => {
        // Form submission is handled by ActionButton components
        // This is just for validation
      }}
      onSuccess={() => router.refresh()}
    >
      <Card
        title="Participant Management"
        className="mt-4"
        collapsible
        actions={
          <div className="flex gap-2 justify-end">
            <ActionButton
              action="TOGGLE_ACTIVE"
              label="Toggle Active"
              className="btn btn-secondary"
              participantRows={participantRows}
              canEditStudySetup={canEditStudySetup}
            />
            <ActionButton
              action="TOGGLE_PAYED"
              label="Toggle Payed"
              className="btn btn-accent"
              participantRows={participantRows}
              canEditStudySetup={canEditStudySetup}
            />
          </div>
        }
      >
        <CheckboxFieldTable
          name="selectedParticipantIds"
          options={participantRows.map((p) => ({ id: p.id, label: p.label }))}
          extraData={participantRows}
          extraColumns={columns}
          selectionDisabled={!canEditStudySetup}
        />
        <FormErrorDisplay />
      </Card>
    </Form>
  )
}
