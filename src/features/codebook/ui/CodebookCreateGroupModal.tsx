"use client"

import { useEffect, useMemo, useState } from "react"
import Modal from "@/src/components/ui/Modal"
import { ControlledSelectField } from "@/src/components/ui/fields"

export interface CodebookCreateGroupCandidate {
  prefix: string
  count: number
}

export interface CodebookCreateGroupPreviewVariable {
  id: number
  variableName: string
  dslKey: string
}

interface CodebookCreateGroupModalProps {
  open: boolean
  onClose: () => void
  candidateGroups: CodebookCreateGroupCandidate[]
  variables: CodebookCreateGroupPreviewVariable[]
  onCreateGroup: (prefix: string) => void
}

export default function CodebookCreateGroupModal({
  open,
  onClose,
  candidateGroups,
  variables,
  onCreateGroup,
}: CodebookCreateGroupModalProps) {
  const [pendingGroupPrefix, setPendingGroupPrefix] = useState("")

  useEffect(() => {
    if (!open) {
      setPendingGroupPrefix("")
    }
  }, [open])

  const handleClose = () => {
    setPendingGroupPrefix("")
    onClose()
  }

  const previewVariables = pendingGroupPrefix
    ? variables.filter((v) => v.dslKey.startsWith(pendingGroupPrefix + "."))
    : []

  const prefixOptions = useMemo(
    () =>
      candidateGroups.map(({ prefix, count }) => ({
        value: prefix,
        label: `${prefix} (${count} variable${count !== 1 ? "s" : ""})`,
      })),
    [candidateGroups]
  )

  return (
    <Modal open={open} size="max-w-lg">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold">Create Variable Group</h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={handleClose} type="button">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <ControlledSelectField
            label="Group prefix"
            value={pendingGroupPrefix}
            onChange={setPendingGroupPrefix}
            options={prefixOptions}
            placeholder="Select a prefix..."
          />

          {pendingGroupPrefix && (
            <div>
              <p className="text-xs text-base-content/50 mb-2">Variables that will be grouped:</p>
              <ul className="space-y-1">
                {previewVariables.map((v) => (
                  <li key={v.id} className="flex items-center gap-2 text-sm">
                    <span className="text-base-content/40">•</span>
                    <span className="font-medium">{v.variableName}</span>
                    <span className="text-xs text-base-content/40">{v.dslKey}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={handleClose} type="button">
            Cancel
          </button>
          <button
            className="btn btn-primary"
            disabled={!pendingGroupPrefix}
            onClick={() => onCreateGroup(pendingGroupPrefix)}
            type="button"
          >
            Create Group
          </button>
        </div>
      </div>
    </Modal>
  )
}
