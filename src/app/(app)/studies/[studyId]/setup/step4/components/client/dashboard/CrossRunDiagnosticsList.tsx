import { Diagnostic } from "../../../../../variables/types"
import { ExclamationCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline"

interface CrossRunDiagnosticsListProps {
  diagnostics?: {
    run: Diagnostic[]
    component: Map<number, Diagnostic[]>
    variable: Map<string, { variableName: string; diagnostics: Diagnostic[] }>
  }
}

function DiagnosticItem({ diagnostic }: { diagnostic: Diagnostic }) {
  const Icon = diagnostic.severity === "error" ? ExclamationCircleIcon : ExclamationTriangleIcon
  const color = diagnostic.severity === "error" ? "text-error" : "text-warning"

  return (
    <div className="alert bg-base-100 shadow-sm border border-base-200 mb-2 flex items-start">
      <Icon className={`${color} mt-1 w-5 h-5`} />
      <div className="flex-1">
        <h3 className={`font-semibold text-sm ${color}`}>{diagnostic.code}</h3>
        <p className="text-sm">{diagnostic.message}</p>

        {/* Metadata Rendering if needed */}
        {diagnostic.metadata && (
          <div className="mt-1 text-xs text-base-content/60 font-mono">
            {diagnostic.metadata.threshold && (
              <span>Threshold: {diagnostic.metadata.threshold} </span>
            )}
            {diagnostic.metadata.count && <span>Count: {diagnostic.metadata.count}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

export default function CrossRunDiagnosticsList({ diagnostics }: CrossRunDiagnosticsListProps) {
  if (!diagnostics) {
    return (
      <div className="p-8 text-center text-base-content/50">
        No cross-run diagnostics available.
      </div>
    )
  }

  const { run, component, variable } = diagnostics
  const hasResult = run.length > 0 || component.size > 0 || variable.size > 0

  if (!hasResult) {
    return (
      <div className="p-12 text-center">
        <div className="text-success text-lg font-bold mb-2">No Cross-Run Issues Detected</div>
        <p className="text-base-content/60">All pilot runs appear consistent with each other.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Global Run Diagnostics */}
      {run.length > 0 && (
        <section>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            Run Consistency
            <span className="badge badge-error badge-sm">{run.length}</span>
          </h3>
          <div className="space-y-2">
            {run.map((d, i) => (
              <DiagnosticItem key={i} diagnostic={d} />
            ))}
          </div>
        </section>
      )}

      {/* Variable Diagnostics */}
      {variable.size > 0 && (
        <section>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            Variable Mismatches
            <span className="badge badge-warning badge-sm">{variable.size}</span>
          </h3>
          <div className="space-y-4">
            {Array.from(variable.entries()).map(([key, data]) => (
              <div key={key} className="collapse collapse-arrow bg-base-100 border border-base-200">
                <input type="checkbox" />
                <div className="collapse-title font-mono text-sm font-semibold flex items-center gap-2">
                  {data.variableName}
                  <span className="badge badge-ghost badge-sm">
                    {data.diagnostics.length} issues
                  </span>
                </div>
                <div className="collapse-content pt-2">
                  {data.diagnostics.map((d, i) => (
                    <DiagnosticItem key={i} diagnostic={d} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Component Diagnostics */}
      {component.size > 0 && (
        <section>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            Component Issues
            <span className="badge badge-error badge-sm">{component.size}</span>
          </h3>
          <div className="space-y-4">
            {Array.from(component.entries()).map(([id, diags]) => (
              <div key={id} className="collapse collapse-arrow bg-base-100 border border-base-200">
                <input type="checkbox" />
                <div className="collapse-title font-semibold text-sm">Component ID: {id}</div>
                <div className="collapse-content pt-2">
                  {diags.map((d, i) => (
                    <DiagnosticItem key={i} diagnostic={d} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
