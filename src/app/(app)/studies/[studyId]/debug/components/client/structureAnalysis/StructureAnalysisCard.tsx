"use client"

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import type { DebugStructureAnalysis } from "../../../../variables/utils/structureAnalyzer/analyzeOriginalStructure"
import type {
  Diagnostic,
  ExtractedVariable,
  ExtractionObservation,
} from "../../../../variables/types"
import type { PathDisplay } from "../../../types"
import Card from "@/src/app/components/Card"
import { useState, useMemo, useCallback } from "react"
import StructureOverview from "./StructureOverview"
import StructureComponents from "./StructureComponents"
import StructureDiagnostics from "./StructureDiagnostics"

interface StructureAnalysisCardProps {
  enrichedResult: EnrichedJatosStudyResult
  originalStructureAnalysis: DebugStructureAnalysis
  extractedVariables: ExtractedVariable[]
  observations: ExtractionObservation[]
  diagnostics: {
    run: Diagnostic[]
    component: Map<number, Diagnostic[]>
  }
}

export default function StructureAnalysisCard({
  enrichedResult,
  originalStructureAnalysis,
  extractedVariables,
  observations,
  diagnostics,
}: StructureAnalysisCardProps) {
  const [analysisTab, setAnalysisTab] = useState<"overview" | "components" | "diagnostics">(
    "overview"
  )
  const [selectedComponentId, setSelectedComponentId] = useState<number | "all" | null>(
    enrichedResult.componentResults.find((c) => c.dataContent)?.componentId ?? "all"
  )
  const [highlightedPath, setHighlightedPath] = useState<{
    path: string
    componentId: number
    paths?: string[]
    highlightKey?: string
  } | null>(null)

  const getLastKeyFromVariableKey = useCallback((variableKey: string) => {
    const regex = /\.([A-Za-z_$][A-Za-z0-9_$]*)|\["([^"]+)"\]|\[(\d+)\]/g
    let match: RegExpExecArray | null
    let lastKey: string | undefined
    while ((match = regex.exec(variableKey)) !== null) {
      const key = match[1] || match[2]
      if (key) {
        lastKey = key
      }
    }
    return lastKey
  }, [])

  // Handler to extract example paths from variable and highlight
  const handleVariableClick = useCallback(
    (variablePath: string, componentId: number) => {
      // Find the variable
      const variable = extractedVariables.find((v) => v.variableName === variablePath)
      if (!variable) {
        // Fallback: use the path directly if not a variable
        setHighlightedPath({ path: variablePath, componentId, highlightKey: variablePath })
        return
      }

      const allObservationPaths = observations
        .filter(
          (obs) =>
            obs.variableKey === variable.variableKey && obs.scopeKeys.componentId === componentId
        )
        .map((obs) => obs.path)

      setHighlightedPath({
        path: variable.variableName,
        componentId,
        paths: allObservationPaths,
        highlightKey: getLastKeyFromVariableKey(variable.variableKey) || variable.variableName,
      })
    },
    [extractedVariables, observations, getLastKeyFromVariableKey]
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
      // If root-level array element, group under "root"
      const topLevelKey =
        obs.keyPath.length > 0 ? (obs.keyPath[0] === "*" ? "root" : obs.keyPath[0]) : null
      if (!topLevelKey) return

      if (!observationsByTopLevelKey.has(topLevelKey)) {
        observationsByTopLevelKey.set(topLevelKey, [])
      }
      observationsByTopLevelKey.get(topLevelKey)!.push(obs)
    })

    // Map observations to variables by parent key
    observationsByTopLevelKey.forEach((obsGroup, parentKey) => {
      // Group observations by variableKey
      const byVariable = new Map<string, ExtractionObservation[]>()
      obsGroup.forEach((obs) => {
        if (!byVariable.has(obs.variableKey)) {
          byVariable.set(obs.variableKey, [])
        }
        byVariable.get(obs.variableKey)!.push(obs)
      })

      // For each variable, find the ExtractedVariable and add entries for each componentId
      byVariable.forEach((variableObservations, variableKey) => {
        const variable = extractedVariables.find((v) => v.variableKey === variableKey)
        if (!variable) return

        // Get unique componentIds from observations
        const componentIds = Array.from(
          new Set(variableObservations.map((obs) => obs.scopeKeys.componentId))
        )

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
        <button
          className={`tab ${analysisTab === "diagnostics" ? "tab-active" : ""}`}
          onClick={() => setAnalysisTab("diagnostics")}
        >
          Diagnostics
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

      {/* Diagnostics Tab */}
      {analysisTab === "diagnostics" && (
        <StructureDiagnostics diagnostics={diagnostics} extractedVariables={extractedVariables} />
      )}
    </Card>
  )
}
