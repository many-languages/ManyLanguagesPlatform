/**
 * Transform CSV array-of-objects to row-oriented JSON structure
 * [{col1: v1, col2: v2}, {col1: v3, col2: v4}] -> {rows: [{col1: v1, col2: v2}, {col1: v3, col2: v4}]}
 * This preserves row relationships and works with the existing extraction pipeline
 */
export function transformCsvToObject(parsedData: any[]): Record<string, any> | null {
  if (!Array.isArray(parsedData) || parsedData.length === 0) {
    return null
  }

  const firstRow = parsedData[0]
  if (typeof firstRow !== "object" || firstRow === null) {
    return null
  }

  const columnNames = Object.keys(firstRow)
  if (columnNames.length === 0) {
    return null
  }

  // Transform to row-oriented structure: wrap in "rows" key
  return { rows: parsedData }
}
