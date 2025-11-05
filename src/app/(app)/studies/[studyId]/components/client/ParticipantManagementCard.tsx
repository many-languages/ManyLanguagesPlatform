"use client"

import React, { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import type { JatosMetadata } from "@/src/types/jatos"
import Card from "@/src/app/components/Card"
import CheckboxFieldTable from "../../../components/CheckboxFieldTable"
import { Form, FORM_ERROR } from "@/src/app/components/Form"
import { FormErrorDisplay } from "@/src/app/components/FormErrorDisplay"
import { useFormContext } from "react-hook-form"
import { z } from "zod"
import toast from "react-hot-toast"
import { useMutation } from "@blitzjs/rpc"
import toggleParticipantActive from "../../../mutations/toggleParticipantActive"
import toggleParticipantPayed from "../../../mutations/toggleParticipantPayed"
import { ParticipantWithEmail } from "../../../queries/getStudyParticipants"

interface ParticipantManagementCardProps {
  participants: ParticipantWithEmail[]
  metadata: JatosMetadata
}

const ParticipantSchema = z.object({
  selectedParticipantIds: z.array(z.number()).min(1, "Please select at least one participant"),
})

type ParticipantFormData = z.infer<typeof ParticipantSchema>

// Custom button component that sets action and submits
function ActionButton({
  action,
  label,
  className,
  participants,
}: {
  action: "TOGGLE_ACTIVE" | "TOGGLE_PAYED"
  label: string
  className: string
  participants: ParticipantWithEmail[]
}) {
  const { watch, setValue, formState, trigger } = useFormContext<ParticipantFormData>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const [toggleActiveMutation] = useMutation(toggleParticipantActive)
  const [togglePayedMutation] = useMutation(toggleParticipantPayed)

  const handleClick = async () => {
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
        const areAllActive = participants
          .filter((p) => selectedIds.includes(p.id))
          .every((p) => p.active)

        await toggleActiveMutation({
          participantIds: selectedIds,
          makeActive: !areAllActive,
        })

        toast.success(areAllActive ? "Participants deactivated" : "Participants activated")
      } else {
        const areAllPayed = participants
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
    } catch (error: any) {
      toast.error(error?.message || "An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <button
      type="button"
      className={className}
      disabled={formState.isSubmitting || isSubmitting}
      onClick={handleClick}
    >
      {isSubmitting ? "Processing..." : label}
    </button>
  )
}

export default function ParticipantManagementCard({
  participants,
  metadata,
}: ParticipantManagementCardProps) {
  const router = useRouter()

  // Get studyResults from metadata
  const studyResults = useMemo(() => metadata?.data?.[0]?.studyResults ?? [], [metadata])

  // Match JATOS results to participants (using pseudonym/comment or user.email)
  // And calculate values for the table
  const participantRows = useMemo(() => {
    return participants.map((p) => {
      const jatosResult = studyResults.find(
        (r) => r.comment === p.pseudonym || r.comment === p.user.email
      )

      const componentResults = jatosResult?.componentResults ?? []
      const finishedComponents = componentResults.filter(
        (c) => c.componentState === "FINISHED"
      ).length
      const totalComponents = componentResults.length || 1
      const progress = Math.round((finishedComponents / totalComponents) * 100)

      return {
        id: p.id,
        label: p.user.email,
        finished: jatosResult?.studyState === "FINISHED",
        lastSeen: jatosResult?.lastSeenDate
          ? new Date(jatosResult.lastSeenDate).toLocaleString()
          : "—",
        active: p.active,
        progress,
        duration: jatosResult?.duration ?? "—",
        payed: p.payed,
      }
    })
  }, [participants, studyResults])

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
        actions={
          <div className="flex gap-2 justify-end">
            <ActionButton
              action="TOGGLE_ACTIVE"
              label="Toggle Active"
              className="btn btn-secondary"
              participants={participants}
            />
            <ActionButton
              action="TOGGLE_PAYED"
              label="Toggle Payed"
              className="btn btn-accent"
              participants={participants}
            />
          </div>
        }
      >
        <CheckboxFieldTable
          name="selectedParticipantIds"
          options={participantRows.map((p) => ({ id: p.id, label: p.label }))}
          extraData={participantRows}
          extraColumns={columns}
        />
        <FormErrorDisplay />
      </Card>
    </Form>
  )
}
