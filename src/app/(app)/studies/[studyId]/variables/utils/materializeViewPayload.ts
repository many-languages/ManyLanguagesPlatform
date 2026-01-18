import type {
  ExtractionBundle,
  ExtractionView,
  ExtractionViewPayload,
  ExtractedVariable,
  PublicVariable,
} from "../types"

function toPublicVariables(variables: ExtractedVariable[], exampleLimit: number): PublicVariable[] {
  return variables.map(({ diagnostics, examples, ...rest }) => ({
    ...rest,
    examples: examples.slice(0, exampleLimit),
  }))
}

export function materializeViewPayload(
  bundle: ExtractionBundle,
  view: ExtractionView,
  options?: { exampleLimit?: number }
): ExtractionViewPayload {
  const exampleLimit = options?.exampleLimit ?? (view === "codebook" ? 3 : 5)
  const publicVariables = toPublicVariables(bundle.variables, exampleLimit)

  switch (view) {
    case "debug":
      return {
        view,
        variables: bundle.variables,
        diagnostics: bundle.diagnostics,
        observations: bundle.observations,
        stats: bundle.stats,
      }

    case "codebook":
      return { view, variables: publicVariables }

    case "feedback-authoring":
      return {
        view,
        variables: publicVariables,
        observations: bundle.observations,
        stats: bundle.stats,
      }

    case "feedback-render":
      return {
        view,
        variables: publicVariables,
        stats: bundle.stats,
      }
  }
}
