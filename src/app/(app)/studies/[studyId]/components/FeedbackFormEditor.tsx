"use client"

import { useState } from "react"
import MDEditor from "@uiw/react-md-editor"
import VariableSelector from "./VariableSelector"
import { EnrichedJatosStudyResult } from "@/src/types/jatos"

interface FeedbackFormEditorProps {
  enrichedResult: EnrichedJatosStudyResult
}

export default function FeedbackFormEditor({ enrichedResult }: FeedbackFormEditorProps) {
  const [markdown, setMarkdown] = useState("## Feedback Form\nWrite your feedback message here...")

  const handleInsertVariable = (variableName: string) => {
    setMarkdown((prev) => prev + ` {{${variableName}}}`)
  }

  return (
    <div className="card bg-base-200 shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="card-title text-lg">Participant Feedback Form</h2>
        <VariableSelector enrichedResult={enrichedResult} onInsert={handleInsertVariable} />
      </div>

      <div data-color-mode="light" className="rounded-lg overflow-hidden border border-base-300">
        <MDEditor
          value={markdown}
          onChange={(value) => setMarkdown(value || "")}
          height={300}
          preview="edit"
        />
      </div>

      <div className="divider">Preview</div>
      <div className="prose max-w-none bg-base-100 p-4 rounded-lg border border-base-300">
        <MDEditor.Markdown source={markdown} />
      </div>
    </div>
  )
}
