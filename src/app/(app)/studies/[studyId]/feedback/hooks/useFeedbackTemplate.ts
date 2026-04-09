"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import { saveFeedbackTemplateAction } from "../actions/saveFeedbackTemplate"
import type { FeedbackTemplateEditorInitial } from "../types"
import { mapFeedbackTemplateSaveErrorToUserMessage } from "../utils/mapFeedbackTemplateSaveErrorToUserMessage"

export interface UseFeedbackTemplateOptions {
  studyId: number
  initialTemplate?: FeedbackTemplateEditorInitial | null
  onSuccess?: () => void
}

export function useFeedbackTemplate(options: UseFeedbackTemplateOptions) {
  const { studyId, initialTemplate, onSuccess } = options
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [templateSaved, setTemplateSaved] = useState(!!initialTemplate)

  const saveTemplate = useCallback(
    async (
      content: string,
      saveOptions?: { silentSuccessToast?: boolean }
    ): Promise<{ ok: false } | { ok: true; setupComplete: boolean }> => {
      if (!content.trim()) {
        toast.error("Please enter some content for your feedback template")
        return { ok: false }
      }

      setSaving(true)
      try {
        const result = await saveFeedbackTemplateAction({
          studyId,
          content,
          initialTemplate,
        })

        if (!result.ok) {
          toast.error(result.userMessage)
          return { ok: false }
        }

        if (!saveOptions?.silentSuccessToast) {
          toast.success(
            initialTemplate
              ? "Feedback template updated successfully!"
              : "Feedback template created successfully!"
          )
        }

        setTemplateSaved(true)
        router.refresh()
        onSuccess?.()
        return { ok: true, setupComplete: result.setupComplete }
      } catch (error: unknown) {
        console.error("Error saving template:", error)
        toast.error(mapFeedbackTemplateSaveErrorToUserMessage(error))
        return { ok: false }
      } finally {
        setSaving(false)
      }
    },
    [studyId, initialTemplate, router, onSuccess]
  )

  return {
    saveTemplate,
    saving,
    templateSaved,
    setTemplateSaved,
  }
}
