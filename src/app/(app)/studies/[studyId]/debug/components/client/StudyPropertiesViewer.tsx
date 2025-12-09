"use client"

import type { JatosStudyProperties } from "@/src/types/jatos"
import Card from "@/src/app/components/Card"
import JsonSyntaxHighlighter from "@/src/app/components/JsonSyntaxHighlighter"
import CopyButton from "./CopyButton"

interface StudyPropertiesViewerProps {
  properties: JatosStudyProperties
}

export default function StudyPropertiesViewer({ properties }: StudyPropertiesViewerProps) {
  return (
    <Card
      title="Study Properties"
      collapsible
      defaultOpen={false}
      actions={<CopyButton getTextToCopy={() => JSON.stringify(properties, null, 2)} />}
    >
      <div className="max-h-96 overflow-auto rounded-lg border border-base-300">
        <JsonSyntaxHighlighter code={JSON.stringify(properties, null, 2)} />
      </div>
    </Card>
  )
}
