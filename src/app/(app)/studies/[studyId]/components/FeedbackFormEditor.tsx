"use client"

import { useState, useEffect, useImperativeHandle, forwardRef, useCallback } from "react"
import { useMemo } from "react"
import { useMutation } from "@blitzjs/rpc"
import { toast } from "react-hot-toast"
import MDEditor from "@uiw/react-md-editor"
import VariableSelector from "./VariableSelector"
import StatsSelector from "./StatsSelector"
import ConditionalBuilder from "./ConditionalBuilder"
import DSLHelper from "./DSLHelper"
import { EnrichedJatosStudyResult } from "@/src/types/jatos"
import createFeedbackTemplate from "../../mutations/createFeedbackTemplate"
import updateFeedbackTemplate from "../../mutations/updateFeedbackTemplate"
import syncStudyVariables from "../../mutations/syncStudyVariables"
import { renderTemplate } from "../../utils/feedbackRenderer"
import { validateDSL, DSLError } from "../../utils/dslValidator"

interface FeedbackFormEditorProps {
  enrichedResult: EnrichedJatosStudyResult
  initialTemplate?: {
    id: number
    content: string
    createdAt: Date
    updatedAt: Date
  } | null
  studyId: number
  onTemplateSaved?: () => void
}

export interface FeedbackFormEditorRef {
  saveTemplate: () => Promise<void>
  isTemplateSaved: () => boolean
}

const FeedbackFormEditor = forwardRef<FeedbackFormEditorRef, FeedbackFormEditorProps>(
  ({ enrichedResult, initialTemplate, studyId, onTemplateSaved }, ref) => {
    const [markdown, setMarkdown] = useState(
      "## Feedback Form\nWrite your feedback message here..."
    )
    const [saving, setSaving] = useState(false)
    const [templateSaved, setTemplateSaved] = useState(false)
    const [showConditionalBuilder, setShowConditionalBuilder] = useState(false)
    const [dslErrors, setDslErrors] = useState<DSLError[]>([])
    const [showErrors, setShowErrors] = useState(false)

    const [createTemplate] = useMutation(createFeedbackTemplate)
    const [updateTemplate] = useMutation(updateFeedbackTemplate)
    const [syncVariables] = useMutation(syncStudyVariables)

    // Load initial template if it exists
    useEffect(() => {
      if (initialTemplate) {
        setMarkdown(initialTemplate.content)
        setTemplateSaved(true) // Template already exists, so it's "saved"
      }
    }, [initialTemplate])

    // Validate DSL syntax when markdown changes
    useEffect(() => {
      const validationResult = validateDSL(markdown, enrichedResult)
      setDslErrors(validationResult.errors)

      // Auto-show errors if there are any
      if (validationResult.errors.length > 0) {
        setShowErrors(true)
      }
    }, [markdown, enrichedResult])

    const handleInsertVariable = (variableSyntax: string) => {
      setMarkdown((prev) => prev + ` ${variableSyntax}`)
      setTemplateSaved(false) // Mark as unsaved when content changes
    }

    const handleInsertStat = (statExpression: string) => {
      setMarkdown((prev) => prev + ` ${statExpression}`)
      setTemplateSaved(false) // Mark as unsaved when content changes
    }

    const handleInsertConditional = (conditionalBlock: string) => {
      setMarkdown((prev) => prev + `\n\n${conditionalBlock}\n`)
      setTemplateSaved(false)
    }

    // Extract variables from enriched result (reuse logic from VariableSelector)
    const extractVariablesFromResult = (enrichedResult: EnrichedJatosStudyResult) => {
      const variableMap = new Map<
        string,
        { variableName: string; exampleValue: string; type: string }
      >()

      const excludedFields = new Set([
        "trial_type",
        "trial_index",
        "time_elapsed",
        "internal_node_id",
        "success",
        "timeout",
        "failed_images",
        "failed_audio",
        "failed_video",
      ])

      enrichedResult.componentResults.forEach((component) => {
        const data = component.parsedData ?? null
        if (!data) return

        if (Array.isArray(data)) {
          data.forEach((trial) => {
            if (typeof trial === "object" && trial !== null) {
              Object.entries(trial).forEach(([key, value]) => {
                if (excludedFields.has(key)) return
                if (!variableMap.has(key)) {
                  variableMap.set(key, {
                    variableName: key,
                    exampleValue: typeof value === "object" ? JSON.stringify(value) : String(value),
                    type: Array.isArray(value)
                      ? "array"
                      : typeof value === "object"
                      ? "object"
                      : "primitive",
                  })
                }
              })
            }
          })
        } else if (typeof data === "object") {
          Object.entries(data).forEach(([key, value]) => {
            if (excludedFields.has(key)) return
            variableMap.set(key, {
              variableName: key,
              exampleValue: typeof value === "object" ? JSON.stringify(value) : String(value),
              type: Array.isArray(value)
                ? "array"
                : typeof value === "object"
                ? "object"
                : "primitive",
            })
          })
        }
      })

      return Array.from(variableMap.values())
    }

    const handleSave = useCallback(async () => {
      if (!markdown.trim()) {
        toast.error("Please enter some content for your feedback template")
        return
      }

      setSaving(true)
      try {
        if (initialTemplate) {
          // Update existing template
          await updateTemplate({
            id: initialTemplate.id,
            content: markdown.trim(),
          })
          toast.success("Feedback template updated successfully!")
        } else {
          // Create new template
          await createTemplate({
            studyId,
            content: markdown.trim(),
          })
          toast.success("Feedback template created successfully!")
        }

        // Sync variables to database
        const variables = extractVariablesFromResult(enrichedResult)
        await syncVariables({
          studyId,
          variables: variables.map((v) => ({
            name: v.variableName,
            label: v.variableName,
            type: v.type,
            example: v.exampleValue,
          })),
        })

        // Mark as saved and call the callback to refresh the page state
        setTemplateSaved(true)
        onTemplateSaved?.()
      } catch (error: any) {
        console.error("Error saving template:", error)
        toast.error("Failed to save feedback template")
      } finally {
        setSaving(false)
      }
    }, [
      markdown,
      initialTemplate,
      updateTemplate,
      createTemplate,
      studyId,
      enrichedResult,
      syncVariables,
      onTemplateSaved,
    ])

    // Expose methods to parent component
    useImperativeHandle(
      ref,
      () => ({
        saveTemplate: async () => {
          await handleSave()
        },
        isTemplateSaved: () => templateSaved,
      }),
      [templateSaved, handleSave]
    )

    // Client-side rendering for live preview
    const renderedPreview = useMemo(() => {
      try {
        return renderTemplate(markdown, { enrichedResult })
      } catch (e) {
        console.error("Preview render error:", e)
        return markdown // fallback to raw markdown
      }
    }, [markdown, enrichedResult])

    return (
      <div className="card bg-base-200 shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="card-title text-lg">Participant Feedback Form</h2>
            {templateSaved ? (
              <span className="badge badge-success">✓ Template saved</span>
            ) : (
              <span className="badge badge-warning">⚠ Template not saved</span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <VariableSelector
              enrichedResult={enrichedResult}
              onInsert={handleInsertVariable}
              markdown={markdown}
            />
            <StatsSelector
              enrichedResult={enrichedResult}
              onInsert={handleInsertStat}
              markdown={markdown}
            />
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setShowConditionalBuilder(true)}
            >
              Add Condition
            </button>
          </div>
        </div>

        {/* Error Display */}
        {dslErrors.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-error">DSL Errors</h3>
              <button className="btn btn-sm btn-ghost" onClick={() => setShowErrors(!showErrors)}>
                {showErrors ? "Hide" : "Show"} ({dslErrors.length})
              </button>
            </div>
            {showErrors && (
              <div className="space-y-2">
                {dslErrors.map((error, index) => (
                  <div key={index} className="alert alert-error">
                    <div>
                      <div className="font-bold">{error.type.toUpperCase()} Error</div>
                      <div className="text-sm">{error.message}</div>
                      <div className="text-xs opacity-75">
                        Position: {error.start}-{error.end}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Markdown editor */}
        <div data-color-mode="light" className="rounded-lg overflow-hidden border border-base-300">
          <MDEditor
            value={markdown}
            onChange={(value) => setMarkdown(value || "")}
            height={300}
            preview="edit"
          />
        </div>

        {/* DSL Helper */}
        <DSLHelper enrichedResult={enrichedResult} />

        {/* Preview */}
        <div className="divider">Preview</div>
        <div className="prose max-w-none bg-base-100 p-4 rounded-lg border border-base-300">
          <MDEditor.Markdown source={renderedPreview} />
        </div>

        {/* Save button */}
        <div className="mt-4 flex justify-end">
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : initialTemplate ? "Update Template" : "Save Template"}
          </button>
        </div>

        {/* Modals */}
        {showConditionalBuilder && (
          <ConditionalBuilder
            enrichedResult={enrichedResult}
            onInsert={handleInsertConditional}
            onClose={() => setShowConditionalBuilder(false)}
          />
        )}
      </div>
    )
  }
)

FeedbackFormEditor.displayName = "FeedbackFormEditor"

export default FeedbackFormEditor
