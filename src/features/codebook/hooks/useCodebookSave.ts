"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@blitzjs/rpc"
import { toast } from "react-hot-toast"

import updateVariableCodebook from "../mutations/updateVariableCodebook"
import { CODEBOOK_SAVE_FEEDBACK_PERSONAL_DATA_HINT } from "../domain/codebookSaveMessages"
import { ARCHIVED_STUDY_CANNOT_EDIT_MESSAGE } from "@/src/features/studies/domain/studyEditability"
import type {
  CodebookGroupEntry,
  UpdateVariableCodebookResult,
  VariableCodebookEntry,
} from "../types"

export interface UseCodebookSaveOptions {
  studyId: number
  variables: VariableCodebookEntry[]
  groups: CodebookGroupEntry[]
  canEditSetup: boolean
  onSaved: () => void
}

export function useCodebookSave({
  studyId,
  variables,
  groups,
  canEditSetup,
  onSaved,
}: UseCodebookSaveOptions) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [updateVariableCodebookMutation] = useMutation(updateVariableCodebook)

  const saveCodebook = useCallback(async (): Promise<boolean> => {
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
      onSaved()
      router.refresh()
      return true
    } catch (error: unknown) {
      console.error("[useCodebookSave] Failed to save codebook:", error)
      toast.error(error instanceof Error ? error.message : "Failed to save codebook")
      return false
    } finally {
      setIsSaving(false)
    }
  }, [canEditSetup, groups, onSaved, router, studyId, updateVariableCodebookMutation, variables])

  return { isSaving, saveCodebook }
}
