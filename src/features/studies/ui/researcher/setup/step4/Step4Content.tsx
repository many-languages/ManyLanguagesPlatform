"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Route } from "next"
import { useMutation } from "@blitzjs/rpc"
import { toast } from "react-hot-toast"

import approveExtraction from "@/src/features/studies/mutations/approveExtraction"
import StepNavigation from "../StepNavigation"
import type { ValidationData } from "@/src/features/studies/server/getValidationData"
import { AsyncButton } from "@/src/components/ui/AsyncButton"
import { studySetupStepPath } from "../../../../domain/setup/setupRoutes"
import Step4Instructions from "./Step4Instructions"
import { useExtractionBundle } from "./useExtractionBundle"

import type { StudyWithRelations } from "../../../../types"

// Dashboard Components
import SummaryDashboard from "./dashboard/SummaryDashboard"
import AggregatedVariableTable from "./dashboard/AggregatedVariableTable"
import CrossRunDiagnosticsList from "./dashboard/CrossRunDiagnosticsList"
import ExtractionDiagnosticsList from "./dashboard/ExtractionDiagnosticsList"
import RunInspector from "./dashboard/RunInspector"

interface Step4ContentProps {
  validationData: ValidationData
  study: StudyWithRelations
}

const MAX_DIAGNOSTICS_SUMMARY = 99

export default function Step4Content({ validationData, study }: Step4ContentProps) {
  const router = useRouter()
  const studyId = study.id
  const [approveExtractionMutation] = useMutation(approveExtraction)
  const latestUpload = study.latestJatosStudyUpload
  const step4Completed = latestUpload?.step4Completed ?? false

  const hasPilotResults = validationData.pilotResults.length > 0
  const [activeTab, setActiveTab] = useState<
    "overview" | "variables" | "diagnostics" | "inspector"
  >("overview")

  const { activeBundle, hasExtractedVariables, dashboardStats, handleRunExtraction } =
    useExtractionBundle({ studyId, validationData })

  // The Diagnostics tab lists both extraction issues and cross-run issues, so the badge counts both
  const diagnosticsErrorCount =
    (dashboardStats?.variableErrorCount ?? 0) + (dashboardStats?.structuralErrorCount ?? 0)
  const diagnosticsWarningCount =
    (dashboardStats?.variableWarningCount ?? 0) + (dashboardStats?.structuralWarningCount ?? 0)

  const handleComplete = async () => {
    try {
      if (step4Completed) {
        router.push(studySetupStepPath(studyId, 5) as Route)
        return
      }
      await approveExtractionMutation({ studyId: study.id })
      router.refresh()
      router.push(studySetupStepPath(studyId, 5) as Route)
    } catch {
      toast.error("Failed to save step 4 completion. Please try again.")
    }
  }

  if (!hasPilotResults) {
    return (
      <div className="space-y-4">
        <div className="alert alert-warning">
          <span>
            No pilot results found for this study version. Please collect pilot responses first.
          </span>
        </div>
        <div className="flex justify-end">
          <AsyncButton
            onClick={() => router.push(studySetupStepPath(studyId, 3) as Route)}
            className="btn btn-primary"
          >
            Go to Step 3
          </AsyncButton>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!activeBundle && (
        <div className="p-12 text-center bg-base-100 rounded-lg border border-dashed border-base-300">
          <h3 className="text-lg font-semibold mb-2">No Extraction Data</h3>
          <p className="mb-4 text-base-content/60">Run the extraction to analyze pilot results.</p>
          <AsyncButton
            onClick={handleRunExtraction}
            loadingText="Running"
            className="btn btn-primary"
          >
            Run Extraction Now
          </AsyncButton>
        </div>
      )}

      {activeBundle && dashboardStats && (
        <>
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
              {diagnosticsErrorCount > 0 ? (
                <span
                  className={`ml-2 badge badge-sm ${
                    activeTab === "diagnostics" ? "badge-primary" : "badge-error"
                  }`}
                >
                  {diagnosticsErrorCount}
                </span>
              ) : (
                diagnosticsWarningCount > 0 && (
                  <span
                    className={`ml-2 badge badge-sm ${
                      activeTab === "diagnostics" ? "badge-primary" : "badge-warning"
                    }`}
                  >
                    {diagnosticsWarningCount}
                  </span>
                )
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

          <div className="min-h-[400px]">
            {activeTab === "overview" && (
              <SummaryDashboard stats={dashboardStats} onNavigate={(tab) => setActiveTab(tab)} />
            )}
            {activeTab === "variables" &&
              (hasExtractedVariables ? (
                <AggregatedVariableTable
                  variables={activeBundle.variables}
                  totalRuns={validationData.pilotResults.length}
                />
              ) : (
                <div className="alert alert-warning">
                  <span>
                    No variables were extracted from the pilot runs.
                    {diagnosticsErrorCount + diagnosticsWarningCount > 0
                      ? " The Diagnostics tab lists what was found in the pilot data."
                      : ""}
                  </span>
                </div>
              ))}
            {activeTab === "diagnostics" && (
              <div className="bg-base-100 p-6 rounded-lg shadow space-y-10">
                <section>
                  <h2 className="text-xl font-bold mb-6">Extraction Diagnostics</h2>
                  <ExtractionDiagnosticsList
                    diagnostics={{
                      run: activeBundle.diagnostics.run ?? [],
                      component: new Map(activeBundle.diagnostics.component ?? []),
                      variable: new Map(activeBundle.diagnostics.variable ?? []),
                    }}
                  />
                </section>
                <section>
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
                </section>
              </div>
            )}
            {activeTab === "inspector" && (
              <RunInspector
                runs={validationData.pilotResults}
                pilotLinkLabels={validationData.pilotLinkLabels}
                activeBundle={activeBundle}
              />
            )}
          </div>
        </>
      )}

      <StepNavigation
        studyId={studyId}
        prev="step3"
        next="step5"
        disableNext={!hasPilotResults || !activeBundle || !hasExtractedVariables}
        onNext={handleComplete}
        nextLabel="Approve Extraction"
        nextTooltip={
          !hasPilotResults
            ? "No pilot results found. Please collect pilot responses first."
            : !activeBundle
            ? "Run extraction first."
            : !hasExtractedVariables
            ? "No variables were extracted. Review diagnostics or pilot data and run extraction again."
            : undefined
        }
      />
    </div>
  )
}
