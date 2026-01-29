"use client"

import { useRouter } from "next/navigation"

import { useMutation, useQuery } from "@blitzjs/rpc"
import approveExtraction from "../../../mutations/approveExtraction"
import runExtraction from "../../../mutations/runExtraction"
import getCachedExtractionBundle from "../../../queries/getCachedExtractionBundle"
import StepNavigation from "../../../components/client/StepNavigation"
import type { ValidationData } from "../../../../debug/utils/getValidationData"
import { useEffect, useMemo, useState } from "react"
import { Alert } from "@/src/app/components/Alert"
import { AsyncButton } from "@/src/app/components/AsyncButton"
import Card from "@/src/app/components/Card"
import type { SerializedExtractionBundle } from "../../../utils/serializeExtractionBundle"

import { StudyWithRelations } from "@/src/app/(app)/studies/queries/getStudy"

// Dashboard Components
import SummaryDashboard from "./dashboard/SummaryDashboard"
import AggregatedVariableTable from "./dashboard/AggregatedVariableTable"
import CrossRunDiagnosticsList from "./dashboard/CrossRunDiagnosticsList"
import RunInspector from "./dashboard/RunInspector"
import { PlayIcon } from "@heroicons/react/24/solid"

interface Step4ContentProps {
  validationData: ValidationData
  study: StudyWithRelations
}

// Stats limiters
const MAX_DIAGNOSTICS_SUMMARY = 99

export default function Step4Content({ validationData, study }: Step4ContentProps) {
  const router = useRouter()
  const studyId = study.id
  const [approveExtractionMutation] = useMutation(approveExtraction)
  const [runExtractionMutation] = useMutation(runExtraction)
  const latestUpload = study.latestJatosStudyUpload
  const step4Completed = latestUpload?.step4Completed ?? false

  const hasPilotResults = validationData.pilotResults.length > 0
  const [extractionBundle, setExtractionBundle] = useState<SerializedExtractionBundle | null>(null)

  // Dashboard State
  const [activeTab, setActiveTab] = useState<
    "overview" | "variables" | "diagnostics" | "inspector"
  >("overview")

  useEffect(() => {
    setExtractionBundle(null)
  }, [hasPilotResults])

  const [cachedBundleResult] = useQuery(
    getCachedExtractionBundle,
    {
      studyId,
      includeDiagnostics: true,
    },
    { enabled: hasPilotResults }
  )

  const activeBundle = extractionBundle ?? cachedBundleResult?.bundle ?? null

  const handleRunExtraction = async () => {
    try {
      const result = await runExtractionMutation({
        studyId,
        includeDiagnostics: true,
      })
      setExtractionBundle(result.bundle)
    } catch (error) {
      console.error("Failed to run extraction:", error)
    }
  }

  const handleComplete = async () => {
    try {
      if (step4Completed) {
        router.push(`/studies/${studyId}/setup/step5`)
        return
      }
      await approveExtractionMutation({
        studyId: study.id,
      })
      router.refresh()
      router.push(`/studies/${studyId}/setup/step5`)
    } catch (err) {
      console.error("Failed to update step 4 completion:", err)
    }
  }

  // Compute Summary Stats
  const dashboardStats = useMemo(() => {
    if (!activeBundle) return null

    const diag = activeBundle.diagnostics
    // Combine all diagnostic sources
    const allVariableDiags = Array.from(diag.variable || []).flatMap(([_, v]) => v.diagnostics)
    const allComponentDiags = Array.from(diag.component || []).flatMap(([_, d]) => d)
    const allRunDiags = diag.run || []
    const allCrossRunDiags = diag.crossRun
      ? [
          ...diag.crossRun.run,
          ...Array.from(diag.crossRun.component).flatMap(([_, d]) => d),
          ...Array.from(diag.crossRun.variable).flatMap(([_, v]) => v.diagnostics),
        ]
      : []

    const allDiagnostics = [
      ...allVariableDiags,
      ...allComponentDiags,
      ...allRunDiags,
      ...allCrossRunDiags,
    ]
    const errorCount = allDiagnostics.filter((d) => d.severity === "error").length
    const warningCount = allDiagnostics.filter((d) => d.severity === "warning").length

    return {
      runCount: validationData.pilotResults.length,
      variableCount: activeBundle.variables.length,
      diagnosticCount: allDiagnostics.length,
      errorCount,
      warningCount,
    }
  }, [activeBundle, validationData.pilotResults.length])

  if (!hasPilotResults) {
    return (
      <div className="space-y-4">
        <Alert variant="info">
          Extraction is based on all pilot results for the latest study upload.
        </Alert>
        <Card title="Pilot Data Required" bgColor="bg-base-200">
          <div className="alert alert-warning">
            <span>
              No pilot results found for this study version. Please collect pilot responses first.
            </span>
          </div>
          <div className="mt-4 flex justify-end">
            <AsyncButton
              onClick={() => router.push(`/studies/${studyId}/setup/step3`)}
              className="btn btn-primary"
            >
              Go to Step 3
            </AsyncButton>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Main Content Area */}
      {!activeBundle && (
        <div className="p-12 text-center bg-base-100 rounded-lg border border-dashed border-base-300">
          <h3 className="text-lg font-semibold mb-2">No Extraction Data</h3>
          <p className="mb-4 text-base-content/60">Run the extraction to analyze pilot results.</p>
          <AsyncButton
            onClick={handleRunExtraction}
            loadingText="Running..."
            className="btn btn-primary"
          >
            Run Extraction Now
          </AsyncButton>
        </div>
      )}

      {activeBundle && dashboardStats && (
        <>
          {/* Tabs Navigation */}
          <div className="tabs tabs-boxed bg-base-100 p-1 mb-4 shadow-sm" role="tablist">
            <button
              role="tab"
              className={`tab transition-all duration-200 ${
                activeTab === "overview"
                  ? "tab-active font-bold text-primary shadow-sm"
                  : "hover:text-primary"
              }`}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </button>
            <button
              role="tab"
              className={`tab transition-all duration-200 ${
                activeTab === "variables"
                  ? "tab-active font-bold text-primary shadow-sm"
                  : "hover:text-primary"
              }`}
              onClick={() => setActiveTab("variables")}
            >
              Variables
              <span
                className={`ml-2 badge badge-sm transition-colors ${
                  activeTab === "variables" ? "badge-primary" : "badge-ghost"
                }`}
              >
                {dashboardStats.variableCount}
              </span>
            </button>
            <button
              role="tab"
              className={`tab transition-all duration-200 ${
                activeTab === "diagnostics"
                  ? "tab-active font-bold text-primary shadow-sm"
                  : "hover:text-primary"
              }`}
              onClick={() => setActiveTab("diagnostics")}
            >
              Diagnostics
              {dashboardStats.errorCount > 0 && (
                <span
                  className={`ml-2 badge badge-sm ${
                    activeTab === "diagnostics" ? "badge-primary" : "badge-error"
                  }`}
                >
                  {dashboardStats.errorCount}
                </span>
              )}
            </button>
            <button
              role="tab"
              className={`tab transition-all duration-200 ${
                activeTab === "inspector"
                  ? "tab-active font-bold text-primary shadow-sm"
                  : "hover:text-primary"
              }`}
              onClick={() => setActiveTab("inspector")}
            >
              Run Inspector
            </button>
          </div>

          {/* Tab Panels */}
          <div className="min-h-[400px]">
            {activeTab === "overview" && (
              <SummaryDashboard stats={dashboardStats} onNavigate={(tab) => setActiveTab(tab)} />
            )}

            {activeTab === "variables" && (
              <AggregatedVariableTable
                variables={activeBundle.variables}
                totalRuns={validationData.pilotResults.length}
              />
            )}

            {activeTab === "diagnostics" && (
              <div className="bg-base-100 p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-6">Cross-Run Diagnostics</h2>
                <CrossRunDiagnosticsList
                  diagnostics={
                    activeBundle.diagnostics.crossRun
                      ? {
                          run: activeBundle.diagnostics.crossRun.run,
                          component: new Map(activeBundle.diagnostics.crossRun.component),
                          variable: new Map(activeBundle.diagnostics.crossRun.variable),
                        }
                      : undefined
                  }
                />
              </div>
            )}

            {activeTab === "inspector" && (
              <RunInspector runs={validationData.pilotResults} activeBundle={activeBundle} />
            )}
          </div>
        </>
      )}

      {/* Footer / Navigation */}
      <StepNavigation
        studyId={studyId}
        prev="step3"
        next="step5"
        disableNext={!hasPilotResults || !activeBundle}
        onNext={handleComplete}
        nextLabel={step4Completed ? "Continue" : "Approve Extraction"}
      />
    </div>
  )
}
