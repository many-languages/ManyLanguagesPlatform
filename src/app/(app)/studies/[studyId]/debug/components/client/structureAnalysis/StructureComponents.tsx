"use client"

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import type { OriginalStructureAnalysis } from "../../../../variables/utils/structureAnalyzer/analyzeOriginalStructure"
import type { ExtractedVariable } from "../../../../variables/types"
import { Alert } from "@/src/app/components/Alert"
import ComponentView from "../componentView/ComponentView"
import ComponentSelector from "../componentView/ComponentSelector"

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

  return (
    <div className="space-y-4">
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
