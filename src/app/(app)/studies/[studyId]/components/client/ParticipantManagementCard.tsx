"use client"

import React, { useMemo } from "react"
import { useRouter } from "next/navigation"
import type { JatosMetadata } from "@/src/types/jatos"
import Card from "@/src/app/components/Card"
import CheckboxFieldTable from "../../../components/CheckboxFieldTable"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
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
  action: z.enum(["TOGGLE_ACTIVE", "TOGGLE_PAYED"]).optional(),
})

type ParticipantFormData = z.infer<typeof ParticipantSchema>

export default function ParticipantManagementCard({
  participants,
  metadata,
}: ParticipantManagementCardProps) {
  const router = useRouter()

  // Mutations
  const [toggleActiveMutation] = useMutation(toggleParticipantActive)
  const [togglePayedMutation] = useMutation(toggleParticipantPayed)

  // Use router.refresh() to refetch server data after mutations
  const handleRefresh = async () => {
    router.refresh()
  }

  // Get studyResults from metadata
  const studyResults = useMemo(() => metadata?.data?.[0]?.studyResults ?? [], [metadata])

  const form = useForm<ParticipantFormData>({
    resolver: zodResolver(ParticipantSchema),
    defaultValues: { selectedParticipantIds: [], action: undefined },
    mode: "onChange",
  })

  // Handle action definitions
  const handleToggleActive = async (ids: number[]) => {
    const areAllActive = participants.filter((p) => ids.includes(p.id)).every((p) => p.active)
    await toggleActiveMutation({ participantIds: ids, makeActive: !areAllActive })
    toast.success(areAllActive ? "Participants deactivated" : "Participants activated")
    await handleRefresh()
  }

  const handleTogglePayed = async (ids: number[]) => {
    const areAllPayed = participants.filter((p) => ids.includes(p.id)).every((p) => p.payed)
    await togglePayedMutation({ participantIds: ids, makePayed: !areAllPayed })
    toast.success(areAllPayed ? "Marked as unpaid" : "Marked as paid")
    await handleRefresh()
  }

  const onSubmit = async (values: ParticipantFormData) => {
    try {
      if (values.action === "TOGGLE_ACTIVE") {
        await handleToggleActive(values.selectedParticipantIds)
      } else if (values.action === "TOGGLE_PAYED") {
        await handleTogglePayed(values.selectedParticipantIds)
      } else {
        toast.error("No action selected")
      }
    } finally {
      form.reset()
    }
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
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card
          title="Participant Management"
          actions={
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={form.formState.isSubmitting}
                onClick={async () => {
                  form.setValue("action", "TOGGLE_ACTIVE")
                  await form.handleSubmit(onSubmit)()
                }}
              >
                {form.formState.isSubmitting && form.watch("action") === "TOGGLE_ACTIVE"
                  ? "Processing..."
                  : "Toggle Active"}
              </button>

              <button
                type="button"
                className="btn btn-accent"
                disabled={form.formState.isSubmitting}
                onClick={async () => {
                  form.setValue("action", "TOGGLE_PAYED")
                  await form.handleSubmit(onSubmit)()
                }}
              >
                {form.formState.isSubmitting && form.watch("action") === "TOGGLE_PAYED"
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
      </form>
    </FormProvider>
  )
}
