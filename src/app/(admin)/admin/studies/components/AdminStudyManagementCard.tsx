"use client"

import { useMemo, type MouseEvent } from "react"
import Card from "@/src/app/components/Card"
import Form from "@/src/app/components/Form"
import CheckboxFieldTable from "@/src/app/(app)/studies/components/CheckboxFieldTable"
import { FormErrorDisplay } from "@/src/app/components/FormErrorDisplay"
import { AdminStudySchema } from "../validations"
import { Codebook, CodebookEntry, FeedbackTemplate } from "db"
import Modal from "@/src/app/components/Modal"
import ViewDetailsButton from "@/src/app/components/ViewDetailsButton"
import StatusBadge, { type StatusBadgeVariant } from "@/src/app/components/StatusBadge"
import {
  getAdminApprovalVariant,
  getSetupStatusProps,
  getDataCollectionProps,
} from "@/src/lib/utils/statusBadgePresets"
import MDEditor from "@uiw/react-md-editor"
import type { AdminStudyWithLatestUpload } from "../queries/getAdminStudies"
import { getSetupStatusLabel } from "@/src/app/(app)/studies/[studyId]/setup/utils/setupStatus"
import type { StudyWithMinimalRelations } from "@/src/app/(app)/studies/[studyId]/setup/utils/setupStatus"
import StudyActions from "./StudyActions"
import toast from "react-hot-toast"

function JatosStudyUuidCell({ uuid }: { uuid: string }) {
  if (uuid === "NA") {
    return <span className="text-base-content/50">{uuid}</span>
  }

  const copy = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(uuid)
      toast.success("JATOS study UUID copied")
    } catch {
      toast.error("Could not copy UUID")
    }
  }

  return (
    <button
      type="button"
      className="m-0 border-0 bg-transparent p-0 text-left font-inherit text-inherit hover:underline decoration-dashed underline-offset-2 cursor-pointer break-all"
      onClick={copy}
      aria-label={`Copy JATOS study UUID (${uuid})`}
    >
      {uuid}
    </button>
  )
}

type CodebookWithEntries = Codebook & { entries: CodebookEntry[] }

type StudyWithFeedbackTemplate = AdminStudyWithLatestUpload & {
  FeedbackTemplate: FeedbackTemplate | null
  codebook: CodebookWithEntries | null
  /** From admin studies query; null if JATOS metadata could not be loaded */
  hasParticipantResponses?: boolean | null
}

function CodebookButton({ codebook }: { codebook: CodebookWithEntries | null }) {
  return (
    <ViewDetailsButton hasData={!!codebook?.entries?.length} buttonLabel="View Codebook">
      {({ open, onClose }) => (
        <CodebookModal open={open} onClose={onClose} entries={codebook!.entries} />
      )}
    </ViewDetailsButton>
  )
}

function CodebookModal({
  open,
  onClose,
  entries,
}: {
  open: boolean
  onClose: () => void
  entries: Array<{
    variableKey: string
    variableName: string
    description: string | null
    personalData: boolean
  }>
}) {
  return (
    <Modal open={open} size="max-w-4xl">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-end mb-4 pb-4 border-b">
          <button type="button" className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th>Variable name</th>
                <th>Description</th>
                <th>Private</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.variableKey}>
                  <td className="font-medium">{entry.variableName}</td>
                  <td>{entry.description ?? "—"}</td>
                  <td>{entry.personalData ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  )
}

function FeedbackTemplateButton({
  feedbackTemplate,
}: {
  feedbackTemplate: { content: string } | null
}) {
  return (
    <ViewDetailsButton hasData={!!feedbackTemplate} buttonLabel="View Template">
      {({ open, onClose }) => (
        <FeedbackTemplateModal open={open} onClose={onClose} content={feedbackTemplate!.content} />
      )}
    </ViewDetailsButton>
  )
}

function FeedbackTemplateModal({
  open,
  onClose,
  content,
}: {
  open: boolean
  onClose: () => void
  content: string
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

      const adminApproved = study.adminApproved
      const approvalLabel =
        adminApproved === true ? "Approved" : adminApproved === false ? "Rejected" : "Pending"

      const hpr = study.hasParticipantResponses
      const participantResponsesLabel =
        hpr === true ? "Yes" : hpr === false ? "No" : hpr === null ? "Unknown" : "—"

      return {
        id: study.id,
        label: study.title?.trim() || "NA",
        jatosStudyUUID: study.jatosStudyUUID ?? "NA",
        createdAt: created?.toLocaleString() ?? "NA",
        setupStatus: getSetupStatusLabel(study as StudyWithMinimalRelations),
        adminApproval: approvalLabel,
        dataCollectionStatus: study.status,
        archived: study.archived,
        archivedLabel: study.archived ? "Yes" : "No",
        participantResponsesLabel,
        codebook: study.codebook ?? null,
        feedbackTemplate: study.FeedbackTemplate ?? null,
      }
    })
  }, [studies])

  const columns = useMemo(
    () => [
      {
        id: "jatosStudyUUID",
        header: "JATOS Study UUID",
        accessorKey: "jatosStudyUUID",
        cell: ({ row }: any) => <JatosStudyUuidCell uuid={row.original.jatosStudyUUID as string} />,
      },
      {
        id: "adminApproval",
        header: "Admin Approval",
        accessorKey: "adminApproval",
        cell: ({ row }: any) => {
          const label = row.original.adminApproval as string
          return <StatusBadge label={label} variant={getAdminApprovalVariant(label)} />
        },
      },
      {
        id: "setupStatus",
        header: "Setup Status",
        accessorKey: "setupStatus",
        cell: ({ row }: any) => {
          const props = getSetupStatusProps(row.original.setupStatus as string)
          return <StatusBadge {...props} />
        },
      },
      {
        id: "dataCollectionStatus",
        header: "Data Collection",
        accessorKey: "dataCollectionStatus",
        cell: ({ row }: any) => {
          const props = getDataCollectionProps(row.original.dataCollectionStatus as string)
          return <StatusBadge {...props} />
        },
      },
      {
        id: "archived",
        header: "Archived",
        accessorKey: "archivedLabel",
        cell: ({ row }: any) => {
          const archived = row.original.archived as boolean
          return (
            <StatusBadge
              label={archived ? "Yes" : "No"}
              variant={archived ? "warning" : "success"}
            />
          )
        },
      },
      {
        id: "participantResponses",
        header: "Participant responses",
        accessorKey: "participantResponsesLabel",
        cell: ({ row }: any) => {
          const label = row.original.participantResponsesLabel as string
          const variant: StatusBadgeVariant =
            label === "Yes" ? "warning" : label === "No" ? "success" : "ghost"
          return <StatusBadge label={label} variant={variant} />
        },
      },
      {
        id: "codebook",
        header: "Codebook",
        cell: ({ row }: any) => <CodebookButton codebook={row.original.codebook} />,
      },
      {
        id: "feedbackTemplate",
        header: "Feedback Template",
        cell: ({ row }: any) => (
          <FeedbackTemplateButton feedbackTemplate={row.original.feedbackTemplate} />
        ),
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
