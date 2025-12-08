"use client"

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import type { OriginalStructureAnalysis } from "../../../variables/utils/structureAnalyzer/analyzeOriginalStructure"
import type { ExtractedVariable } from "../../../variables/types"
import { aggregateVariablesByParentKey } from "../../../variables/utils/componentPathExtractor"
import Card from "@/src/app/components/Card"
import { useState, useMemo } from "react"
import { formatJson } from "@/src/lib/utils/formatJson"
import StructureOverview from "./StructureOverview"
import StructureComponents from "./StructureComponents"

interface StructureAnalysisCardProps {
  enrichedResult: EnrichedJatosStudyResult
  originalStructureAnalysis: OriginalStructureAnalysis
  extractedVariables: ExtractedVariable[]
}

// Simple type for path display (replaces NestedPath)
type PathDisplay = {
  path: string
  type: "string" | "number" | "boolean" | "object" | "array" | "null"
  exampleValue: any
  depth: number
}

export default function StructureAnalysisCard({
  enrichedResult,
  originalStructureAnalysis,
  extractedVariables,
}: StructureAnalysisCardProps) {
  const [analysisTab, setAnalysisTab] = useState<"overview" | "components">("overview")
  const [selectedComponentId, setSelectedComponentId] = useState<number | "all" | null>(
    enrichedResult.componentResults.find((c) => c.dataContent)?.componentId ?? "all"
  )
  const [copySuccess, setCopySuccess] = useState(false)
  const [highlightedPath, setHighlightedPath] = useState<{
    path: string
    componentId: number
  } | null>(null)

  // Collect all extracted paths from all components for the overview
  const allExtractedPathsByParentKey = useMemo(() => {
    const variablesByParentKey = aggregateVariablesByParentKey(
      extractedVariables,
      originalStructureAnalysis
    )
    // Convert to the format expected by the UI
    const converted = new Map<string, Array<{ path: PathDisplay; componentId: number }>>()
    variablesByParentKey.forEach((variablesWithComponents, parentKey) => {
      converted.set(
        parentKey,
        variablesWithComponents.map(({ variable, componentId }) => ({
          path: {
            path: variable.variableName,
            type: (variable.type === "primitive" ? "string" : variable.type) as PathDisplay["type"],
            exampleValue: variable.allValues[0] || null,
            depth:
              variable.variableName.split(".").length + variable.variableName.split("[").length - 1,
          },
          componentId,
        }))
      )
    })
    return converted
  }, [extractedVariables, originalStructureAnalysis])

  // Get components with data
  const componentsWithData = enrichedResult.componentResults.filter((c) => c.dataContent)

  // Handle copy functionality
  const handleCopy = async () => {
    try {
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

      if (textToCopy) {
        await navigator.clipboard.writeText(textToCopy)
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      }
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  return (
    <Card
      title="Structure Analysis"
      collapsible
      defaultOpen={true}
      actions={
        analysisTab === "components" &&
        componentsWithData.length > 0 &&
        (selectedComponentId === "all" || selectedComponentId !== null) && (
          <button className="btn btn-sm btn-outline" onClick={handleCopy}>
            {copySuccess ? "Copied!" : "Copy JSON"}
          </button>
        )
      }
    >
      {/* Analysis Tabs */}
      <div className="tabs tabs-boxed mb-4">
        <button
          className={`tab ${analysisTab === "overview" ? "tab-active" : ""}`}
          onClick={() => setAnalysisTab("overview")}
        >
          Overview
        </button>
        <button
          className={`tab ${analysisTab === "components" ? "tab-active" : ""}`}
          onClick={() => setAnalysisTab("components")}
        >
          Components ({originalStructureAnalysis.components.length})
        </button>
      </div>

      {/* Overview Tab */}
      {analysisTab === "overview" && (
        <StructureOverview
          enrichedResult={enrichedResult}
          originalStructureAnalysis={originalStructureAnalysis}
          allExtractedPathsByParentKey={allExtractedPathsByParentKey}
          highlightedPath={highlightedPath}
          onSwitchToComponents={() => setAnalysisTab("components")}
          onSelectComponent={(componentId) => setSelectedComponentId(componentId)}
          onHighlightPath={(path, componentId) => setHighlightedPath({ path, componentId })}
        />
      )}

      {/* Components Tab */}
      {analysisTab === "components" && (
        <StructureComponents
          enrichedResult={enrichedResult}
          originalStructureAnalysis={originalStructureAnalysis}
          extractedVariables={extractedVariables}
          selectedComponentId={selectedComponentId}
          highlightedPath={highlightedPath}
          onSelectComponent={(componentId) => setSelectedComponentId(componentId)}
          onHighlightPath={(path, componentId) => setHighlightedPath({ path, componentId })}
        />
      )}
    </Card>
  )
}
