import Card from "@/src/app/components/Card"

interface SummaryDashboardProps {
  stats: {
    runCount: number
    variableCount: number
    variableIssueCount: number
    variableErrorCount: number
    variableWarningCount: number
    structuralIssueCount: number
    structuralErrorCount: number
    structuralWarningCount: number
  }
  onNavigate: (tab: "variables" | "diagnostics" | "inspector") => void
}

import Step4Instructions from "../Step4Instructions"

export default function SummaryDashboard({ stats, onNavigate }: SummaryDashboardProps) {
  return (
    <div className="flex flex-col gap-6">
      <Step4Instructions />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Runs Card */}
        <div
          className="card bg-base-100 shadow-xl cursor-pointer hover:bg-base-200 transition-colors"
          onClick={() => onNavigate("inspector")}
        >
          <div className="card-body">
            <h2 className="card-title text-sm text-base-content/70">Total Pilot Runs</h2>
            <div className="text-4xl font-bold text-primary">{stats.runCount}</div>
            <div className="card-actions justify-end">
              <span className="text-xs text-base-content/50">Click to inspect runs</span>
            </div>
          </div>
        </div>

        {/* Variables Card */}
        <div
          className={`card shadow-xl cursor-pointer hover:bg-base-200 transition-colors ${
            stats.variableErrorCount > 0
              ? "bg-error/10"
              : stats.variableWarningCount > 0
              ? "bg-warning/10"
              : "bg-base-100"
          }`}
          onClick={() => onNavigate("variables")}
        >
          <div className="card-body">
            <h2 className="card-title text-sm text-base-content/70">Extracted Variables</h2>
            <div className="flex gap-4 items-baseline">
              <div
                className={`text-4xl font-bold ${
                  stats.variableErrorCount > 0
                    ? "text-error"
                    : stats.variableWarningCount > 0
                    ? "text-warning"
                    : "text-secondary"
                }`}
              >
                {stats.variableCount}
              </div>
              {(stats.variableErrorCount > 0 || stats.variableWarningCount > 0) && (
                <div className="text-sm">
                  {stats.variableErrorCount > 0 && (
                    <span className="text-error font-bold">{stats.variableErrorCount} Errors</span>
                  )}
                  {stats.variableErrorCount > 0 && stats.variableWarningCount > 0 && (
                    <span className="mx-1">•</span>
                  )}
                  {stats.variableWarningCount > 0 && (
                    <span className="text-warning font-bold">
                      {stats.variableWarningCount} Warnings
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="card-actions justify-end">
              <span className="text-xs text-base-content/50">
                Click to view variables and data quality issues
              </span>
            </div>
          </div>
        </div>

        {/* Diagnostics Card */}
        <div
          className={`card shadow-xl cursor-pointer hover:bg-base-200 transition-colors ${
            stats.structuralErrorCount > 0
              ? "bg-error/10"
              : stats.structuralWarningCount > 0
              ? "bg-warning/10"
              : "bg-success/10"
          }`}
          onClick={() => onNavigate("diagnostics")}
        >
          <div className="card-body">
            <h2 className="card-title text-sm text-base-content/70">Structural Consistency</h2>
            <div className="flex gap-4 items-baseline">
              <div
                className={`text-4xl font-bold ${
                  stats.structuralErrorCount > 0 ? "text-error" : ""
                }`}
              >
                {stats.structuralIssueCount}
              </div>
              {(stats.structuralErrorCount > 0 || stats.structuralWarningCount > 0) && (
                <div className="text-sm">
                  {stats.structuralErrorCount > 0 && (
                    <span className="text-error font-bold">
                      {stats.structuralErrorCount} Errors
                    </span>
                  )}
                  {stats.structuralErrorCount > 0 && stats.structuralWarningCount > 0 && (
                    <span className="mx-1">•</span>
                  )}
                  {stats.structuralWarningCount > 0 && (
                    <span className="text-warning font-bold">
                      {stats.structuralWarningCount} Warnings
                    </span>
                  )}
                </div>
              )}
              {stats.structuralIssueCount === 0 && (
                <span className="text-success font-bold text-sm">All Consistent</span>
              )}
            </div>
            <div className="card-actions justify-end">
              <span className="text-xs text-base-content/50">
                Click to view structural diagnostics
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
