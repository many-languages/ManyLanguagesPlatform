"use client"

import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@blitzjs/rpc"
import { toast } from "react-hot-toast"

import updateVariableCodebook from "../mutations/updateVariableCodebook"
import type { UpdateVariableCodebookResult } from "../server/updateVariableCodebook"
import { CODEBOOK_SAVE_FEEDBACK_PERSONAL_DATA_HINT } from "../domain/codebookSaveMessages"
import {
  findWinningGroupKey,
  pruneNestedParentGroups,
  variableHasDescriptionCoverage,
  wouldOverlapExistingGroupKeys,
} from "../domain/codebookGroups"
import { Alert } from "@/src/components/ui/Alert"
import { AsyncButton } from "@/src/components/ui/AsyncButton"
import Card from "@/src/components/ui/Card"
import { Textarea } from "@/src/components/ui/fields"
import {
  ARCHIVED_STUDY_CANNOT_EDIT_MESSAGE,
  canEditStudySetup,
} from "@/src/features/studies/domain/studyEditability"
import type { StudyWithRelations } from "@/src/features/studies/types"

interface VariableCodebookEntry {
  id: number
  variableKey: string
  variableName: string
  dslKey: string
  type: string | null
  examples: Array<{ value: string; sourcePath: string }>
  description: string | null
  personalData: boolean
}

interface CodebookGroupEntry {
  groupKey: string
  description: string
  personalData: boolean
  collapsed: boolean
}

export interface CodebookStepState {
  disableNext: boolean
  nextTooltip?: string
}

export interface CodebookContentRef {
  saveCodebook: () => Promise<boolean>
}

export interface CodebookContentProps {
  initialVariables: Array<{
    id: number
    variableKey: string
    variableName: string
    dslKey: string
    type: string | null
    examples: Array<{ value: string; sourcePath: string }> | null
    description: string | null
    personalData: boolean
  }>
  initialGroups: Array<{
    groupKey: string
    description: string | null
    personalData: boolean
  }>
  codebook: {
    status?: "VALID" | "INVALID" | "NO_CODEBOOK" | "NO_EXTRACTION" | null
    missingKeys?: string[] | null
    extraKeys?: string[] | null
    updatedAt?: Date | string
  } | null
  approvedExtractionId: number | null
  approvedExtractionApprovedAt: Date | string | null
  study: StudyWithRelations
  onStepStateChange?: (state: CodebookStepState) => void
}

const MISSING_VARIABLES_TOOLTIP =
  "No variables were extracted. Go back to Step 4 and rerun extraction."
const MISSING_DESCRIPTIONS_TOOLTIP = "Please add descriptions for all variables"

const CodebookContent = forwardRef<CodebookContentRef, CodebookContentProps>(
  (
    {
      initialVariables,
      initialGroups,
      codebook,
      approvedExtractionId,
      approvedExtractionApprovedAt,
      study,
      onStepStateChange,
    },
    ref
  ) => {
    const router = useRouter()
    const studyId = study.id
    const canEditSetup = canEditStudySetup(study)

    const [variables, setVariables] = useState<VariableCodebookEntry[]>(() =>
      initialVariables.map((v) => ({
        id: v.id,
        variableKey: v.variableKey,
        variableName: v.variableName,
        dslKey: v.dslKey,
        type: v.type,
        examples: v.examples ?? [],
        description: v.description ?? "",
        personalData: v.personalData ?? false,
      }))
    )

    const [groups, setGroups] = useState<CodebookGroupEntry[]>(() =>
      pruneNestedParentGroups(
        initialGroups.map((g) => ({
          groupKey: g.groupKey,
          description: g.description ?? "",
          personalData: g.personalData,
          collapsed: true,
        }))
      )
    )

    const [isSaving, setIsSaving] = useState(false)
    const [updateVariableCodebookMutation] = useMutation(updateVariableCodebook)
    const [codebookSaved, setCodebookSaved] = useState(true)
    const [showGroupModal, setShowGroupModal] = useState(false)
    const [pendingGroupPrefix, setPendingGroupPrefix] = useState("")

    // ─── Derived data ────────────────────────────────────────────────────────

    const missingKeys = Array.isArray(codebook?.missingKeys)
      ? (codebook?.missingKeys as string[])
      : []
    const extraKeys = Array.isArray(codebook?.extraKeys) ? (codebook?.extraKeys as string[]) : []
    const validationStatus = codebook?.status ?? null
    const codebookUpdatedAt = codebook?.updatedAt ? new Date(codebook.updatedAt) : null
    const approvedExtractionAt = approvedExtractionApprovedAt
      ? new Date(approvedExtractionApprovedAt)
      : null
    const showInvalidKeys =
      validationStatus === "INVALID" && (missingKeys.length > 0 || extraKeys.length > 0)
    const showSoftWarning =
      validationStatus === "VALID" &&
      approvedExtractionId !== null &&
      approvedExtractionAt !== null &&
      codebookUpdatedAt !== null &&
      codebookUpdatedAt < approvedExtractionAt

    const groupKeys = useMemo(() => groups.map((g) => g.groupKey), [groups])

    // Variables with no winning group (mutually exclusive groups → at most one match)
    const ungroupedVariables = useMemo(
      () => variables.filter((v) => findWinningGroupKey(v.dslKey, groupKeys) === undefined),
      [variables, groupKeys]
    )

    // Candidate prefixes: ≥2 ungrouped vars, not already a group, not nested with an existing group
    const candidateGroups = useMemo(() => {
      const prefixCounts = new Map<string, number>()
      for (const v of ungroupedVariables) {
        const segments = v.dslKey.split(".")
        for (let i = 1; i < segments.length; i++) {
          const prefix = segments.slice(0, i).join(".")
          prefixCounts.set(prefix, (prefixCounts.get(prefix) ?? 0) + 1)
        }
      }
      return Array.from(prefixCounts.entries())
        .filter(
          ([prefix, count]) =>
            count >= 2 &&
            !groupKeys.includes(prefix) &&
            !wouldOverlapExistingGroupKeys(prefix, groupKeys)
        )
        .map(([prefix, count]) => ({ prefix, count }))
        .sort((a, b) => a.prefix.localeCompare(b.prefix))
    }, [ungroupedVariables, groupKeys])

    const hasMissingDescriptions = variables.some(
      (v) => !variableHasDescriptionCoverage(v.dslKey, v.description, groups)
    )

    const hasAnyDescription =
      variables.some((v) => (v.description ?? "").trim() !== "") ||
      groups.some((g) => g.description.trim() !== "")

    const showSavedBadge = codebookSaved && hasAnyDescription

    // ─── Handlers ────────────────────────────────────────────────────────────

    const updateVariable = (
      id: number,
      field: keyof VariableCodebookEntry,
      value: string | boolean
    ) => {
      setVariables((prev) => prev.map((v) => (v.id === id ? { ...v, [field]: value } : v)))
      setCodebookSaved(false)
    }

    const updateGroup = (
      groupKey: string,
      field: keyof Omit<CodebookGroupEntry, "groupKey" | "collapsed">,
      value: string | boolean
    ) => {
      setGroups((prev) => prev.map((g) => (g.groupKey === groupKey ? { ...g, [field]: value } : g)))
      setCodebookSaved(false)
    }

    const toggleGroupCollapse = (groupKey: string) => {
      setGroups((prev) =>
        prev.map((g) => (g.groupKey === groupKey ? { ...g, collapsed: !g.collapsed } : g))
      )
    }

    const removeGroup = (groupKey: string) => {
      setGroups((prev) => prev.filter((g) => g.groupKey !== groupKey))
      setCodebookSaved(false)
    }

    const handleCreateGroup = () => {
      if (!pendingGroupPrefix) return
      if (wouldOverlapExistingGroupKeys(pendingGroupPrefix, groupKeys)) {
        toast.error(
          "This prefix overlaps an existing group. Remove the other group first, or choose a different depth."
        )
        return
      }
      setGroups((prev) => [
        ...prev,
        { groupKey: pendingGroupPrefix, description: "", personalData: false, collapsed: false },
      ])
      setCodebookSaved(false)
      setPendingGroupPrefix("")
      setShowGroupModal(false)
    }

    const handleSave = async (): Promise<boolean> => {
      if (!canEditSetup) {
        toast.error(ARCHIVED_STUDY_CANNOT_EDIT_MESSAGE)
        return false
      }

      if (variables.length === 0) {
        toast.error("No variables found. Please complete step 4 first.")
        return false
      }

      setIsSaving(true)
      try {
        const result = (await updateVariableCodebookMutation({
          studyId,
          variables: variables.map((v) => ({
            variableKey: v.variableKey,
            variableName: v.variableName,
            dslKey: v.dslKey,
            description: v.description,
            personalData: v.personalData,
          })),
          groups: groups.map((g) => ({
            groupKey: g.groupKey,
            description: g.description,
            personalData: g.personalData,
          })),
        })) as UpdateVariableCodebookResult
        toast.success("Codebook saved successfully!")
        if (result.feedbackPersonalDataConflict) {
          toast(CODEBOOK_SAVE_FEEDBACK_PERSONAL_DATA_HINT, { duration: 7000 })
        }
        setCodebookSaved(true)
        router.refresh()
        return true
      } catch (error: unknown) {
        console.error("[CodebookContent] Failed to save codebook:", error)
        toast.error(error instanceof Error ? error.message : "Failed to save codebook")
        return false
      } finally {
        setIsSaving(false)
      }
    }

    // ─── Step state sync ─────────────────────────────────────────────────────

    useEffect(() => {
      const disableNext = variables.length === 0 || hasMissingDescriptions || !canEditSetup
      const nextTooltip = !canEditSetup
        ? ARCHIVED_STUDY_CANNOT_EDIT_MESSAGE
        : variables.length === 0
        ? MISSING_VARIABLES_TOOLTIP
        : hasMissingDescriptions
        ? MISSING_DESCRIPTIONS_TOOLTIP
        : undefined

      onStepStateChange?.({ disableNext, nextTooltip })
    }, [canEditSetup, hasMissingDescriptions, onStepStateChange, variables.length])

    useImperativeHandle(ref, () => ({
      saveCodebook: handleSave,
    }))

    // ─── Empty state ─────────────────────────────────────────────────────────

    if (variables.length === 0) {
      return (
        <>
          {!canEditSetup && (
            <Alert variant="info" className="mb-4">
              <p>{ARCHIVED_STUDY_CANNOT_EDIT_MESSAGE}</p>
            </Alert>
          )}
          <Alert variant="warning">
            No variables found. Please complete step 4 (Debug + approve extraction) first to extract
            variables from your pilot data.
          </Alert>
        </>
      )
    }

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
      <>
        {!canEditSetup && (
          <Alert variant="info" className="mb-4">
            <p>{ARCHIVED_STUDY_CANNOT_EDIT_MESSAGE}</p>
          </Alert>
        )}

        <Card
          title="How to create your codebook?"
          collapsible
          bgColor="bg-base-100"
          className="mb-6"
        >
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>
              Describe each variable in your dataset. You cannot complete this step without
              descriptions for all variables.
            </li>
            <li>
              If multiple variables share a common path (e.g. all items in a rating matrix), use{" "}
              <strong>Create Group</strong> to annotate them together with one description.
            </li>
            <li>
              Mark any variables containing <strong>personal data</strong>. These will be excluded
              from the feedback template (Step 6) to protect participant privacy.
            </li>
            <li>
              You can <strong>save and continue later</strong> at any time.
            </li>
          </ol>
        </Card>

        {/* Save badge + button */}
        <div className="flex items-center justify-between mb-4">
          {showSavedBadge ? (
            <span className="badge badge-success">✓ Codebook saved</span>
          ) : (
            <span className="badge badge-warning">⚠ Codebook not saved</span>
          )}
          <AsyncButton
            onClick={handleSave}
            loadingText="Saving"
            disabled={isSaving}
            className="btn btn-sm btn-primary"
          >
            {isSaving ? "Saving..." : "Save Codebook"}
          </AsyncButton>
        </div>

        {/* Validation alerts */}
        {showInvalidKeys && (
          <Alert variant="warning">
            <div className="space-y-2">
              <p>
                This codebook no longer matches the latest extraction. Please review and save the
                codebook again to complete Step 5.
              </p>
              {missingKeys.length > 0 && (
                <div>
                  <div className="font-semibold">Missing keys</div>
                  <div className="text-sm">{missingKeys.join(", ")}</div>
                </div>
              )}
              {extraKeys.length > 0 && (
                <div>
                  <div className="font-semibold">Additional keys</div>
                  <div className="text-sm">{extraKeys.join(", ")}</div>
                </div>
              )}
            </div>
          </Alert>
        )}
        {showSoftWarning && (
          <Alert variant="info">
            A new extraction was approved for this study version. The variables match your existing
            codebook, but we recommend reviewing it again.
          </Alert>
        )}

        {/* "Create Group" banner */}
        {candidateGroups.length > 0 && (
          <div className="alert alert-info mb-4 flex items-center justify-between">
            <span className="text-sm">
              {candidateGroups.length === 1
                ? "1 groupable variable prefix detected."
                : `${candidateGroups.length} groupable variable prefixes detected.`}{" "}
              Group related variables to annotate them together.
            </span>
            <button className="btn btn-sm btn-primary" onClick={() => setShowGroupModal(true)}>
              Create Group
            </button>
          </div>
        )}

        <div className="mb-6 space-y-4">
          {/* Group cards */}
          {groups.map((group) => {
            const childVars = variables.filter(
              (v) => findWinningGroupKey(v.dslKey, groupKeys) === group.groupKey
            )
            return (
              <div key={group.groupKey} className="card bg-base-200 p-4 border border-primary/20">
                {/* Group header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <button
                      className="btn btn-xs btn-ghost px-1"
                      onClick={() => toggleGroupCollapse(group.groupKey)}
                      aria-label={group.collapsed ? "Expand group" : "Collapse group"}
                    >
                      {group.collapsed ? "▶" : "▼"}
                    </button>
                    <h3 className="font-semibold text-lg">{group.groupKey}</h3>
                    <span className="badge badge-neutral badge-sm">
                      {childVars.length} variable{childVars.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="label cursor-pointer gap-2 p-0">
                      <span className="label-text text-sm">Personal data</span>
                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary checkbox-sm"
                        checked={group.personalData}
                        onChange={(e) =>
                          updateGroup(group.groupKey, "personalData", e.target.checked)
                        }
                      />
                    </label>
                    <button
                      className="btn btn-xs btn-ghost text-error"
                      onClick={() => removeGroup(group.groupKey)}
                    >
                      Ungroup
                    </button>
                  </div>
                </div>

                {/* Group description */}
                <Textarea
                  label="Group description *"
                  className="w-full"
                  rows={3}
                  placeholder="Describe what these variables measure or represent..."
                  value={group.description}
                  onChange={(e) => updateGroup(group.groupKey, "description", e.target.value)}
                />

                {/* Child variable list (collapsed by default) */}
                {!group.collapsed && (
                  <div className="mt-3">
                    <p className="text-xs text-base-content/50 mb-2">Variables in this group:</p>
                    <div className="flex flex-wrap gap-1">
                      {childVars.map((v) => (
                        <span key={v.id} className="badge badge-ghost badge-sm">
                          {v.variableName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Ungrouped variable cards */}
          {ungroupedVariables.map((variable) => (
            <div key={variable.id} className="card bg-base-200 p-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{variable.variableName}</h3>
                    <p className="text-xs text-base-content/50">Key: {variable.variableKey}</p>
                    {variable.type && (
                      <p className="text-sm text-base-content/70">Type: {variable.type}</p>
                    )}
                    {variable.examples.length > 0 && (
                      <p className="text-sm text-base-content/70">
                        Example: <code className="text-xs">{variable.examples[0]?.value}</code>
                      </p>
                    )}
                  </div>
                  <label className="label cursor-pointer gap-2">
                    <span className="label-text text-sm">Personal data</span>
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary"
                      checked={variable.personalData}
                      onChange={(e) =>
                        updateVariable(variable.id, "personalData", e.target.checked)
                      }
                    />
                  </label>
                </div>

                <Textarea
                  label="Description *"
                  className="w-full"
                  rows={3}
                  placeholder="Describe what this variable measures or represents..."
                  value={variable.description ?? ""}
                  onChange={(e) => updateVariable(variable.id, "description", e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Create Group modal */}
        {showGroupModal && (
          <div className="modal modal-open">
            <div className="modal-box max-w-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Create Variable Group</h3>
                <button
                  className="btn btn-sm btn-circle btn-ghost"
                  onClick={() => {
                    setShowGroupModal(false)
                    setPendingGroupPrefix("")
                  }}
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label">
                    <span className="label-text">Group prefix</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={pendingGroupPrefix}
                    onChange={(e) => setPendingGroupPrefix(e.target.value)}
                  >
                    <option value="">Select a prefix...</option>
                    {candidateGroups.map(({ prefix, count }) => (
                      <option key={prefix} value={prefix}>
                        {prefix} ({count} variable{count !== 1 ? "s" : ""})
                      </option>
                    ))}
                  </select>
                </div>

                {pendingGroupPrefix && (
                  <div>
                    <p className="text-xs text-base-content/50 mb-2">
                      Variables that will be grouped:
                    </p>
                    <ul className="space-y-1">
                      {variables
                        .filter((v) => v.dslKey.startsWith(pendingGroupPrefix + "."))
                        .map((v) => (
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

              <div className="modal-action">
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setShowGroupModal(false)
                    setPendingGroupPrefix("")
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  disabled={!pendingGroupPrefix}
                  onClick={handleCreateGroup}
                >
                  Create Group
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }
)

CodebookContent.displayName = "CodebookContent"

export default CodebookContent
