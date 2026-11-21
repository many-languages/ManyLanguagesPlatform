import type { Diagnostic } from "../../../../../domain/variables/types"
import DiagnosticItem from "./DiagnosticItem"

interface ExtractionDiagnosticsListProps {
  diagnostics: {
    run: Diagnostic[]
    component: Map<number, Diagnostic[]>
    variable: Map<string, { variableName: string; diagnostics: Diagnostic[] }>
  }
}

const hasError = (diagnostics: Diagnostic[]) => diagnostics.some((d) => d.severity === "error")

/**
 * Lists the issues found while extracting variables from the pilot runs (run-, component- and
 * variable-level). Errors are listed before warnings so they are the first thing researchers see.
 *
 * Component-level issues have no variable to attach to (e.g. a component that returned no data),
 * so this list is the only place they show up in Step 4.
 */
export default function ExtractionDiagnosticsList({ diagnostics }: ExtractionDiagnosticsListProps) {
  const { run, component, variable } = diagnostics

  if (run.length === 0 && component.size === 0 && variable.size === 0) {
    return (
      <div className="p-12 text-center">
        <div className="text-success text-lg font-bold mb-2">No Extraction Issues Detected</div>
        <p className="text-base-content/60">All pilot data could be read without problems.</p>
      </div>
    )
  }

  // Array.prototype.sort is stable, so entries keep their order within each group
  const components = Array.from(component.entries()).sort(
    ([, a], [, b]) => Number(hasError(b)) - Number(hasError(a))
  )
  const variables = Array.from(variable.entries()).sort(
    ([, a], [, b]) => Number(hasError(b.diagnostics)) - Number(hasError(a.diagnostics))
  )
  const sortedRun = [...run].sort(
    (a, b) => Number(b.severity === "error") - Number(a.severity === "error")
  )

  return (
    <div className="space-y-6">
      {sortedRun.length > 0 && (
        <section>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            Run Issues
            <span className="badge badge-ghost badge-sm">{sortedRun.length}</span>
          </h3>
          <div className="space-y-2">
            {sortedRun.map((d, i) => (
              <DiagnosticItem key={i} diagnostic={d} />
            ))}
          </div>
        </section>
      )}

      {components.length > 0 && (
        <section>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            Component Issues
            <span className="badge badge-ghost badge-sm">{components.length}</span>
          </h3>
          <div className="space-y-4">
            {components.map(([componentId, diags]) => (
              <div key={componentId}>
                <div className="font-semibold text-sm mb-2">Component ID: {componentId}</div>
                {diags.map((d, i) => (
                  <DiagnosticItem key={i} diagnostic={d} />
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {variables.length > 0 && (
        <section>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            Variable Issues
            <span className="badge badge-ghost badge-sm">{variables.length}</span>
          </h3>
          <div className="space-y-4">
            {variables.map(([key, data]) => (
              <div key={key} className="collapse collapse-arrow bg-base-100 border border-base-200">
                <input type="checkbox" />
                <div className="collapse-title font-mono text-sm font-semibold flex items-center gap-2">
                  {data.variableName}
                  <span className="badge badge-ghost badge-sm">
                    {data.diagnostics.length} {data.diagnostics.length === 1 ? "issue" : "issues"}
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
    </div>
  )
}
