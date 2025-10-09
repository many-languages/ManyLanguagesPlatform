"use client"

import React, { useMemo } from "react"
import type { JatosMetadata } from "@/src/types/jatos"
import Card from "@/src/app/components/Card"
import CheckboxFieldTable from "@/src/app/components/CheckboxFieldTable"
import { ParticipantWithEmail } from "../../queries/getStudyParticipants"
import { Form, Formik } from "formik"
import toast from "react-hot-toast"
import { useMutation } from "@blitzjs/rpc"
import toggleParticipantActive from "../../mutations/toggleParticipantActive"
import toggleParticipantPayed from "../../mutations/toggleParticipantPayed"

interface ParticipantManagementCardProps {
  participants: ParticipantWithEmail[]
  metadata: JatosMetadata
  onRefresh: () => Promise<any>
}

interface FormValues {
  selectedParticipantIds: number[]
  action?: "TOGGLE_ACTIVE" | "TOGGLE_PAYED"
}

export default function ParticipantManagementCard({
  participants,
  metadata,
  onRefresh,
}: ParticipantManagementCardProps) {
  // Mutations
  const [toggleActiveMutation] = useMutation(toggleParticipantActive)
  const [togglePayedMutation] = useMutation(toggleParticipantPayed)

  // Get studyResults from metadata
  const studyResults = metadata?.data?.[0]?.studyResults ?? []

  // Handle action defitions
  const handleToggleActive = async (ids: number[]) => {
    const areAllActive = participants.filter((p) => ids.includes(p.id)).every((p) => p.active)
    await toggleActiveMutation({ participantIds: ids, makeActive: !areAllActive })
    toast.success(areAllActive ? "Participants deactivated" : "Participants activated")
    await onRefresh()
  }

  const handleTogglePayed = async (ids: number[]) => {
    const areAllPayed = participants.filter((p) => ids.includes(p.id)).every((p) => p.payed)
    await togglePayedMutation({ participantIds: ids, makePayed: !areAllPayed })
    toast.success(areAllPayed ? "Marked as unpaid" : "Marked as paid")
    await onRefresh()
  }

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
    <Formik<FormValues>
      initialValues={{ selectedParticipantIds: [], action: undefined }}
      validate={(values) => {
        const errors: Partial<Record<keyof FormValues, string>> = {}
        if (!values.selectedParticipantIds.length) {
          errors.selectedParticipantIds = "Please select at least one participant"
        }
        return errors
      }}
      onSubmit={async (values, { setSubmitting, resetForm }) => {
        setSubmitting(true)
        try {
          if (values.action === "TOGGLE_ACTIVE") {
            await handleToggleActive(values.selectedParticipantIds)
          } else if (values.action === "TOGGLE_PAYED") {
            await handleTogglePayed(values.selectedParticipantIds)
          } else {
            toast.error("No action selected")
          }
        } finally {
          setSubmitting(false)
          resetForm()
        }
      }}
    >
      {({ values, setFieldValue, submitForm, isSubmitting }) => (
        <Form>
          <Card
            title="Participant Management"
            actions={
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={isSubmitting}
                  onClick={async () => {
                    await setFieldValue("action", "TOGGLE_ACTIVE")
                    await submitForm()
                  }}
                >
                  {isSubmitting && values.action === "TOGGLE_ACTIVE"
                    ? "Processing..."
                    : "Toggle Active"}
                </button>

                <button
                  type="button"
                  className="btn btn-accent btn-sm"
                  disabled={isSubmitting}
                  onClick={async () => {
                    await setFieldValue("action", "TOGGLE_PAYED")
                    await submitForm()
                  }}
                >
                  {isSubmitting && values.action === "TOGGLE_PAYED"
                    ? "Processing..."
                    : "Toggle Payed"}
                </button>
              </div>
            }
          >
            <CheckboxFieldTable
              name="selectedParticipantIds"
              options={participantRows.map((p) => ({ id: p.id, label: p.label }))}
              extraData={participantRows}
              extraColumns={columns}
            />
          </Card>
        </Form>
      )}
    </Formik>
  )
}
