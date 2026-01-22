"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import { saveFeedbackTemplateAction } from "../actions/saveFeedbackTemplate"

export interface UseFeedbackTemplateOptions {
  studyId: number
  initialTemplate?: { id: number; content: string } | null
  onSuccess?: () => void
}

export function useFeedbackTemplate(options: UseFeedbackTemplateOptions) {
  const { studyId, initialTemplate, onSuccess } = options
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [templateSaved, setTemplateSaved] = useState(!!initialTemplate)

  const saveTemplate = useCallback(
    async (content: string) => {
      if (!content.trim()) {
        toast.error("Please enter some content for your feedback template")
        return
      }

      setSaving(true)
      try {
        await saveFeedbackTemplateAction({
          studyId,
          content,
          initialTemplate,
        })

        toast.success(
          initialTemplate
            ? "Feedback template updated successfully!"
            : "Feedback template created successfully!"
        )

        setTemplateSaved(true)
        router.refresh()
        onSuccess?.()
      } catch (error: any) {
        console.error("Error saving template:", error)
        toast.error(error?.message || "Failed to save feedback template")
        throw error
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
