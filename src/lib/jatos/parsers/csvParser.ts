/**
 * CSV/TSV Parser
 *
 * Parses CSV/TSV data to array of objects.
 * Handles headers, quoted values, different delimiters.
 */

export interface CsvParseOptions {
  delimiter?: string // Default: auto-detect (comma, tab, semicolon, pipe)
  hasHeader?: boolean // Default: true (first row is headers)
  quoteChar?: string // Default: '"'
}

export interface CsvParseResult {
  data: Record<string, any>[] // Array of objects with header keys
  headers: string[]
  rowCount: number
  errors: string[]
}

/**
 * Parse CSV/TSV content into array of objects
 */
export function parseCsv(content: string, options: CsvParseOptions = {}): CsvParseResult {
  const { delimiter, hasHeader = true, quoteChar = '"' } = options

  const errors: string[] = []
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    return {
      data: [],
      headers: [],
      rowCount: 0,
      errors: ["No content to parse"],
    }
  }

  // Auto-detect delimiter if not provided
  const detectedDelimiter = delimiter || detectDelimiter(lines.slice(0, Math.min(10, lines.length)))

  // Parse lines with proper handling of quoted values
  const parsedLines: string[][] = []

  for (const line of lines) {
    try {
      const parsed = parseLine(line, detectedDelimiter, quoteChar)
      parsedLines.push(parsed)
    } catch (error) {
      errors.push(
        `Line ${parsedLines.length + 1}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  if (parsedLines.length === 0) {
    return {
      data: [],
      headers: [],
      rowCount: 0,
      errors: errors.length > 0 ? errors : ["No valid rows found"],
    }
  }

  // Determine headers
  let headers: string[]
  let dataStartIndex = 0

  if (hasHeader && parsedLines.length > 0) {
    headers = parsedLines[0].map((h, i) => h.trim() || `column_${i + 1}`)
    dataStartIndex = 1
  } else {
    // No header - generate column names
    const maxColumns = Math.max(...parsedLines.map((row) => row.length))
    headers = Array.from({ length: maxColumns }, (_, i) => `column_${i + 1}`)
  }

  // Normalize headers (ensure unique)
  const normalizedHeaders = normalizeHeaders(headers)

  // Convert rows to objects
  const data: Record<string, any>[] = []
  for (let i = dataStartIndex; i < parsedLines.length; i++) {
    const row = parsedLines[i]
    const obj: Record<string, any> = {}

    normalizedHeaders.forEach((header, colIndex) => {
      const value = row[colIndex]?.trim() || ""
      // Try to parse as number or boolean, otherwise keep as string
      obj[header] = parseValue(value)
    })

    data.push(obj)
  }

  return {
    data,
    headers: normalizedHeaders,
    rowCount: data.length,
    errors,
  }
}

/**
 * Detect the most likely delimiter from sample lines
 */
function detectDelimiter(sampleLines: string[]): string {
  if (sampleLines.length === 0) return ","

  const delimiterCounts: Record<string, number[]> = {
    ",": [] as number[],
    "\t": [] as number[],
    ";": [] as number[],
    "|": [] as number[],
  }

  sampleLines.forEach((line) => {
    Object.keys(delimiterCounts).forEach((delim) => {
      delimiterCounts[delim].push(
        (line.match(new RegExp(delim.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length
      )
    })
  })

  // Find delimiter with most consistent count
  let bestDelimiter = ","
  let bestScore = 0

  Object.entries(delimiterCounts).forEach(([delim, counts]) => {
    const avg = counts.reduce((sum, c) => sum + c, 0) / counts.length
    if (avg > 0) {
      const variance = counts.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / counts.length
      const score = avg / (variance + 1) // Higher avg, lower variance = better
      if (score > bestScore) {
        bestScore = score
        bestDelimiter = delim
      }
    }
  })

  return bestDelimiter
}

/**
 * Parse a single line, handling quoted values
 */
function parseLine(line: string, delimiter: string, quoteChar: string): string[] {
  const fields: string[] = []
  let currentField = ""
  let insideQuotes = false
  let i = 0

  while (i < line.length) {
    const char = line[i]
    const nextChar = i + 1 < line.length ? line[i + 1] : null

    if (char === quoteChar) {
      if (insideQuotes && nextChar === quoteChar) {
        // Escaped quote (double quote)
        currentField += quoteChar
        i += 2
      } else if (
        insideQuotes &&
        (nextChar === delimiter || nextChar === null || nextChar === "\r")
      ) {
        // End of quoted field
        insideQuotes = false
        i++
      } else if (!insideQuotes) {
        // Start of quoted field
        insideQuotes = true
        i++
      } else {
        // Quote in middle of quoted field (might be end)
        currentField += char
        i++
      }
    } else if (char === delimiter && !insideQuotes) {
      // Field separator
      fields.push(currentField)
      currentField = ""
      i++
    } else {
      currentField += char
      i++
    }
  }

  // Add the last field
  fields.push(currentField)

  return fields
}

/**
 * Normalize headers to ensure uniqueness
 */
function normalizeHeaders(headers: string[]): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []

  headers.forEach((header) => {
    let normalizedHeader = header.trim() || "unnamed"

    // Make it a valid identifier
    normalizedHeader = normalizedHeader.replace(/[^a-zA-Z0-9_]/g, "_")

    // Ensure uniqueness
    let uniqueHeader = normalizedHeader
    let counter = 1
    while (seen.has(uniqueHeader)) {
      uniqueHeader = `${normalizedHeader}_${counter}`
      counter++
    }

    seen.add(uniqueHeader)
    normalized.push(uniqueHeader)
  })

  return normalized
}

/**
 * Parse a string value to appropriate type (number, boolean, or string)
 */
function parseValue(value: string): any {
  if (value === "") return null

  // Try boolean
  const lower = value.toLowerCase()
  if (lower === "true") return true
  if (lower === "false") return false

  // Try number
  const num = Number(value)
  if (!isNaN(num) && isFinite(num) && value.trim() !== "") {
    // Check if it's an integer or float
    if (Number.isInteger(num) && value.indexOf(".") === -1) {
      return num
    }
    return num
  }

  // Return as string
  return value
}
