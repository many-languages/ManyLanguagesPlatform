"use client"

import type { JatosMetadata } from "@/src/types/jatos"
import Card from "@/src/app/components/Card"
import JsonView from "@/src/app/components/JsonView"
import CopyButton from "./CopyButton"

interface MetadataViewerProps {
  metadata: JatosMetadata
}

export default function MetadataViewer({ metadata }: MetadataViewerProps) {
  return (
    <Card
      title="JATOS Metadata"
      collapsible
      defaultOpen={false}
      actions={<CopyButton getTextToCopy={() => JSON.stringify(metadata, null, 2)} />}
    >
      <div className="max-h-96 overflow-auto rounded-lg border border-base-300">
        <JsonView code={JSON.stringify(metadata, null, 2)} />
      </div>

      <div className="text-sm text-muted-content mt-2">
        API Version: {metadata.apiVersion ?? "N/A"} | Studies: {metadata.data?.length ?? 0}
      </div>
    </Card>
  )
}
