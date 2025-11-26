/**
 * Unified Parser Interface
 *
 * Automatically detects format and parses data files.
 * Returns structured data similar to JSON parser output.
 */

import { detectFormat, type FormatDetectionResult } from "./formatDetector"
import { parseCsv, type CsvParseResult } from "./csvParser"

export interface ParseResult {
  data: any // Parsed data (object, array, or null)
  format: FormatDetectionResult
  success: boolean
  error?: string
  csvResult?: CsvParseResult // If CSV was parsed, includes full CSV result
}

/**
 * Unified parsing interface that automatically detects and parses
 */
export function parseData(content: string | null): ParseResult {
  if (!content) {
    return {
      data: null,
      format: {
        format: "text",
        confidence: 1.0,
        message: "No content provided",
      },
      success: false,
      error: "No content to parse",
    }
  }

  // Detect format
  const format = detectFormat(content)

  // Parse based on detected format
  switch (format.format) {
    case "json": {
      try {
        const data = JSON.parse(content)
        return {
          data,
          format,
          success: true,
        }
      } catch (error) {
        return {
          data: null,
          format,
          success: false,
          error: error instanceof Error ? error.message : "JSON parse failed",
        }
      }
    }

    case "csv":
    case "tsv": {
      try {
        const delimiter = format.delimiter || (format.format === "tsv" ? "\t" : ",")
        const csvResult = parseCsv(content, {
          delimiter,
          hasHeader: true,
        })

        if (csvResult.errors.length > 0 && csvResult.data.length === 0) {
          return {
            data: null,
            format,
            success: false,
            error: csvResult.errors.join("; "),
            csvResult,
          }
        }

        // Return CSV data as array of objects (similar to JSON array structure)
        return {
          data: csvResult.data,
          format,
          success: true,
          csvResult,
        }
      } catch (error) {
        return {
          data: null,
          format,
          success: false,
          error: error instanceof Error ? error.message : "CSV/TSV parse failed",
        }
      }
    }

    case "text":
    default: {
      // Return raw text as string
      return {
        data: content,
        format,
        success: true,
      }
    }
  }
}

/**
 * Export individual parsers for direct use if needed
 */
export { detectFormat, type FormatDetectionResult, type DataFormat } from "./formatDetector"
export { parseCsv, type CsvParseResult, type CsvParseOptions } from "./csvParser"
