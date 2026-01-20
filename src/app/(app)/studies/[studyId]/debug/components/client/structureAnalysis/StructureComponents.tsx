"use client"

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import type { ExtractedVariable } from "../../../../variables/types"
import type { HighlightedPaths, SelectedPath } from "../../../types"
import { Alert } from "@/src/app/components/Alert"
import { useMemo, useCallback } from "react"
import { formatJson } from "@/src/lib/utils/formatJson"
import ComponentView from "../componentView/ComponentView"
import ComponentSelector from "../componentView/ComponentSelector"
import CopyButton from "../CopyButton"

interface StructureComponentsProps {
  enrichedResult: EnrichedJatosStudyResult
  extractedVariables: ExtractedVariable[]
  selectedComponentId: number | "all" | null
  selectedPath?: SelectedPath | null
  highlightedPaths?: HighlightedPaths | null
  onSelectComponent: (componentId: number | "all" | null) => void
  onHighlightPath: (path: string, componentId: number) => void
}

export default function StructureComponents({
  enrichedResult,
  extractedVariables,
  selectedComponentId,
  selectedPath,
  highlightedPaths,
  onSelectComponent,
  onHighlightPath,
}: StructureComponentsProps) {
  const componentsWithData = useMemo(
    () => enrichedResult.componentResults.filter((c) => c.dataContent),
    [enrichedResult.componentResults]
  )

  // Determine which components to render
  const componentsToRender = useMemo(() => {
    if (selectedComponentId === "all") {
      return componentsWithData
    } else if (typeof selectedComponentId === "number") {
      const component = enrichedResult.componentResults.find(
        (c) => c.componentId === selectedComponentId
      )
      return component?.dataContent ? [component] : []
    }
    return []
  }, [selectedComponentId, componentsWithData, enrichedResult.componentResults])

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
  const canCopy =
    componentsWithData.length > 0 && (selectedComponentId === "all" || selectedComponentId !== null)

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

      {componentsToRender.length === 0 ? (
        <Alert variant="info">Please select a component to view details</Alert>
      ) : (
        <div className="space-y-6">
          {componentsToRender.map((component) => (
            <ComponentView
              key={component.id}
              component={component}
              extractedVariables={extractedVariables}
              selectedPath={selectedPath}
              highlightedPaths={highlightedPaths}
              onHighlightPath={onHighlightPath}
            />
          ))}
        </div>
      )}
    </div>
  )
}
