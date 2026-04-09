import {
  createBareVarReferenceRegex,
  createConditionalBlockRegex,
  createFeedbackStatPlaceholderRegex,
  createMalformedStatSpanRegex,
  createMalformedVarSpanRegex,
  createStatPlaceholderWellFormedPattern,
  createVarPlaceholderRegex,
  createVarPlaceholderWellFormedPattern,
  findWhereClauseFieldReferences,
} from "@/src/lib/feedback/feedbackDslPatterns"
import type { FeedbackVariable } from "../types"

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
  variables: FeedbackVariable[],
  hiddenVariables?: Set<string>
): ValidationResult {
  const errors: DSLError[] = []

  const variableNames = new Set(variables.map((v) => v.variableName))
  const availableFields = variables.map((v) => ({
    name: v.variableName,
    type: v.type,
  }))

  const varRegex = createVarPlaceholderRegex()
  let varMatch
  while ((varMatch = varRegex.exec(template)) !== null) {
    const [fullMatch, varName, modifier, whereClause] = varMatch
    const start = varMatch.index
    const end = start + fullMatch.length

    if (!variableNames.has(varName)) {
      if (hiddenVariables?.has(varName)) {
        errors.push({
          type: "variable",
          message: `Variable '${varName}' is marked as personal data and cannot be used`,
          start,
          end,
          severity: "error",
        })
      } else {
        errors.push({
          type: "variable",
          message: `Variable '${varName}' does not exist in the data`,
          start,
          end,
          severity: "error",
        })
      }
    }

    if (modifier && !["first", "last", "all"].includes(modifier)) {
      errors.push({
        type: "variable",
        message: `Invalid modifier '${modifier}'. Valid modifiers: first, last, all`,
        start,
        end,
        severity: "error",
      })
    }

    if (whereClause) {
      const filterErrors = validateFilterClause(
        whereClause,
        availableFields,
        start + fullMatch.indexOf("where:") + 6
      )
      errors.push(...filterErrors)
    }
  }

  const statRegex = createFeedbackStatPlaceholderRegex()
  let statMatch
  while ((statMatch = statRegex.exec(template)) !== null) {
    const [fullMatch, varName, metric, scope, whereClause] = statMatch
    const start = statMatch.index
    const end = start + fullMatch.length

    if (!variableNames.has(varName)) {
      errors.push({
        type: "stat",
        message: `Variable '${varName}' does not exist in the data`,
        start,
        end,
        severity: "error",
      })
    }

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

    if (scope && !["within", "across"].includes(scope)) {
      errors.push({
        type: "stat",
        message: `Invalid scope '${scope}'. Valid scopes: within, across`,
        start,
        end,
        severity: "error",
      })
    }

    if (whereClause) {
      const filterErrors = validateFilterClause(
        whereClause,
        availableFields,
        start + fullMatch.indexOf("where:") + 6
      )
      errors.push(...filterErrors)
    }
  }

  const conditionalRegex = createConditionalBlockRegex()
  let conditionalMatch
  while ((conditionalMatch = conditionalRegex.exec(template)) !== null) {
    const [fullMatch, condition] = conditionalMatch
    const start = conditionalMatch.index

    const conditionErrors = validateConditionExpression(
      condition,
      availableFields,
      start + fullMatch.indexOf(condition)
    )
    errors.push(...conditionErrors)
  }

  const unclosedErrors = validateUnclosedTags(template)
  errors.push(...unclosedErrors)

  const malformedErrors = validateMalformedSyntax(template)
  errors.push(...malformedErrors)

  return {
    errors,
    isValid: errors.length === 0,
  }
}

function validateFilterClause(
  whereClause: string,
  availableFields: { name: string; type: string }[],
  offset: number
): DSLError[] {
  const errors: DSLError[] = []

  for (const ref of findWhereClauseFieldReferences(whereClause)) {
    if (!availableFields.some((field) => field.name === ref.name)) {
      errors.push({
        type: "filter",
        message: `Field '${ref.name}' does not exist in the data`,
        start: offset + ref.start,
        end: offset + ref.end,
        severity: "error",
      })
    }
  }

  return errors
}

function validateConditionExpression(
  condition: string,
  availableFields: { name: string; type: string }[],
  offset: number
): DSLError[] {
  const errors: DSLError[] = []

  const varRegex = createBareVarReferenceRegex()
  let varMatch
  while ((varMatch = varRegex.exec(condition)) !== null) {
    const [fullMatch, varName, modifier] = varMatch
    const start = offset + varMatch.index
    const end = start + fullMatch.length

    if (!availableFields.some((field) => field.name === varName)) {
      errors.push({
        type: "conditional",
        message: `Variable '${varName}' does not exist in the data`,
        start,
        end,
        severity: "error",
      })
    }

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

function validateUnclosedTags(template: string): DSLError[] {
  const errors: DSLError[] = []

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

function validateMalformedSyntax(template: string): DSLError[] {
  const errors: DSLError[] = []

  const wellVar = createVarPlaceholderWellFormedPattern()
  const malformedVarRegex = createMalformedVarSpanRegex()
  let match
  while ((match = malformedVarRegex.exec(template)) !== null) {
    const content = match[0]
    if (!wellVar.test(content)) {
      errors.push({
        type: "syntax",
        message: "Malformed variable syntax",
        start: match.index,
        end: match.index + content.length,
        severity: "error",
      })
    }
  }

  const wellStat = createStatPlaceholderWellFormedPattern()
  const malformedStatRegex = createMalformedStatSpanRegex()
  while ((match = malformedStatRegex.exec(template)) !== null) {
    const content = match[0]
    if (!wellStat.test(content)) {
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
