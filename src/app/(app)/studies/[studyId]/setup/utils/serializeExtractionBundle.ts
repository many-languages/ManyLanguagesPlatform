import type {
  Diagnostic,
  ExtractedVariable,
  ExtractionBundle,
  ExtractionObservation,
} from "../../variables/types"

export type SerializedDiagnostics = {
  run: Diagnostic[]
  component: Array<[number, Diagnostic[]]>
  variable: Array<[string, { variableName: string; diagnostics: Diagnostic[] }]>
  crossRun?: {
    run: Diagnostic[]
    component: Array<[number, Diagnostic[]]>
    variable: Array<[string, { variableName: string; diagnostics: Diagnostic[] }]>
  }
}

export type SerializedExtractionBundle = {
  variables: ExtractedVariable[]
  observations: ExtractionObservation[]
  diagnostics: SerializedDiagnostics
}

export function serializeExtractionBundle(bundle: ExtractionBundle): SerializedExtractionBundle {
  return {
    variables: bundle.variables,
    observations: bundle.observations,
    diagnostics: {
      run: bundle.diagnostics.run,
      component: Array.from(bundle.diagnostics.component.entries()),
      variable: Array.from(bundle.diagnostics.variable.entries()),
      crossRun: bundle.diagnostics.crossRun
        ? {
            run: bundle.diagnostics.crossRun.run,
            component: Array.from(bundle.diagnostics.crossRun.component.entries()),
            variable: Array.from(bundle.diagnostics.crossRun.variable.entries()),
          }
        : undefined,
    },
  }
}
