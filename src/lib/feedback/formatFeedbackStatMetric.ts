import type { Primitive } from "./types"

function toNumericSeries(values: Primitive[]): number[] {
  const series: number[] = []
  for (const value of values) {
    if (typeof value === "number") {
      series.push(value)
    } else if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
      series.push(Number(value))
    }
  }
  return series
}

function round(n: number, d: number): number {
  const f = Math.pow(10, d)
  return Math.round(n * f) / f
}

function safeNum(n: number | null): string {
  return n === null ? "" : String(round(n, 2))
}

function mean(xs: number[]): number | null {
  if (xs.length === 0) return null
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[mid - 1]! + s[mid]!) / 2 : s[mid]!
}

function sd(xs: number[]): number | null {
  if (xs.length === 0) return null
  const m = mean(xs)!
  const v = xs.reduce((acc, x) => acc + (x - m) * (x - m), 0) / xs.length
  return Math.sqrt(v)
}

/**
 * Formats `avg` | `median` | `sd` | `count` for feedback templates.
 * Shared by precomputed `stat:…:across` maps and runtime rendering in `renderTemplateWithContext`.
 */
export function formatFeedbackStatMetric(metric: string, values: Primitive[]): string {
  if (metric === "count") return String(values.length)
  const series = toNumericSeries(values)
  if (metric === "avg") return safeNum(mean(series))
  if (metric === "median") return safeNum(median(series))
  if (metric === "sd") return safeNum(sd(series))
  return ""
}
