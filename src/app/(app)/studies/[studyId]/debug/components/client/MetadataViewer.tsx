"use client"

import type { JatosMetadata } from "@/src/types/jatos"
import { useState } from "react"
import Card from "@/src/app/components/Card"
import JsonSyntaxHighlighter from "@/src/app/components/JsonSyntaxHighlighter"

interface MetadataViewerProps {
  metadata: JatosMetadata
}

export default function MetadataViewer({ metadata }: MetadataViewerProps) {
  const [copySuccess, setCopySuccess] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(metadata, null, 2))
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  return (
    <Card
      title="JATOS Metadata"
      collapsible
      defaultOpen={false}
      actions={
        <button className="btn btn-sm btn-outline" onClick={handleCopy}>
          {copySuccess ? "Copied!" : "Copy JSON"}
        </button>
      }
    >
      <div className="max-h-96 overflow-auto rounded-lg border border-base-300">
        <JsonSyntaxHighlighter code={JSON.stringify(metadata, null, 2)} />
      </div>

      <div className="text-sm text-muted-content mt-2">
        API Version: {metadata.apiVersion ?? "N/A"} | Studies: {metadata.data?.length ?? 0}
      </div>
    </Card>
  )
}
