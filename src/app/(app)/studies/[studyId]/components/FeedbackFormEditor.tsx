"use client"

import { useState } from "react"
import MDEditor from "@uiw/react-md-editor"

export default function FeedbackFormEditor() {
  const [markdown, setMarkdown] = useState<string>(
    "## Feedback Form\nWrite your feedback message here..."
  )

  return (
    <div className="card bg-base-200 shadow-md p-6">
      <h2 className="card-title text-lg mb-4">Participant Feedback Form</h2>

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
