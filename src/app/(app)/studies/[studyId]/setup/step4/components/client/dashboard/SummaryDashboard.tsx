import Card from "@/src/app/components/Card"

interface SummaryDashboardProps {
  stats: {
    runCount: number
    variableCount: number
    diagnosticCount: number
    errorCount: number
    warningCount: number
  }
  onNavigate: (tab: "variables" | "diagnostics" | "inspector") => void
}

export default function SummaryDashboard({ stats, onNavigate }: SummaryDashboardProps) {
  return (
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
        className="card bg-base-100 shadow-xl cursor-pointer hover:bg-base-200 transition-colors"
        onClick={() => onNavigate("variables")}
      >
        <div className="card-body">
          <h2 className="card-title text-sm text-base-content/70">Extracted Variables</h2>
          <div className="text-4xl font-bold text-secondary">{stats.variableCount}</div>
          <div className="card-actions justify-end">
            <span className="text-xs text-base-content/50">Click to view variables</span>
          </div>
        </div>
      </div>

      {/* Diagnostics Card */}
      <div
        className={`card shadow-xl cursor-pointer hover:bg-base-200 transition-colors ${
          stats.errorCount > 0
            ? "bg-error/10"
            : stats.warningCount > 0
            ? "bg-warning/10"
            : "bg-success/10"
        }`}
        onClick={() => onNavigate("diagnostics")}
      >
        <div className="card-body">
          <h2 className="card-title text-sm text-base-content/70">Diagnostics</h2>
          <div className="flex gap-4 items-baseline">
            <div className={`text-4xl font-bold ${stats.errorCount > 0 ? "text-error" : ""}`}>
              {stats.diagnosticCount}
            </div>
            {(stats.errorCount > 0 || stats.warningCount > 0) && (
              <div className="text-sm">
                {stats.errorCount > 0 && (
                  <span className="text-error font-bold">{stats.errorCount} Errors</span>
                )}
                {stats.errorCount > 0 && stats.warningCount > 0 && <span className="mx-1">•</span>}
                {stats.warningCount > 0 && (
                  <span className="text-warning font-bold">{stats.warningCount} Warnings</span>
                )}
              </div>
            )}
            {stats.diagnosticCount === 0 && (
              <span className="text-success font-bold text-sm">All Good</span>
            )}
          </div>
          <div className="card-actions justify-end">
            <span className="text-xs text-base-content/50">Click to view issues</span>
          </div>
        </div>
      </div>
    </div>
  )
}
