"use client"

import type { Diagnostic } from "../../../../variables/types"

interface StructureDiagnosticsProps {
  diagnostics: {
    run: Diagnostic[]
    component: Map<number, Diagnostic[]>
    variable: Map<string, { variableName: string; diagnostics: Diagnostic[] }>
  }
}

export default function StructureDiagnostics({ diagnostics }: StructureDiagnosticsProps) {
  const variablesWithDiagnostics = Array.from(diagnostics.variable.entries())

  return (
    <div className="space-y-4">
      <div className="card bg-base-200 p-4">
        <h3 className="font-semibold mb-2">Run Diagnostics</h3>
        {diagnostics.run.length === 0 ? (
          <div className="text-sm text-muted-content">No run-level diagnostics.</div>
        ) : (
          <div className="space-y-2">
            {diagnostics.run.map((diagnostic, idx) => (
              <div key={`run-${idx}`} className="alert alert-warning">
                <span>
                  [{diagnostic.severity}] {diagnostic.code}: {diagnostic.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card bg-base-200 p-4">
        <h3 className="font-semibold mb-2">Component Diagnostics</h3>
        {diagnostics.component.size === 0 ? (
          <div className="text-sm text-muted-content">No component-level diagnostics.</div>
        ) : (
          <div className="space-y-3">
            {Array.from(diagnostics.component.entries()).map(([componentId, diags]) => (
              <div key={`component-${componentId}`} className="space-y-2">
                <div className="text-sm font-medium">Component {componentId}</div>
                {diags.map((diagnostic, idx) => (
                  <div key={`component-${componentId}-${idx}`} className="alert alert-warning">
                    <span>
                      [{diagnostic.severity}] {diagnostic.code}: {diagnostic.message}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card bg-base-200 p-4">
        <h3 className="font-semibold mb-2">Variable Diagnostics</h3>
        {variablesWithDiagnostics.length === 0 ? (
          <div className="text-sm text-muted-content">No variable-level diagnostics.</div>
        ) : (
          <div className="space-y-3">
            {variablesWithDiagnostics.map(([variableKey, variableEntry]) => (
              <div key={variableKey} className="space-y-2">
                <div className="text-sm font-medium">
                  {variableEntry.variableName}{" "}
                  <span className="text-xs text-muted-content">({variableKey})</span>
                </div>
                {variableEntry.diagnostics.map((diagnostic, idx) => (
                  <div key={`variable-${variableKey}-${idx}`} className="alert alert-warning">
                    <span>
                      [{diagnostic.severity}] {diagnostic.code}: {diagnostic.message}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
