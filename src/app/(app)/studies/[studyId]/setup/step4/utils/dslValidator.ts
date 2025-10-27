import { EnrichedJatosStudyResult } from "@/src/types/jatos"

export interface DSLError {
  type: "variable" | "stat" | "conditional" | "filter" | "syntax"
  message: string
  start: number
  end: number
  severity: "error" | "warning"
}

export interface ValidationResult {
  errors: DSLError[]
  isValid: boolean
}

/**
 * Validates DSL syntax and checks for common errors
 */
export function validateDSL(
  template: string,
  enrichedResult: EnrichedJatosStudyResult
): ValidationResult {
  const errors: DSLError[] = []

  // Get available variables
  const availableVariables = extractAvailableVariables(enrichedResult)
  const availableFields = extractAvailableFields(enrichedResult)

  // Validate variables: {{ var:name:modifier | where: condition }}
  const varRegex =
    /\{\{\s*var:([a-zA-Z0-9_\.]+)(?::([a-zA-Z0-9_]+))?(?:\s*\|\s*where:\s*([\s\S]*?))?\s*\}\}/g
  let varMatch
  while ((varMatch = varRegex.exec(template)) !== null) {
    const [fullMatch, varName, modifier, whereClause] = varMatch
    const start = varMatch.index
    const end = start + fullMatch.length

    // Check if variable exists
    if (!availableVariables.includes(varName)) {
      errors.push({
        type: "variable",
        message: `Variable '${varName}' does not exist in the data`,
        start,
        end,
        severity: "error",
      })
    }

    // Check modifier validity
    if (modifier && !["first", "last", "all"].includes(modifier)) {
      errors.push({
        type: "variable",
        message: `Invalid modifier '${modifier}'. Valid modifiers: first, last, all`,
        start,
        end,
        severity: "error",
      })
    }

    // Validate where clause if present
    if (whereClause) {
      const filterErrors = validateFilterClause(
        whereClause,
        availableFields,
        start + fullMatch.indexOf("where:") + 6
      )
      errors.push(...filterErrors)
    }
  }

  // Validate stats: {{ stat:var.metric | where: condition }}
  const statRegex =
    /\{\{\s*stat:([a-zA-Z0-9_\.]+)\.(avg|median|sd|count)(?:\s*\|\s*where:\s*([\s\S]*?))?\s*\}\}/g
  let statMatch
  while ((statMatch = statRegex.exec(template)) !== null) {
    const [fullMatch, varName, metric, whereClause] = statMatch
    const start = statMatch.index
    const end = start + fullMatch.length

    // Check if variable exists
    if (!availableVariables.includes(varName)) {
      errors.push({
        type: "stat",
        message: `Variable '${varName}' does not exist in the data`,
        start,
        end,
        severity: "error",
      })
    }

    // Check metric validity
    const validMetrics = ["avg", "median", "sd", "count"]
    if (!validMetrics.includes(metric)) {
      errors.push({
        type: "stat",
        message: `Invalid metric '${metric}'. Valid metrics: ${validMetrics.join(", ")}`,
        start,
        end,
        severity: "error",
      })
    }

    // Validate where clause if present
    if (whereClause) {
      const filterErrors = validateFilterClause(
        whereClause,
        availableFields,
        start + fullMatch.indexOf("where:") + 6
      )
      errors.push(...filterErrors)
    }
  }

  // Validate conditionals: {{#if condition}}...{{else}}...{{/if}}
  const conditionalRegex =
    /\{\{#if\s+([^}]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/?if\}\}/g
  let conditionalMatch
  while ((conditionalMatch = conditionalRegex.exec(template)) !== null) {
    const [fullMatch, condition, thenPart, elsePart] = conditionalMatch
    const start = conditionalMatch.index
    const end = start + fullMatch.length

    // Validate condition expression
    const conditionErrors = validateConditionExpression(
      condition,
      availableFields,
      start + fullMatch.indexOf(condition)
    )
    errors.push(...conditionErrors)
  }

  // Check for unclosed tags
  const unclosedErrors = validateUnclosedTags(template)
  errors.push(...unclosedErrors)

  // Check for malformed syntax
  const malformedErrors = validateMalformedSyntax(template)
  errors.push(...malformedErrors)

  return {
    errors,
    isValid: errors.length === 0,
  }
}

/**
 * Validates filter clauses in where conditions
 */
function validateFilterClause(
  whereClause: string,
  availableFields: any[],
  offset: number
): DSLError[] {
  const errors: DSLError[] = []

  // Simple validation for now - check for basic field references
  const fieldRegex = /\b([a-zA-Z0-9_\.]+)\b/g
  let fieldMatch
  while ((fieldMatch = fieldRegex.exec(whereClause)) !== null) {
    const fieldName = fieldMatch[1]
    const start = offset + fieldMatch.index
    const end = start + fieldName.length

    // Skip operators and literals
    if (
      ["and", "or", "not", "true", "false", "==", "!=", ">", "<", ">=", "<="].includes(fieldName)
    ) {
      continue
    }

    // Check if field exists
    if (!availableFields.some((field) => field.name === fieldName)) {
      errors.push({
        type: "filter",
        message: `Field '${fieldName}' does not exist in the data`,
        start,
        end,
        severity: "error",
      })
    }
  }

  return errors
}

/**
 * Validates condition expressions in if statements
 */
function validateConditionExpression(
  condition: string,
  availableFields: any[],
  offset: number
): DSLError[] {
  const errors: DSLError[] = []

  // Extract variable references in condition
  const varRegex = /var:([a-zA-Z0-9_\.]+)(?::([a-zA-Z0-9_]+))?/g
  let varMatch
  while ((varMatch = varRegex.exec(condition)) !== null) {
    const [fullMatch, varName, modifier] = varMatch
    const start = offset + varMatch.index
    const end = start + fullMatch.length

    // Check if variable exists
    if (!availableFields.some((field) => field.name === varName)) {
      errors.push({
        type: "conditional",
        message: `Variable '${varName}' does not exist in the data`,
        start,
        end,
        severity: "error",
      })
    }

    // Check modifier validity
    if (modifier && !["first", "last", "all"].includes(modifier)) {
      errors.push({
        type: "conditional",
        message: `Invalid modifier '${modifier}'. Valid modifiers: first, last, all`,
        start,
        end,
        severity: "error",
      })
    }
  }

  return errors
}

/**
 * Validates for unclosed tags
 */
function validateUnclosedTags(template: string): DSLError[] {
  const errors: DSLError[] = []

  // Check for unclosed {{ tags
  const openTags = template.match(/\{\{/g) || []
  const closeTags = template.match(/\}\}/g) || []

  if (openTags.length !== closeTags.length) {
    errors.push({
      type: "syntax",
      message: `Unclosed tags: ${openTags.length} opening {{ but ${closeTags.length} closing }}`,
      start: 0,
      end: template.length,
      severity: "error",
    })
  }

  // Check for unclosed conditional blocks
  const ifBlocks = template.match(/\{\{#if/g) || []
  const endIfBlocks = template.match(/\{\{\/?if\}\}/g) || []

  if (ifBlocks.length !== endIfBlocks.length) {
    errors.push({
      type: "syntax",
      message: `Unclosed conditional blocks: ${ifBlocks.length} {{#if but ${endIfBlocks.length} {{/if}}`,
      start: 0,
      end: template.length,
      severity: "error",
    })
  }

  return errors
}

/**
 * Validates for malformed syntax
 */
function validateMalformedSyntax(template: string): DSLError[] {
  const errors: DSLError[] = []

  // Check for malformed variable syntax
  const malformedVarRegex = /\{\{\s*var:[^}]*\}\}/g
  let match
  while ((match = malformedVarRegex.exec(template)) !== null) {
    const content = match[0]
    if (
      !content.match(
        /\{\{\s*var:[a-zA-Z0-9_\.]+(?::[a-zA-Z0-9_]+)?(?:\s*\|\s*where:\s*[^}]*)?\s*\}\}/
      )
    ) {
      errors.push({
        type: "syntax",
        message: "Malformed variable syntax",
        start: match.index,
        end: match.index + content.length,
        severity: "error",
      })
    }
  }

  // Check for malformed stat syntax
  const malformedStatRegex = /\{\{\s*stat:[^}]*\}\}/g
  while ((match = malformedStatRegex.exec(template)) !== null) {
    const content = match[0]
    if (
      !content.match(/\{\{\s*stat:[a-zA-Z0-9_\.]+\.[a-zA-Z0-9_]+(?:\s*\|\s*where:\s*[^}]*)?\s*\}\}/)
    ) {
      errors.push({
        type: "syntax",
        message: "Malformed stat syntax",
        start: match.index,
        end: match.index + content.length,
        severity: "error",
      })
    }
  }

  return errors
}

/**
 * Extracts available variables from enriched result
 */
function extractAvailableVariables(enrichedResult: EnrichedJatosStudyResult): string[] {
  const variables = new Set<string>()

  for (const comp of enrichedResult.componentResults) {
    const data = comp.parsedData as any
    if (!data) continue

    if (Array.isArray(data)) {
      for (const trial of data) {
        if (trial && typeof trial === "object") {
          for (const key of Object.keys(trial)) {
            variables.add(key)
          }
        }
      }
    } else if (typeof data === "object") {
      for (const key of Object.keys(data)) {
        variables.add(key)
      }
    }
  }

  return Array.from(variables)
}

/**
 * Extracts available fields from enriched result
 */
function extractAvailableFields(enrichedResult: EnrichedJatosStudyResult): any[] {
  const fields = new Set<string>()
  const fieldTypes = new Map<string, string>()

  for (const comp of enrichedResult.componentResults) {
    const data = comp.parsedData as any
    if (!data) continue

    if (Array.isArray(data)) {
      for (const trial of data) {
        if (trial && typeof trial === "object") {
          for (const [key, value] of Object.entries(trial)) {
            fields.add(key)
            fieldTypes.set(key, getFieldType(value))
          }
        }
      }
    } else if (typeof data === "object") {
      for (const [key, value] of Object.entries(data)) {
        fields.add(key)
        fieldTypes.set(key, getFieldType(value))
      }
    }
  }

  return Array.from(fields).map((name) => ({
    name,
    type: fieldTypes.get(name) || "string",
  }))
}

function getFieldType(value: any): string {
  if (typeof value === "number") return "number"
  if (typeof value === "boolean") return "boolean"
  if (typeof value === "string") return "string"
  return "string"
}
