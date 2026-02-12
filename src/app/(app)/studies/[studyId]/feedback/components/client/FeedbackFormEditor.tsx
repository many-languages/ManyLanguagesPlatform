"use client"

import {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useRef,
  useMemo,
  useCallback,
} from "react"
import MDEditor from "@uiw/react-md-editor"
import VariableSelector from "./VariableSelector"
import StatsSelector from "./StatsSelector"
import ConditionalBuilder from "./ConditionalBuilder"
import DSLHelper from "./DSLHelper"
import { useFeedbackTemplate } from "../../hooks/useFeedbackTemplate"
import { useTemplatePreview } from "../../hooks/useTemplatePreview"
import { validateDSL, DSLError } from "../../utils/dslValidator"
import { toast } from "react-hot-toast"
import type { FeedbackFormEditorProps, FeedbackFormEditorRef } from "../../types"
import { buildPreviewContextFromBundle } from "../../utils/previewContext"
import { buildRequiredKeysHash, extractRequiredVariableNames } from "../../utils/requiredKeys"
import { mdEditorStyles, mdEditorClassName } from "../../styles/feedbackStyles"

const FeedbackFormEditor = forwardRef<FeedbackFormEditorRef, FeedbackFormEditorProps>(
  (
    {
      initialTemplate,
      studyId,
      onTemplateSaved,
      onValidationChange,
      allPilotResults,
      variables,
      extractionBundle,
      hiddenVariables,
    },
    ref
  ) => {
    const [markdown, setMarkdown] = useState(
      "## Feedback Form\nWrite your feedback message here..."
    )
    const [showConditionalBuilder, setShowConditionalBuilder] = useState(false)
    const [dslErrors, setDslErrors] = useState<DSLError[]>([])
    const [showErrors, setShowErrors] = useState(false)

    const { saveTemplate, saving, templateSaved, setTemplateSaved } = useFeedbackTemplate({
      studyId,
      initialTemplate,
      onSuccess: onTemplateSaved,
    })

    // Load initial template if it exists
    useEffect(() => {
      if (initialTemplate) {
        setMarkdown(initialTemplate.content)
        setTemplateSaved(true) // Template already exists, so it's "saved"
      }
    }, [initialTemplate, setTemplateSaved])

    const [debouncedMarkdown, setDebouncedMarkdown] = useState(markdown)

    useEffect(() => {
      const timeoutId = setTimeout(() => setDebouncedMarkdown(markdown), 250)
      return () => clearTimeout(timeoutId)
    }, [markdown])

    // Validate DSL syntax when markdown changes
    useEffect(() => {
      const validationResult = validateDSL(
        debouncedMarkdown,
        variables,
        new Set(hiddenVariables ?? [])
      )
      setDslErrors(validationResult.errors)
      onValidationChange?.(validationResult.isValid)

      // Auto-show errors if there are any
      if (validationResult.errors.length > 0) {
        setShowErrors(true)
      }
    }, [debouncedMarkdown, variables, hiddenVariables, onValidationChange])

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

    const handleSave = useCallback(async (): Promise<boolean> => {
      if (dslErrors.length > 0) {
        toast.error("Cannot save template with validation errors. Please fix them first.")
        setShowErrors(true)
        return false
      }

      await saveTemplate(markdown)
      return true
    }, [dslErrors, saveTemplate, markdown])

    // Expose methods to parent component
    useImperativeHandle(
      ref,
      () => ({
        saveTemplate: async () => {
          return await handleSave()
        },
        isTemplateSaved: () => templateSaved,
      }),
      [templateSaved, handleSave]
    )

    // Check if template uses "across" scope
    const usesAcrossScope = useMemo(() => {
      return /stat:[^}]+:across/.test(markdown)
    }, [markdown])

    const requiredVariableNames = useMemo(
      () => extractRequiredVariableNames(debouncedMarkdown),
      [debouncedMarkdown]
    )

    // Filter variables to only include those that are allowed (passed in props)
    // This prevents personal data from being shown in the preview even if the template references it
    const effectiveVariableNames = useMemo(() => {
      const allowedNames = new Set(variables.map((v) => v.variableName))
      return requiredVariableNames.filter((name) => allowedNames.has(name))
    }, [requiredVariableNames, variables])

    const requiredKeysHash = useMemo(
      () => buildRequiredKeysHash(effectiveVariableNames),
      [effectiveVariableNames]
    )

    const contextCacheRef = useRef(
      new Map<string, ReturnType<typeof buildPreviewContextFromBundle>>()
    )

    const previewContext = useMemo(() => {
      if (!extractionBundle) return null
      const cached = contextCacheRef.current.get(requiredKeysHash)
      if (cached) return cached
      const built = buildPreviewContextFromBundle(extractionBundle, effectiveVariableNames)
      contextCacheRef.current.set(requiredKeysHash, built)
      return built
    }, [extractionBundle, requiredKeysHash, effectiveVariableNames])

    // Client-side rendering for live preview
    const renderedPreview = useTemplatePreview({
      template: debouncedMarkdown,
      context: previewContext,
    })

    return (
      <>
        <div className="flex items-center justify-between mb-4">
          {templateSaved ? (
            <span className="badge badge-success">✓ Template saved</span>
          ) : (
            <span className="badge badge-warning">⚠ Template not saved</span>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <VariableSelector
              variables={variables}
              onInsert={handleInsertVariable}
              markdown={markdown}
            />
            <StatsSelector variables={variables} onInsert={handleInsertStat} markdown={markdown} />
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setShowConditionalBuilder(true)}
            >
              Add Condition
            </button>
            <div
              className="tooltip tooltip-bottom"
              data-tip={
                dslErrors.length > 0 ? "Please fix validation errors before saving" : undefined
              }
            >
              <button
                className="btn btn-sm btn-primary"
                onClick={() => handleSave()}
                disabled={saving || dslErrors.length > 0}
              >
                {saving ? "Saving..." : initialTemplate ? "Update" : "Save"}
              </button>
            </div>
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
              <h3 className="font-bold">Using &quot;Across All Results&quot; Statistics</h3>
              <div className="text-sm">
                This template uses statistics calculated across all participants. In the preview
                above, we&apos;re using all pilot results ({allPilotResults?.length || 0} result
                {allPilotResults?.length !== 1 ? "s" : ""}). In actual participant feedback, it will
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
          className={`rounded-lg overflow-hidden border border-base-300 !bg-base-300 ${mdEditorClassName.container}`}
        >
          <MDEditor
            value={markdown}
            onChange={(value) => {
              setMarkdown(value || "")
              setTemplateSaved(false)
            }}
            height={300}
            preview="edit"
            style={{ ...mdEditorStyles.container, backgroundColor: "hsl(var(--b3))" }}
            textareaProps={{
              style: { ...mdEditorStyles.textarea, backgroundColor: "hsl(var(--b3))" },
            }}
          />
        </div>

        {/* DSL Helper */}
        <DSLHelper variables={variables} />

        {/* Preview */}
        <div className="divider">Preview</div>
        <div
          className={`prose max-w-none !bg-base-300 p-4 rounded-lg border border-base-300 ${mdEditorClassName.preview}`}
        >
          <MDEditor.Markdown
            source={renderedPreview}
            style={{ ...mdEditorStyles.preview, backgroundColor: "hsl(var(--b3))" }}
          />
        </div>

        {/* Modals */}
        {showConditionalBuilder && (
          <ConditionalBuilder
            variables={variables}
            onInsert={handleInsertConditional}
            onClose={() => setShowConditionalBuilder(false)}
          />
        )}
      </>
    )
  }
)

FeedbackFormEditor.displayName = "FeedbackFormEditor"

export default FeedbackFormEditor
