/** Shared with feedback template rendering and cohort aggregation (lib layer). */

export type Primitive = string | number | boolean | null

export type FeedbackRenderContext = {
  vars: Record<string, Primitive[]>
  numericSeries: Record<string, number[]>
  rows: Record<string, Record<string, Primitive>>
}

/** Structural subset of `ExtractionBundle` inputs for building a render context. */
export type FeedbackRenderBundleInput = {
  variables: { variableKey: string; variableName: string }[]
  observations: {
    variableKey: string
    scopeKeyId: string
    rowKeyId: string
    valueJson: string
  }[]
}
