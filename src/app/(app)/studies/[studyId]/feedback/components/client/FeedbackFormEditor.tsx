"use client"

import {
  useState,
  useEffect,
  useLayoutEffect,
  useImperativeHandle,
  forwardRef,
  useMemo,
  useRef,
  type MutableRefObject,
} from "react"
import MDEditor, { type RefMDEditor } from "@uiw/react-md-editor"
import VariableSelector from "./VariableSelector"
import StatsSelector from "./StatsSelector"
import ConditionalBuilder from "./ConditionalBuilder"
import DSLHelper from "./DSLHelper"
import { useFeedbackTemplate } from "../../hooks/useFeedbackTemplate"
import { validateDSL, DSLError } from "../../utils/dslValidator"
import { toast } from "react-hot-toast"
import type {
  FeedbackFormEditorProps,
  FeedbackFormEditorRef,
  SaveTemplateResult,
} from "../../types"
import { templateUsesStatAcross } from "@/src/lib/feedback/statAcrossKeys"
import { renderFeedbackPreviewAction } from "../../actions/renderFeedbackPreviewAction"
import { mdEditorStyles, mdEditorClassName } from "../../styles/feedbackStyles"

const DEFAULT_MARKDOWN = "## Feedback Form\nWrite your feedback message here..."

function syncSelectionRef(
  ref: MutableRefObject<{ start: number; end: number }>,
  textarea: HTMLTextAreaElement
) {
  ref.current = {
    start: textarea.selectionStart,
    end: textarea.selectionEnd,
  }
}

const FeedbackFormEditor = forwardRef<FeedbackFormEditorRef, FeedbackFormEditorProps>(
  (
    {
      initialTemplate,
      studyId,
      feedbackPreviewContextKey,
      onTemplateSaved,
      onValidationChange,
      withinStudyResultId,
      pilotResultCount,
      variables,
      hiddenVariables,
    },
    ref
  ) => {
    const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN)
    const [previewMarkdown, setPreviewMarkdown] = useState(markdown)
    /** Server preview failed; do not show raw template as if it were rendered output. */
    const [previewError, setPreviewError] = useState<string | null>(null)
    const [showConditionalBuilder, setShowConditionalBuilder] = useState(false)
    const [dslErrors, setDslErrors] = useState<DSLError[]>([])
    const [showErrors, setShowErrors] = useState(false)

    const mdEditorRef = useRef<RefMDEditor>(null)
    /** Last known textarea selection; used when inserting from toolbars (caret may be lost on blur). */
    const lastSelectionRef = useRef({
      start: DEFAULT_MARKDOWN.length,
      end: DEFAULT_MARKDOWN.length,
    })
    const pendingCursorRef = useRef<number | null>(null)

    const { saveTemplate, saving, templateSaved, setTemplateSaved } = useFeedbackTemplate({
      studyId,
      initialTemplate,
      onSuccess: onTemplateSaved,
    })

    // Load initial template if it exists
    useEffect(() => {
      if (initialTemplate) {
        const content = initialTemplate.content
        setMarkdown(content)
        setPreviewMarkdown(content)
        setTemplateSaved(true) // Template already exists, so it's "saved"
        const len = content.length
        lastSelectionRef.current = { start: len, end: len }
      }
    }, [initialTemplate])

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

    const insertAtSelection = (insertText: string) => {
      setMarkdown((prev) => {
        let { start, end } = lastSelectionRef.current
        start = Math.max(0, Math.min(start, prev.length))
        end = Math.max(start, Math.min(end, prev.length))
        const next = prev.slice(0, start) + insertText + prev.slice(end)
        const newPos = start + insertText.length
        lastSelectionRef.current = { start: newPos, end: newPos }
        pendingCursorRef.current = newPos
        return next
      })
      setTemplateSaved(false)
    }

    const handleInsertVariable = (variableSyntax: string) => {
      insertAtSelection(` ${variableSyntax}`)
    }

    const handleInsertStat = (statExpression: string) => {
      insertAtSelection(` ${statExpression}`)
    }

    const handleInsertConditional = (conditionalBlock: string) => {
      insertAtSelection(`\n\n${conditionalBlock}\n`)
    }

    useLayoutEffect(() => {
      if (pendingCursorRef.current === null) return
      const pos = pendingCursorRef.current
      pendingCursorRef.current = null
      const ta = mdEditorRef.current?.textarea
      if (!ta) return
      const safe = Math.max(0, Math.min(pos, markdown.length))
      requestAnimationFrame(() => {
        ta.focus()
        ta.setSelectionRange(safe, safe)
        lastSelectionRef.current = { start: safe, end: safe }
      })
    }, [markdown])

    const handleSave = async (options?: {
      silentSuccessToast?: boolean
    }): Promise<SaveTemplateResult> => {
      // Prevent saving if there are DSL errors
      if (dslErrors.length > 0) {
        toast.error("Cannot save template with validation errors. Please fix them first.")
        setShowErrors(true)
        return { ok: false }
      }

      return await saveTemplate(markdown, options)
    }

    // Expose methods to parent component
    useImperativeHandle(
      ref,
      () => ({
        saveTemplate: async (options) => {
          return await handleSave(options)
        },
        isTemplateSaved: () => templateSaved,
      }),
      [templateSaved, handleSave]
    )

    const usesAcrossScope = useMemo(() => templateUsesStatAcross(markdown), [markdown])

    const previewRequestSeq = useRef(0)

    useEffect(() => {
      const seq = ++previewRequestSeq.current
      void renderFeedbackPreviewAction({
        studyId,
        contextKey: feedbackPreviewContextKey,
        templateContent: debouncedMarkdown,
        withinStudyResultId,
      })
        .then((result) => {
          if (seq !== previewRequestSeq.current) return
          if (result.ok) {
            setPreviewMarkdown(result.markdown)
            setPreviewError(null)
          } else {
            setPreviewError(result.error)
            toast.error(result.error)
          }
        })
        .catch((err: unknown) => {
          if (seq !== previewRequestSeq.current) return
          const message =
            err instanceof Error ? err.message : typeof err === "string" ? err : "Preview failed."
          setPreviewError(message)
          toast.error(message)
        })
    }, [debouncedMarkdown, studyId, feedbackPreviewContextKey, withinStudyResultId])

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
              <h3 className="font-bold">Using "Across All Results" Statistics</h3>
              <div className="text-sm">
                This template uses statistics calculated across all participants. In the preview
                above, we're using all pilot results ({pilotResultCount ?? 0} result
                {pilotResultCount !== 1 ? "s" : ""}). In actual participant feedback, it will use
                all participant results from the study.
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
            ref={mdEditorRef}
            value={markdown}
            onChange={(value, evt) => {
              setMarkdown(value || "")
              setTemplateSaved(false)
              if (evt?.currentTarget) {
                syncSelectionRef(lastSelectionRef, evt.currentTarget)
              }
            }}
            height={300}
            preview="edit"
            style={{ ...mdEditorStyles.container, backgroundColor: "hsl(var(--b3))" }}
            textareaProps={{
              style: { ...mdEditorStyles.textarea, backgroundColor: "hsl(var(--b3))" },
              onSelect: (e) => syncSelectionRef(lastSelectionRef, e.currentTarget),
              onKeyUp: (e) => syncSelectionRef(lastSelectionRef, e.currentTarget),
              onMouseUp: (e) => syncSelectionRef(lastSelectionRef, e.currentTarget),
              onBlur: (e) => syncSelectionRef(lastSelectionRef, e.currentTarget),
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
          {previewError ? (
            <div className="alert alert-error not-prose" role="alert">
              <div>
                <div className="font-semibold">Preview could not be rendered</div>
                <p className="text-sm mt-1">{previewError}</p>
              </div>
            </div>
          ) : (
            <MDEditor.Markdown
              source={previewMarkdown}
              style={{ ...mdEditorStyles.preview, backgroundColor: "hsl(var(--b3))" }}
            />
          )}
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
