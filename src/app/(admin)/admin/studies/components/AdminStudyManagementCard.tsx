"use client"

import { useMemo, useState } from "react"
import Card from "@/src/app/components/Card"
import Form from "@/src/app/components/Form"
import CheckboxFieldTable from "@/src/app/(app)/studies/components/CheckboxFieldTable"
import { FormErrorDisplay } from "@/src/app/components/FormErrorDisplay"
import { AdminStudySchema, AdminStudyFormValues } from "../validations"
import { Study, FeedbackTemplate } from "db"
import { useFormContext } from "react-hook-form"
import { useRouter } from "next/navigation"
import { useMutation } from "@blitzjs/rpc"
import toast from "react-hot-toast"
import enableDataCollection from "../mutations/enableDataCollection"
import disableDataCollection from "../mutations/disableDataCollection"
import Modal from "@/src/app/components/Modal"
import MDEditor from "@uiw/react-md-editor"

type StudyWithFeedbackTemplate = Study & {
  FeedbackTemplate: FeedbackTemplate[] | null
  step5Completed?: boolean
  step6Completed?: boolean
}

function getSetupStatus(
  study: Study & { step5Completed?: boolean; step6Completed?: boolean }
): string {
  const {
    step1Completed,
    step2Completed,
    step3Completed,
    step4Completed,
    step5Completed = false,
    step6Completed = false,
  } = study

  // Check if all steps are completed
  if (
    step1Completed &&
    step2Completed &&
    step3Completed &&
    step4Completed &&
    step5Completed &&
    step6Completed
  ) {
    return "finished"
  }

  // Find the latest completed step
  if (step6Completed) return "Step 6"
  if (step5Completed) return "Step 5"
  if (step4Completed) return "Step 4"
  if (step3Completed) return "Step 3"
  if (step2Completed) return "Step 2"
  if (step1Completed) return "Step 1"

  return "Not started"
}

function FeedbackTemplateButton({
  feedbackTemplate,
  studyId,
  studyTitle,
}: {
  feedbackTemplate: { content: string } | null
  studyId: number
  studyTitle: string
}) {
  const [isOpen, setIsOpen] = useState(false)

  if (!feedbackTemplate) {
    return <span className="text-base-content/50">Not available</span>
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-sm btn-outline btn-primary"
        onClick={() => setIsOpen(true)}
      >
        View Template
      </button>
      <FeedbackTemplateModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        content={feedbackTemplate.content}
        studyTitle={studyTitle}
      />
    </>
  )
}

function FeedbackTemplateModal({
  open,
  onClose,
  content,
  studyTitle,
}: {
  open: boolean
  onClose: () => void
  content: string
  studyTitle: string
}) {
  return (
    <Modal open={open} size="max-w-4xl">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-end mb-4 pb-4 border-b">
          <button type="button" className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-auto" data-color-mode="light">
          <MDEditor.Markdown source={content} />
        </div>
      </div>
    </Modal>
  )
}

export default function AdminStudyManagementCard({
  studies,
}: {
  studies: StudyWithFeedbackTemplate[]
}) {
  const rows = useMemo(() => {
    return studies.map((study) => {
      const created = study.createdAt ? new Date(study.createdAt) : null

      return {
        id: study.id,
        label: study.title?.trim() || "NA",
        jatosStudyUUID: study.jatosStudyUUID ?? "NA",
        createdAt: created?.toLocaleString() ?? "NA",
        setupStatus: getSetupStatus(study),
        dataCollectionStatus: study.status,
        feedbackTemplate: study.FeedbackTemplate?.[0] || null,
      }
    })
  }, [studies])

  const columns = useMemo(
    () => [
      {
        id: "jatosStudyUUID",
        header: "JATOS Study UUID",
        accessorKey: "jatosStudyUUID",
        cell: ({ row }: any) => {
          const uuid = row.original.jatosStudyUUID as string
          return <span className={uuid === "NA" ? "text-base-content/50" : ""}>{uuid}</span>
        },
      },
      {
        id: "setupStatus",
        header: "Setup Status",
        accessorKey: "setupStatus",
        cell: ({ row }: any) => {
          const status = row.original.setupStatus as string
          const isFinished = status === "finished"
          const badgeClass = isFinished
            ? "badge badge-success"
            : status === "Not started"
            ? "badge badge-ghost"
            : "badge badge-info"
          return <span className={badgeClass}>{status}</span>
        },
      },
      {
        id: "dataCollectionStatus",
        header: "Data Collection",
        accessorKey: "dataCollectionStatus",
        cell: ({ row }: any) => {
          const status = row.original.dataCollectionStatus as string
          const isEnabled = status === "OPEN"
          const badgeClass = isEnabled ? "badge badge-success" : "badge badge-error"
          const label = isEnabled ? "Enabled" : "Disabled"
          return <span className={badgeClass}>{label}</span>
        },
      },
      {
        id: "feedbackTemplate",
        header: "Feedback Template",
        cell: ({ row }: any) => {
          const feedbackTemplate = row.original.feedbackTemplate
          const studyId = row.original.id
          return (
            <FeedbackTemplateButton
              feedbackTemplate={feedbackTemplate}
              studyId={studyId}
              studyTitle={row.original.label}
            />
          )
        },
      },
      {
        id: "createdAt",
        header: "Created",
        accessorKey: "createdAt",
      },
    ],
    []
  )

  return (
    <Form<typeof AdminStudySchema>
      schema={AdminStudySchema}
      defaultValues={{ selectedStudyIds: [] }}
      onSubmit={async () => {}}
    >
      <Card
        title=""
        bgColor="bg-base-100"
        className="mt-4"
        actions={<StudyActions studies={studies} />}
      >
        <CheckboxFieldTable
          name="selectedStudyIds"
          options={rows.map((row) => ({ id: row.id, label: row.label }))}
          extraData={rows}
          extraColumns={columns}
        />
        <FormErrorDisplay />
      </Card>
    </Form>
  )
}

function StudyActions({ studies }: { studies: StudyWithFeedbackTemplate[] }) {
  const router = useRouter()
  const { watch, setValue, trigger } = useFormContext<AdminStudyFormValues>()
  const [enableMutation] = useMutation(enableDataCollection)
  const [disableMutation] = useMutation(disableDataCollection)
  const [isEnabling, setIsEnabling] = useState(false)
  const [isDisabling, setIsDisabling] = useState(false)

  const selectedIds = watch("selectedStudyIds")

  // Determine which buttons to show based on selected studies' status
  const selectedStudies = studies.filter((s) => selectedIds.includes(s.id))
  const allEnabled = selectedStudies.length > 0 && selectedStudies.every((s) => s.status === "OPEN")
  const allDisabled =
    selectedStudies.length > 0 && selectedStudies.every((s) => s.status === "CLOSED")
  const mixed = selectedStudies.length > 0 && !allEnabled && !allDisabled

  const showDisableButton = allEnabled || mixed
  const showEnableButton = allDisabled || mixed

  const handleEnable = async () => {
    const ids = watch("selectedStudyIds")
    const valid = await trigger("selectedStudyIds")
    if (!valid) return

    // Validate that all selected studies have finished setup
    const selectedStudiesToEnable = studies.filter((s) => ids.includes(s.id))
    const unfinishedStudies = selectedStudiesToEnable.filter(
      (s) =>
        !(
          s.step1Completed &&
          s.step2Completed &&
          s.step3Completed &&
          s.step4Completed &&
          s.step5Completed &&
          s.step6Completed
        )
    )

    if (unfinishedStudies.length > 0) {
      const unfinishedTitles = unfinishedStudies
        .map((s) => s.title?.trim() || `Study #${s.id}`)
        .join(", ")
      toast.error(
        `Cannot enable data collection. The following studies have not finished setup: ${unfinishedTitles}`,
        { duration: 5000 }
      )
      return
    }

    try {
      setIsEnabling(true)
      const result = await enableMutation({ studyIds: ids })
      toast.success(`Enabled data collection for ${result.updated} study/studies`)
      setValue("selectedStudyIds", [])
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to enable data collection."
      toast.error(message)
    } finally {
      setIsEnabling(false)
    }
  }

  const handleDisable = async () => {
    const ids = watch("selectedStudyIds")
    const valid = await trigger("selectedStudyIds")
    if (!valid) return
    try {
      setIsDisabling(true)
      const result = await disableMutation({ studyIds: ids })
      toast.success(`Disabled data collection for ${result.updated} study/studies`)
      setValue("selectedStudyIds", [])
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to disable data collection."
      toast.error(message)
    } finally {
      setIsDisabling(false)
    }
  }

  const isSubmitting = isEnabling || isDisabling

  // Don't show buttons if nothing is selected
  if (selectedIds.length === 0) {
    return null
  }

  return (
    <div className="flex gap-2 justify-end">
      {showDisableButton && (
        <button
          type="button"
          className="btn btn-error btn-outline"
          disabled={isSubmitting}
          onClick={handleDisable}
        >
          {isDisabling ? "Disabling..." : "Disable data collection"}
        </button>
      )}
      {showEnableButton && (
        <button
          type="button"
          className="btn btn-success btn-outline"
          disabled={isSubmitting}
          onClick={handleEnable}
        >
          {isEnabling ? "Enabling..." : "Enable data collection"}
        </button>
      )}
    </div>
  )
}
