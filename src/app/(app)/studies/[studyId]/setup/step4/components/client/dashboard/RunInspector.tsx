import { useState, useMemo } from "react"
import { EnrichedJatosStudyResult } from "@/src/types/jatos"
import { SerializedExtractionBundle } from "../../../../utils/serializeExtractionBundle"
import StructureAnalysisCard from "../../../../../debug/components/client/structureAnalysis/StructureAnalysisCard"
import { createExtractionIndexStore } from "../../../../../variables/utils/extractionIndexStore"
import { ExclamationCircleIcon } from "@heroicons/react/24/outline"
import { ExtractionObservation } from "../../../../../variables/types"

interface RunInspectorProps {
  runs: EnrichedJatosStudyResult[]
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

export default function RunInspector({ runs, activeBundle }: RunInspectorProps) {
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 p-4 bg-base-100 rounded-lg shadow">
        <label className="label">
          <span className="label-text font-bold">Select Run:</span>
        </label>
        <select
          className="select select-bordered w-full max-w-xs"
          value={selectedRunId}
          onChange={(e) => setSelectedRunId(Number(e.target.value))}
        >
          {runs.map((run) => (
            <option key={run.id} value={run.id}>
              Run #{run.id} ({new Date(run.startDate).toLocaleString()})
            </option>
          ))}
        </select>

        {selectedRun && <div className="badge badge-lg">Worker: {selectedRun.workerId}</div>}
      </div>

      {selectedRun && runBundle && (
        <StructureAnalysisCard
          // We reuse the existing card but pass filtered data
          extractedVariables={runBundle.variables}
          indexStore={runBundle.indexStore}
          observations={runBundle.observations}
          // For diagnostics, we pass the global ones for now as filtering them is complex
          // without "runId" in every diagnostic metadata explicitly guaranteed.
          diagnostics={{
            run: activeBundle.diagnostics.run, // This might be "all runs" stats
            component: new Map(activeBundle.diagnostics.component),
            variable: new Map(activeBundle.diagnostics.variable),
          }}
          enrichedResult={selectedRun}
        />
      )}

      {(!selectedRun || runBundle?.observations.length === 0) && (
        <div className="alert alert-warning">
          <ExclamationCircleIcon className="w-6 h-6" />
          <span>No observations found for this run. The run might be empty or failed.</span>
        </div>
      )}
    </div>
  )
}
