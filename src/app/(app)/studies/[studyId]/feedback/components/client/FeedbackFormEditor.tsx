"use client"

import { useState, useEffect, useImperativeHandle, forwardRef } from "react"
import { useMemo } from "react"
import MDEditor from "@uiw/react-md-editor"
import VariableSelector from "./VariableSelector"
import StatsSelector from "./StatsSelector"
import ConditionalBuilder from "./ConditionalBuilder"
import DSLHelper from "./DSLHelper"
import { useFeedbackTemplate } from "../../hooks/useFeedbackTemplate"
import { useTemplatePreview } from "../../hooks/useTemplatePreview"
import { validateDSL, DSLError } from "../../utils/dslValidator"
import type { FeedbackFormEditorProps, FeedbackFormEditorRef } from "../../types"
import { mdEditorStyles, mdEditorClassName } from "../../styles/feedbackStyles"

const FeedbackFormEditor = forwardRef<FeedbackFormEditorRef, FeedbackFormEditorProps>(
  ({ enrichedResult, initialTemplate, studyId, onTemplateSaved, allTestResults }, ref) => {
    const [markdown, setMarkdown] = useState(
      "## Feedback Form\nWrite your feedback message here..."
    )
    const [showConditionalBuilder, setShowConditionalBuilder] = useState(false)
    const [dslErrors, setDslErrors] = useState<DSLError[]>([])
    const [showErrors, setShowErrors] = useState(false)

    const { saveTemplate, saving, templateSaved, setTemplateSaved } = useFeedbackTemplate({
      studyId,
      enrichedResult,
      initialTemplate,
      onSuccess: onTemplateSaved,
    })

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

    const handleSave = async () => {
      await saveTemplate(markdown)
    }

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

    // Check if template uses "across" scope
    const usesAcrossScope = useMemo(() => {
      return /stat:[^}]+:across/.test(markdown)
    }, [markdown])

    // Client-side rendering for live preview
    const renderedPreview = useTemplatePreview({
      template: markdown,
      enrichedResult,
      allEnrichedResults: allTestResults,
    })

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

        {/* Warning when using across scope */}
        {usesAcrossScope && (
          <div className="alert alert-warning mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <h3 className="font-bold">Using "Across All Results" Statistics</h3>
              <div className="text-sm">
                This template uses statistics calculated across all participants. In the preview
                above, we're using all "test" results ({allTestResults?.length || 0} result
                {allTestResults?.length !== 1 ? "s" : ""}). In actual participant feedback, it will
                use all participant results from the study.
              </div>
            </div>
          </div>
        )}

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
        <div
          data-color-mode="light"
          className={`rounded-lg overflow-hidden border border-base-300 ${mdEditorClassName.container}`}
        >
          <MDEditor
            value={markdown}
            onChange={(value) => {
              setMarkdown(value || "")
              setTemplateSaved(false)
            }}
            height={300}
            preview="edit"
            style={mdEditorStyles.container}
            textareaProps={{
              style: mdEditorStyles.textarea,
            }}
          />
        </div>

        {/* DSL Helper */}
        <DSLHelper enrichedResult={enrichedResult} />

        {/* Preview */}
        <div className="divider">Preview</div>
        <div
          className={`prose max-w-none bg-base-100 p-4 rounded-lg border border-base-300 ${mdEditorClassName.preview}`}
        >
          <MDEditor.Markdown source={renderedPreview} style={mdEditorStyles.preview} />
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
