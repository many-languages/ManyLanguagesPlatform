"use client"

import { forwardRef, useEffect, useImperativeHandle, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@blitzjs/rpc"
import { toast } from "react-hot-toast"

import updateVariableCodebook from "../mutations/updateVariableCodebook"
import type { UpdateVariableCodebookResult } from "../server/updateVariableCodebook"
import { CODEBOOK_SAVE_FEEDBACK_PERSONAL_DATA_HINT } from "../domain/codebookSaveMessages"
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
  type: string | null
  examples: Array<{ value: string; sourcePath: string }>
  description: string | null
  personalData: boolean
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
    type: string | null
    examples: Array<{ value: string; sourcePath: string }> | null
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
        type: v.type,
        examples: v.examples ?? [],
        description: v.description ?? "",
        personalData: v.personalData ?? false,
      }))
    )
    const [isSaving, setIsSaving] = useState(false)
    const [updateVariableCodebookMutation] = useMutation(updateVariableCodebook)
    const [codebookSaved, setCodebookSaved] = useState(true)

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

    const updateVariable = (
      id: number,
      field: keyof VariableCodebookEntry,
      value: string | boolean
    ) => {
      setVariables((prev) => prev.map((v) => (v.id === id ? { ...v, [field]: value } : v)))
      setCodebookSaved(false)
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
            description: v.description,
            personalData: v.personalData,
          })),
        })) as UpdateVariableCodebookResult
        toast.success("Codebook saved successfully!")
        if (result.feedbackPersonalDataConflict) {
          toast(CODEBOOK_SAVE_FEEDBACK_PERSONAL_DATA_HINT, { duration: 7000 })
        }
        setCodebookSaved(true)
        router.refresh()
        return true
      } catch (error: any) {
        toast.error(error.message || "Failed to save codebook")
        return false
      } finally {
        setIsSaving(false)
      }
    }

    const hasMissingDescriptions = variables.some(
      (v) => !v.description || v.description.trim() === ""
    )

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

    const hasAnyDescription = variables.some((v) => (v.description ?? "").trim() !== "")
    const showSavedBadge = codebookSaved && hasAnyDescription

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
              Mark any variables containing <strong>personal data</strong>. These will be excluded
              from the feedback template (Step 6) to protect participant privacy.
            </li>
            <li>
              You can <strong>save and continue later</strong> at any time.
            </li>
          </ol>
        </Card>

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
        <div className="mb-6">
          <div className="space-y-4">
            {variables.map((variable) => (
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
        </div>
      </>
    )
  }
)

CodebookContent.displayName = "CodebookContent"

export default CodebookContent
