"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@blitzjs/rpc"
import { toast } from "react-hot-toast"

import updateVariableCodebook from "../../mutations/updateVariableCodebook"
import StepNavigation from "../../../setup/components/client/StepNavigation"
import { Alert } from "@/src/app/components/Alert"
import { AsyncButton } from "@/src/app/components/AsyncButton"

interface VariableCodebookEntry {
  id: number
  variableKey: string
  variableName: string
  type: string | null
  examples: Array<{ value: string; sourcePath: string }>
  description: string | null
  personalData: boolean
}

import { StudyWithRelations } from "@/src/app/(app)/studies/queries/getStudy"

interface CodebookContentProps {
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
    validationStatus?: "NEEDS_REVIEW" | "VALID" | "INVALID" | null
    validatedExtractionId?: number | null
    validatedAt?: Date | string | null
    missingKeys?: string[] | null
    extraKeys?: string[] | null
    updatedAt?: Date | string
  } | null
  approvedExtractionId: number | null
  approvedExtractionApprovedAt: Date | string | null
  study: StudyWithRelations
}

export default function CodebookContent({
  initialVariables,
  codebook,
  approvedExtractionId,
  approvedExtractionApprovedAt,
  study,
}: CodebookContentProps) {
  const router = useRouter()
  // const { study, studyId } = useStudySetup() // Removed context
  const studyId = study.id
  const step5Completed = study.latestJatosStudyUpload?.step5Completed ?? false
  const [variables, setVariables] = useState<VariableCodebookEntry[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [updateVariableCodebookMutation] = useMutation(updateVariableCodebook)

  const missingKeys = Array.isArray(codebook?.missingKeys)
    ? (codebook?.missingKeys as string[])
    : []
  const extraKeys = Array.isArray(codebook?.extraKeys) ? (codebook?.extraKeys as string[]) : []
  const validationStatus = codebook?.validationStatus ?? null
  const validatedExtractionId = codebook?.validatedExtractionId ?? null
  const codebookUpdatedAt = codebook?.updatedAt ? new Date(codebook.updatedAt) : null
  const approvedExtractionAt = approvedExtractionApprovedAt
    ? new Date(approvedExtractionApprovedAt)
    : null
  const showInvalidKeys =
    validationStatus === "INVALID" && (missingKeys.length > 0 || extraKeys.length > 0)
  const showSoftWarning =
    validationStatus === "VALID" &&
    approvedExtractionId !== null &&
    validatedExtractionId === approvedExtractionId &&
    approvedExtractionAt !== null &&
    codebookUpdatedAt !== null &&
    codebookUpdatedAt < approvedExtractionAt

  useEffect(() => {
    setVariables(
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
  }, [initialVariables])

  const updateVariable = (
    id: number,
    field: keyof VariableCodebookEntry,
    value: string | boolean
  ) => {
    setVariables((prev) => prev.map((v) => (v.id === id ? { ...v, [field]: value } : v)))
  }

  const handleSave = async (): Promise<boolean> => {
    if (variables.length === 0) {
      toast.error("No variables found. Please complete step 4 first.")
      return false
    }

    // Validation removed to allow partial saves
    // The "Next" button logic (in StepNavigation below) handles the requirement for completion.

    setIsSaving(true)
    try {
      await updateVariableCodebookMutation({
        studyId,
        variables: variables.map((v) => ({
          variableKey: v.variableKey,
          variableName: v.variableName,
          description: v.description,
          personalData: v.personalData,
        })),
      })
      toast.success("Codebook saved successfully!")
      router.refresh()
      return true
    } catch (error: any) {
      toast.error(error.message || "Failed to save codebook")
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const handleNext = async () => {
    const success = await handleSave()
    if (success) {
      router.push(`/studies/${studyId}/setup/step6`)
    }
  }

  if (variables.length === 0) {
    return (
      <Alert variant="warning">
        No variables found. Please complete step 4 (Debug + approve extraction) first to extract
        variables from your pilot data.
      </Alert>
    )
  }

  const hasMissingDescriptions = variables.some(
    (v) => !v.description || v.description.trim() === ""
  )

  return (
    <>
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
        <p className="text-sm text-base-content/70 mb-4">
          Please provide a description for each variable in your data to create a codebook. Mark
          variables that contain or may contain personal data of participants.
        </p>

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

                <div>
                  <label className="label">
                    <span className="label-text font-medium">Description *</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered w-full"
                    rows={3}
                    placeholder="Describe what this variable measures or represents..."
                    value={variable.description ?? ""}
                    onChange={(e) => updateVariable(variable.id, "description", e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <AsyncButton
          onClick={handleSave}
          loadingText="Saving..."
          disabled={isSaving}
          className="btn btn-primary"
        >
          Save Codebook
        </AsyncButton>
      </div>

      <StepNavigation
        studyId={studyId}
        prev="step4"
        next="step6"
        onNext={handleNext}
        disableNext={hasMissingDescriptions}
        nextTooltip={
          hasMissingDescriptions ? "Please add descriptions for all variables" : undefined
        }
      />
    </>
  )
}
