"use client"

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import type { OriginalStructureAnalysis } from "../../../../variables/utils/structureAnalyzer/analyzeOriginalStructure"
import type { ExtractedVariable, ExtractionObservation } from "../../../../variables/types"
import type { PathDisplay } from "../../../types"
import Card from "@/src/app/components/Card"
import { useState, useMemo, useCallback } from "react"
import StructureOverview from "./StructureOverview"
import StructureComponents from "./StructureComponents"

interface StructureAnalysisCardProps {
  enrichedResult: EnrichedJatosStudyResult
  originalStructureAnalysis: OriginalStructureAnalysis
  extractedVariables: ExtractedVariable[]
  observations: ExtractionObservation[]
}

export default function StructureAnalysisCard({
  enrichedResult,
  originalStructureAnalysis,
  extractedVariables,
  observations,
}: StructureAnalysisCardProps) {
  const [analysisTab, setAnalysisTab] = useState<"overview" | "components">("overview")
  const [selectedComponentId, setSelectedComponentId] = useState<number | "all" | null>(
    enrichedResult.componentResults.find((c) => c.dataContent)?.componentId ?? "all"
  )
  const [highlightedPath, setHighlightedPath] = useState<{
    path: string
    componentId: number
  } | null>(null)

  // Handler to extract example paths from variable and highlight
  const handleVariableClick = useCallback(
    (variablePath: string, componentId: number) => {
      // Find the variable
      const variable = extractedVariables.find((v) => v.variableName === variablePath)
      if (!variable) {
        // Fallback: use the path directly if not a variable
        setHighlightedPath({ path: variablePath, componentId })
        return
      }

      // Extract example paths (will use all in Step 5, for now use first)
      const examplePaths = variable.examples.map((ex) => ex.sourcePath)
      const unshownCount = variable.occurrences - variable.examples.length

      if (examplePaths.length > 0) {
        // For Step 3: use first example path (Step 5 will update to use all)
        setHighlightedPath({ path: examplePaths[0], componentId })

        // Show notification about unshown observations if any
        if (unshownCount > 0) {
          // TODO: Replace with proper toast/notification component
          console.log(
            `Highlighting ${examplePaths.length} of ${variable.occurrences} observations. ${unshownCount} more not highlighted.`
          )
        }
      } else {
        // Fallback to variable name if no examples
        setHighlightedPath({ path: variablePath, componentId })
      }
    },
    [extractedVariables]
  )

  // Collect all extracted paths from all components for the overview
  // Group by topLevelKey from observations (first element of keyPath)
  const allExtractedPathsByParentKey = useMemo(() => {
    const variablesByParentKey = new Map<
      string,
      Array<{ variable: ExtractedVariable; componentId: number }>
    >()

    // Group observations by topLevelKey (first element of keyPath), then map to variables
    const observationsByTopLevelKey = new Map<string, ExtractionObservation[]>()
    observations.forEach((obs) => {
      // Get the first element of keyPath as the top-level key
      // Skip if keyPath is empty or starts with "*" (root-level array element)
      const topLevelKey = obs.keyPath.length > 0 && obs.keyPath[0] !== "*" ? obs.keyPath[0] : null
      if (!topLevelKey) return // Skip root-level observations

      if (!observationsByTopLevelKey.has(topLevelKey)) {
        observationsByTopLevelKey.set(topLevelKey, [])
      }
      observationsByTopLevelKey.get(topLevelKey)!.push(obs)
    })

    // Map observations to variables by parent key
    observationsByTopLevelKey.forEach((obsGroup, parentKey) => {
      // Group observations by variable name
      const byVariable = new Map<string, ExtractionObservation[]>()
      obsGroup.forEach((obs) => {
        if (!byVariable.has(obs.variable)) {
          byVariable.set(obs.variable, [])
        }
        byVariable.get(obs.variable)!.push(obs)
      })

      // For each variable, find the ExtractedVariable and add entries for each componentId
      byVariable.forEach((variableObservations, variableName) => {
        const variable = extractedVariables.find((v) => v.variableName === variableName)
        if (!variable) return

        // Get unique componentIds from observations
        const componentIds = Array.from(new Set(variableObservations.map((obs) => obs.componentId)))

        componentIds.forEach((componentId) => {
          if (!variablesByParentKey.has(parentKey)) {
            variablesByParentKey.set(parentKey, [])
          }
          variablesByParentKey.get(parentKey)!.push({ variable, componentId })
        })
      })
    })

    // Convert to the format expected by the UI
    const converted = new Map<string, Array<{ path: PathDisplay; componentId: number }>>()
    variablesByParentKey.forEach((variablesWithComponents, parentKey) => {
      converted.set(
        parentKey,
        variablesWithComponents.map(({ variable, componentId }) => ({
          path: {
            path: variable.variableName,
            type: variable.type as PathDisplay["type"],
            exampleValue: variable.examples[0]?.value || null,
            depth: variable.depth,
          },
          componentId,
        }))
      )
    })
    return converted
  }, [observations, extractedVariables])

  return (
    <Card title="Structure Analysis" collapsible defaultOpen={true}>
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
          extractedVariables={extractedVariables}
          highlightedPath={highlightedPath}
          onSwitchToComponents={() => setAnalysisTab("components")}
          onSelectComponent={(componentId) => setSelectedComponentId(componentId)}
          onHighlightPath={handleVariableClick}
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
          onHighlightPath={handleVariableClick}
        />
      )}
    </Card>
  )
}
