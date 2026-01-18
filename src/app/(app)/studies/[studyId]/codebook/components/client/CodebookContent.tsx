"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@blitzjs/rpc"
import { toast } from "react-hot-toast"
import { useStudySetup } from "../../../setup/components/client/StudySetupProvider"
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
}

export default function CodebookContent({ initialVariables }: CodebookContentProps) {
  const router = useRouter()
  const { study, studyId } = useStudySetup()
  const [variables, setVariables] = useState<VariableCodebookEntry[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [updateVariableCodebookMutation] = useMutation(updateVariableCodebook)

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

  const handleSave = async () => {
    if (variables.length === 0) {
      toast.error("No variables found. Please complete step 3 first.")
      return
    }

    // Validate that all variables have descriptions
    const missingDescriptions = variables.filter(
      (v) => !v.description || v.description.trim() === ""
    )

    if (missingDescriptions.length > 0) {
      toast.error(
        `Please add descriptions for all variables. Missing: ${missingDescriptions
          .map((v) => v.variableName)
          .join(", ")}`
      )
      return
    }

    setIsSaving(true)
    try {
      await updateVariableCodebookMutation({
        studyId,
        variables: variables.map((v) => ({
          id: v.id,
          description: v.description,
          personalData: v.personalData,
        })),
      })
      toast.success("Codebook saved successfully!")
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to save codebook")
    } finally {
      setIsSaving(false)
    }
  }

  if (variables.length === 0) {
    return (
      <Alert variant="warning">
        No variables found. Please complete step 3 (Test run) first to extract variables from your
        test data.
      </Alert>
    )
  }

  return (
    <>
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
                    value={variable.description}
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
        prev="step3"
        next="step5"
        disableNext={
          !study.step4Completed ||
          variables.some((v) => !v.description || v.description.trim() === "")
        }
        nextTooltip={
          variables.some((v) => !v.description || v.description.trim() === "")
            ? "Please add descriptions for all variables and save before proceeding"
            : !study.step4Completed
            ? "Please save the codebook before proceeding"
            : undefined
        }
      />
    </>
  )
}
