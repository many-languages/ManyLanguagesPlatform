"use client"

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import type { OriginalStructureAnalysis } from "../../../../variables/utils/structureAnalyzer/analyzeOriginalStructure"
import type { ExtractedVariable } from "../../../../variables/types"
import { Alert } from "@/src/app/components/Alert"
import { useMemo, useCallback } from "react"
import { formatJson } from "@/src/lib/utils/formatJson"
import ComponentView from "../componentView/ComponentView"
import ComponentSelector from "../componentView/ComponentSelector"
import CopyButton from "../CopyButton"

interface StructureComponentsProps {
  enrichedResult: EnrichedJatosStudyResult
  originalStructureAnalysis: OriginalStructureAnalysis
  extractedVariables: ExtractedVariable[]
  selectedComponentId: number | "all" | null
  highlightedPath?: { path: string; componentId: number } | null
  onSelectComponent: (componentId: number | "all" | null) => void
  onHighlightPath: (path: string, componentId: number) => void
}

export default function StructureComponents({
  enrichedResult,
  originalStructureAnalysis,
  extractedVariables,
  selectedComponentId,
  highlightedPath,
  onSelectComponent,
  onHighlightPath,
}: StructureComponentsProps) {
  const componentsWithData = enrichedResult.componentResults.filter((c) => c.dataContent)

  // Define the copy logic in the parent component
  const getTextToCopy = useCallback(() => {
    let textToCopy = ""

    if (selectedComponentId === "all") {
      // Copy all components as a JSON object
      const allComponentsData: Record<string, any> = {}
      componentsWithData.forEach((component) => {
        const key = `component_${component.componentId}`
        const format = component.detectedFormat?.format

        if (format === "json" && component.parsedData) {
          allComponentsData[key] = component.parsedData
        } else {
          // For CSV/TSV/text, include both raw and parsed if available
          allComponentsData[key] = {
            raw: component.dataContent,
            parsed: component.parsedData,
            format: format,
          }
        }
      })
      textToCopy = formatJson(allComponentsData)
    } else if (typeof selectedComponentId === "number") {
      const selectedComponent = enrichedResult.componentResults.find(
        (c) => c.componentId === selectedComponentId
      )

      if (selectedComponent?.dataContent) {
        const format = selectedComponent.detectedFormat?.format

        if (format === "json" && selectedComponent.parsedData) {
          // Copy pretty-printed JSON
          textToCopy = formatJson(selectedComponent.parsedData)
        } else {
          // Copy raw content for CSV/TSV/text
          textToCopy = selectedComponent.dataContent
        }
      }
    }

    return textToCopy
  }, [selectedComponentId, componentsWithData, enrichedResult.componentResults])

  // Determine if copy button should be enabled
  const canCopy = useMemo(() => {
    return (
      componentsWithData.length > 0 &&
      (selectedComponentId === "all" || selectedComponentId !== null)
    )
  }, [componentsWithData.length, selectedComponentId])

  return (
    <div className="space-y-4">
      {/* Copy button at the top */}
      <div className="flex justify-end">
        <CopyButton getTextToCopy={getTextToCopy} disabled={!canCopy} />
      </div>

      <ComponentSelector
        componentsWithData={componentsWithData}
        selectedComponentId={selectedComponentId}
        onSelect={onSelectComponent}
      />

      {selectedComponentId === "all" ? (
        // All Components View
        <div className="space-y-6">
          {componentsWithData.map((component) => {
            const componentAnalysis = originalStructureAnalysis.components.find(
              (c) => c.componentId === component.componentId
            )

            return (
              <ComponentView
                key={component.id}
                component={component}
                componentAnalysis={componentAnalysis}
                extractedVariables={extractedVariables}
                highlightedPath={highlightedPath}
                onHighlightPath={onHighlightPath}
              />
            )
          })}
        </div>
      ) : typeof selectedComponentId === "number" ? (
        // Single Component View
        (() => {
          const selectedComponent = enrichedResult.componentResults.find(
            (c) => c.componentId === selectedComponentId
          )
          const componentAnalysis = originalStructureAnalysis.components.find(
            (c) => c.componentId === selectedComponentId
          )

          if (!selectedComponent || !selectedComponent.dataContent) {
            return <Alert variant="info">Please select a component with data to view details</Alert>
          }

          return (
            <ComponentView
              component={selectedComponent}
              componentAnalysis={componentAnalysis}
              extractedVariables={extractedVariables}
              highlightedPath={highlightedPath}
              onHighlightPath={onHighlightPath}
            />
          )
        })()
      ) : (
        <Alert variant="info">Please select a component to view details</Alert>
      )}
    </div>
  )
}
