"use client"

import type { JatosStudyProperties } from "@/src/types/jatos"
import { useState } from "react"
import Card from "@/src/app/components/Card"
import JsonSyntaxHighlighter from "@/src/app/components/JsonSyntaxHighlighter"

interface StudyPropertiesViewerProps {
  properties: JatosStudyProperties
}

export default function StudyPropertiesViewer({ properties }: StudyPropertiesViewerProps) {
  const [copySuccess, setCopySuccess] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(properties, null, 2))
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  return (
    <Card
      title="Study Properties"
      collapsible
      defaultOpen={false}
      actions={
        <button className="btn btn-sm btn-outline" onClick={handleCopy}>
          {copySuccess ? "Copied!" : "Copy JSON"}
        </button>
      }
    >
      <div className="max-h-96 overflow-auto rounded-lg border border-base-300">
        <JsonSyntaxHighlighter code={JSON.stringify(properties, null, 2)} />
      </div>
    </Card>
  )
}
