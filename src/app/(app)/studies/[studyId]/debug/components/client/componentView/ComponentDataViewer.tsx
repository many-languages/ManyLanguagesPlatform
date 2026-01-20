"use client"

import JsonTreeViewer from "@/src/app/components/JsonTreeViewer"
import JsonView from "@/src/app/components/JsonView"
import { Alert } from "@/src/app/components/Alert"
import { formatJson } from "@/src/lib/utils/formatJson"
import type { EnrichedJatosStudyResult } from "@/src/types/jatos"

type ComponentResult = EnrichedJatosStudyResult["componentResults"][number]

interface ComponentDataViewerProps {
  component: ComponentResult
  highlightPaths?: string[]
}

export default function ComponentDataViewer({
  component,
  highlightPaths,
}: ComponentDataViewerProps) {
  const format = component.detectedFormat?.format
  const parsedData = component.parsedData

  // JSON: Pretty-print with syntax highlighting
  if (format === "json" && parsedData) {
    return (
      <div
        id={`raw-data-component-${component.componentId}`}
        className="max-h-96 overflow-auto rounded-lg border border-base-300 scroll-mt-4"
      >
        <JsonTreeViewer data={parsedData} highlightPaths={highlightPaths} expandAll={true} />
      </div>
    )
  }

  // CSV/TSV: Display as a table
  if ((format === "csv" || format === "tsv") && parsedData && Array.isArray(parsedData)) {
    if (parsedData.length === 0) {
      return <Alert variant="info">No data rows found</Alert>
    }

    const headers = Object.keys(parsedData[0] || {})
    return (
      <div
        id={`raw-data-component-${component.componentId}`}
        className="overflow-x-auto max-h-96 border border-base-300 rounded-lg scroll-mt-4"
      >
        <table className="table table-zebra table-pin-rows">
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header} className="font-mono text-xs bg-base-300 font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {parsedData.map((row: Record<string, any>, idx: number) => (
              <tr key={idx}>
                {headers.map((header) => {
                  const value = row[header]
                  const isNumber = typeof value === "number"
                  const isBoolean = typeof value === "boolean"
                  const isNull = value === null || value === undefined
                  const isObject = typeof value === "object" && !isNull

                  let displayValue = ""
                  if (isNull) {
                    displayValue = ""
                  } else if (isObject) {
                    displayValue = formatJson(value, 0)
                  } else {
                    displayValue = String(value)
                  }

                  const className = `font-mono text-xs ${
                    isNumber
                      ? "text-warning"
                      : isBoolean
                      ? "text-secondary"
                      : isNull
                      ? "text-base-content/40"
                      : ""
                  }`

                  return (
                    <td key={header} className={className}>
                      {displayValue}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Plain text or fallback
  return (
    <div
      id={`raw-data-component-${component.componentId}`}
      className="max-h-96 overflow-auto rounded-lg border border-base-300 scroll-mt-4"
    >
      <JsonView code={component.dataContent || ""} language="text" />
    </div>
  )
}
