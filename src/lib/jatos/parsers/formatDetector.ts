/**
 * Format Detection Utility
 *
 * Detects the format of JATOS data files (JSON, CSV, TSV, or plain text)
 * Returns format type and confidence level.
 */

export type DataFormat = "json" | "csv" | "tsv" | "text"

export interface FormatDetectionResult {
  format: DataFormat
  confidence: number // 0.0 to 1.0
  delimiter?: string // For CSV/TSV: comma, tab, etc.
  message: string
}

/**
 * Detect the format of a data string
 */
export function detectFormat(content: string): FormatDetectionResult {
  if (!content || content.trim().length === 0) {
    return {
      format: "text",
      confidence: 1.0,
      message: "Empty content",
    }
  }

  // Try JSON first - highest priority if valid
  try {
    const parsed = JSON.parse(content)
    // Valid JSON - check if it's structured data
    if (typeof parsed === "object" && parsed !== null) {
      return {
        format: "json",
        confidence: 1.0,
        message: "Valid JSON object",
      }
    }
    // Valid JSON but primitive - still JSON but less structured
    return {
      format: "json",
      confidence: 0.9,
      message: "Valid JSON (primitive value)",
    }
  } catch {
    // Not JSON, continue to other formats
  }

  // Check for CSV/TSV patterns
  const lines = content.split("\n").filter((line) => line.trim().length > 0)

  if (lines.length === 0) {
    return {
      format: "text",
      confidence: 1.0,
      message: "Empty content after filtering",
    }
  }

  // Analyze first few lines for CSV/TSV patterns
  const sampleLines = lines.slice(0, Math.min(10, lines.length))

  // Count delimiters per line
  const delimiterCounts: Record<string, number[]> = {
    comma: [] as number[],
    tab: [] as number[],
    semicolon: [] as number[],
    pipe: [] as number[],
  }

  sampleLines.forEach((line) => {
    delimiterCounts.comma.push((line.match(/,/g) || []).length)
    delimiterCounts.tab.push((line.match(/\t/g) || []).length)
    delimiterCounts.semicolon.push((line.match(/;/g) || []).length)
    delimiterCounts.pipe.push((line.match(/\|/g) || []).length)
  })

  // Calculate average delimiter counts (excluding lines with 0)
  const getAverage = (counts: number[]) => {
    const nonZero = counts.filter((c) => c > 0)
    if (nonZero.length === 0) return 0
    return nonZero.reduce((sum, c) => sum + c, 0) / nonZero.length
  }

  const averages = {
    comma: getAverage(delimiterCounts.comma),
    tab: getAverage(delimiterCounts.tab),
    semicolon: getAverage(delimiterCounts.semicolon),
    pipe: getAverage(delimiterCounts.pipe),
  }

  // Check if we have consistent delimiter usage (same count per line or very close)
  const getConsistency = (counts: number[]): number => {
    if (counts.length < 2) return 1.0
    const nonZero = counts.filter((c) => c > 0)
    if (nonZero.length < 2) return 0.5
    const uniqueCounts = new Set(nonZero)
    // Perfect consistency = all same count
    if (uniqueCounts.size === 1) return 1.0
    // Some variation - calculate variance
    const avg = getAverage(nonZero)
    const variance = nonZero.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / nonZero.length
    const stdDev = Math.sqrt(variance)
    // Normalize: lower stdDev relative to avg = higher consistency
    return Math.max(0, 1 - stdDev / (avg + 1))
  }

  // Find best delimiter candidate
  let bestDelimiter: { type: string; char: string; avg: number; consistency: number } | null = null

  if (averages.tab > 0) {
    const consistency = getConsistency(delimiterCounts.tab)
    if (!bestDelimiter || (consistency > 0.8 && averages.tab > bestDelimiter.avg)) {
      bestDelimiter = {
        type: "tsv",
        char: "\t",
        avg: averages.tab,
        consistency,
      }
    }
  }

  if (averages.comma > 0) {
    const consistency = getConsistency(delimiterCounts.comma)
    if (!bestDelimiter || (consistency > 0.8 && averages.comma > bestDelimiter.avg)) {
      bestDelimiter = {
        type: "csv",
        char: ",",
        avg: averages.comma,
        consistency,
      }
    }
  }

  if (averages.semicolon > 0) {
    const consistency = getConsistency(delimiterCounts.semicolon)
    if (!bestDelimiter || (consistency > 0.8 && averages.semicolon > bestDelimiter.avg)) {
      bestDelimiter = {
        type: "csv",
        char: ";",
        avg: averages.semicolon,
        consistency,
      }
    }
  }

  if (averages.pipe > 0) {
    const consistency = getConsistency(delimiterCounts.pipe)
    if (!bestDelimiter || (consistency > 0.8 && averages.pipe > bestDelimiter.avg)) {
      bestDelimiter = {
        type: "csv",
        char: "|",
        avg: averages.pipe,
        consistency,
      }
    }
  }

  // If we found a good delimiter pattern
  if (bestDelimiter && bestDelimiter.consistency > 0.7 && bestDelimiter.avg > 0) {
    const confidence = Math.min(0.95, bestDelimiter.consistency)
    return {
      format: bestDelimiter.type as DataFormat,
      confidence,
      delimiter: bestDelimiter.char,
      message: `Likely ${bestDelimiter.type.toUpperCase()} with '${
        bestDelimiter.char === "\t" ? "TAB" : bestDelimiter.char
      }' delimiter (${Math.round(confidence * 100)}% confidence)`,
    }
  }

  // Fallback to plain text
  return {
    format: "text",
    confidence: 0.5,
    message: "Plain text (no clear structured format detected)",
  }
}
