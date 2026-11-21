import { useState, useMemo } from "react"
import { EnrichedJatosStudyResult } from "@/src/types/jatos"
import { getPilotLinkLabel } from "@/src/features/studies/domain/pilotLinkLabel"
import { isRunExcludedFromExtraction } from "@/src/features/studies/domain/inspector/isRunExcludedFromExtraction"
import StructureAnalysisCard from "../../../inspector/structureAnalysis/StructureAnalysisCard"
import { ExclamationCircleIcon } from "@heroicons/react/24/outline"
import { createExtractionIndexStore } from "../../../../../domain/variables/utils/extractionIndexStore"
import type { SerializedExtractionBundle } from "../../../../../domain/setup/serializeExtractionBundle"
import type { ExtractionObservation } from "../../../../../domain/variables/types"

interface RunInspectorProps {
  runs: EnrichedJatosStudyResult[]
  /** Researcher-provided pilot link labels, keyed by marker token. */
  pilotLinkLabels?: Record<string, string>
  // In a real implementation we would fetch the bundle for the specific run dynamically,
  // but for now we assume the "main" bundle aggregates everything.
  // Wait, the main bundle is aggregating EVERYTHING.
  // Viewing a *single* run's structure using the *aggregated* bundle might be misleading if we want to see ONLY that run's data.
  // However, StructureAnalysisCard filters by component.
  // Ideally, we should have per-run extraction bundles or filter the observations.
  // Using the global observations for a single run is okay if we filter by "ScopeKeys".

  // BUT: StructureAnalysisCard takes "observations" and "extractedVariables".
  // If we pass ALL observations, it shows all.
  // To show 'single run' view, we should filter observations by studyResultId (which matches the run ID).

  // Let's implement filtering here.

  activeBundle: SerializedExtractionBundle
}

export default function RunInspector({ runs, activeBundle, pilotLinkLabels }: RunInspectorProps) {
  const [selectedRunId, setSelectedRunId] = useState<number>(runs[0]?.id ?? 0)

  const selectedRun = runs.find((r) => r.id === selectedRunId)

  // Create a filtered view of the bundle for this run
  // This is expensive to do on render, might need memoization or do it only when selectedRunId changes.
  const runBundle = useMemo(() => {
    if (!selectedRun) return null

    // Filter observations that belong to this run.
    // Observation.scopeKeys.studyResultId should match selectedRun.id
    const filteredObservations = activeBundle.observations.filter(
      (o: ExtractionObservation) => o.scopeKeys.studyResultId === selectedRun.id
    )

    // Re-create index store for these observations
    const indexStore = createExtractionIndexStore(filteredObservations)

    // Diagnostics associated with this run?
    // The global diagnostics have "run" diagnostics, but those are aggregated or generic?
    // Actually "runDiagnostics" in the bundle are per-run if we look at the structure?
    // No, bundle.diagnostics.run is a list of run-level diagnostics (e.g. max depth reached).
    // We should filter those that apply to this run if they have metadata.runIds?

    // For now, let's pass the global diagnostics but knowing they might be broader.
    // Or ideally we pass empty run diagnostics if we can't associate them easily.

    return {
      observations: filteredObservations,
      indexStore,
      // Variables are "all variables found in study". We can keep them as the dictionary.
      variables: activeBundle.variables,
    }
  }, [selectedRun, activeBundle])

  if (runs.length === 0) return <div>No runs available.</div>

  // Raw component data stays viewable even when nothing could be extracted from it
  const hasData = selectedRun?.componentResults.some((c) => c.dataContent) ?? false
  const notUsedInExtraction = selectedRun ? isRunExcludedFromExtraction(selectedRun) : false

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-base-100 p-4 rounded-lg shadow">
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text font-bold">Select Run</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(Number(e.target.value))}
          >
            {runs.map((run) => {
              const linkLabel = getPilotLinkLabel(run.comment, pilotLinkLabels)
              return (
                <option key={run.id} value={run.id}>
                  Run #{run.id}
                  {linkLabel ? ` [${linkLabel}]` : ""} ({new Date(run.startDate).toLocaleString()})
                  {isRunExcludedFromExtraction(run)
                    ? " – not finished, not used in extraction"
                    : ""}
                </option>
              )
            })}
          </select>
        </div>
      </div>

      {notUsedInExtraction && (
        <div className="alert alert-warning">
          <ExclamationCircleIcon className="w-6 h-6" />
          <span>This run was not finished, so it was not used in the extraction.</span>
        </div>
      )}

      {!notUsedInExtraction && !hasData && (
        <div className="alert alert-warning">
          <ExclamationCircleIcon className="w-6 h-6" />
          <span>No data found for this run. The run might be empty or failed.</span>
        </div>
      )}

      {selectedRun && runBundle && hasData && (
        <StructureAnalysisCard
          // Remount per run so the component selection never points at another run's components
          key={selectedRun.id}
          // We reuse the existing card but pass filtered data
          extractedVariables={runBundle.variables}
          indexStore={runBundle.indexStore}
          observations={runBundle.observations}
          enrichedResult={selectedRun}
          bgColor="bg-base-100"
          title={null}
        />
      )}
    </div>
  )
}
