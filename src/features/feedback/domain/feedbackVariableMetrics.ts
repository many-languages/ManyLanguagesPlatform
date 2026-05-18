export interface FeedbackMetric {
  key: string
  label: string
  description: string
}

export const METRICS: FeedbackMetric[] = [
  { key: "avg", label: "Average", description: "Mean value" },
  { key: "median", label: "Median", description: "Middle value" },
  { key: "sd", label: "Std Dev", description: "Standard deviation" },
  { key: "count", label: "Count", description: "Number of trials" },
]

/**
 * Returns the metrics available for a given variable type.
 * Only numeric variables support avg/median/sd; all others are count-only.
 */
export function getMetricsForVariableType(variableType: string): FeedbackMetric[] {
  if (variableType === "number") return METRICS
  return METRICS.filter((m) => m.key === "count")
}
