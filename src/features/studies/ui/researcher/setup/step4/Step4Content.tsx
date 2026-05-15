"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Route } from "next"
import { useMutation } from "@blitzjs/rpc"

import approveExtraction from "@/src/features/studies/mutations/approveExtraction"
import StepNavigation from "../StepNavigation"
import type { ValidationData } from "@/src/features/studies/server/getValidationData"
import { Alert } from "@/src/components/ui/Alert"
import { AsyncButton } from "@/src/components/ui/AsyncButton"
import Card from "@/src/components/ui/Card"
import { studySetupStepPath } from "../../../../domain/setup/setupRoutes"
import Step4Instructions from "./Step4Instructions"
import { useExtractionBundle } from "./useExtractionBundle"

import type { StudyWithRelations } from "../../../../types"

// Dashboard Components
import SummaryDashboard from "./dashboard/SummaryDashboard"
import AggregatedVariableTable from "./dashboard/AggregatedVariableTable"
import CrossRunDiagnosticsList from "./dashboard/CrossRunDiagnosticsList"
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

  const handleComplete = async () => {
    try {
      if (step4Completed) {
        router.push(studySetupStepPath(studyId, 5) as Route)
        return
      }
      await approveExtractionMutation({ studyId: study.id })
      router.refresh()
      router.push(studySetupStepPath(studyId, 5) as Route)
    } catch (err) {
      console.error("Failed to update step 4 completion:", err)
    }
  }

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
              onClick={() => router.push(studySetupStepPath(studyId, 3) as Route)}
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
              {dashboardStats.structuralErrorCount > 0 && (
                <span
                  className={`ml-2 badge badge-sm ${
                    activeTab === "diagnostics" ? "badge-primary" : "badge-error"
                  }`}
                >
                  {dashboardStats.structuralErrorCount}
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
