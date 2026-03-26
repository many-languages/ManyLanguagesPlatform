/**
 * Single public entry point for feedback template rendering.
 * Chains extraction → render context → template substitution (internal).
 */

import type { EnrichedJatosStudyResult } from "@/src/types/jatos"
import { computeAggregatedAcrossStatsForTemplate } from "@/src/lib/feedback/computeAggregatedAcrossStats"
import type { ExtractionBundle } from "../../variables/types"
import type { SerializedExtractionBundle } from "../../setup/utils/serializeExtractionBundle"
import type { FeedbackRenderBundleInput } from "@/src/lib/feedback/feedbackRenderContext"
import { extractVariableBundleForRenderFromResults } from "@/src/lib/feedback/extractVariableBundleForRender"
import { buildFeedbackRenderContext } from "@/src/lib/feedback/feedbackRenderContext"
import { extractRequiredVariableNames } from "@/src/lib/feedback/requiredVariableNames"
import { templateUsesStatAcross } from "@/src/lib/feedback/statAcrossKeys"
import { renderTemplateWithContext } from "./feedbackTemplateRenderer"

export type FeedbackRenderTemplateBundle =
  | ExtractionBundle
  | SerializedExtractionBundle
  | FeedbackRenderBundleInput

export type RenderFeedbackTemplateParams = {
  templateContent: string
  bundle: FeedbackRenderTemplateBundle
  requiredVariableNames: string[]
  withinStudyResultId?: number
  /** Precomputed `stat:...:across` values (e.g. static feedback). Omit for row-based across (e.g. Step 6 preview). */
  aggregatedAcrossStats?: Record<string, string>
}

export function renderFeedbackTemplate(params: RenderFeedbackTemplateParams): string {
  const context = buildFeedbackRenderContext(params.bundle, params.requiredVariableNames)
  return renderTemplateWithContext(params.templateContent, context, {
    withinStudyResultId: params.withinStudyResultId,
    aggregatedAcrossStats: params.aggregatedAcrossStats,
  })
}

export type PrepareFeedbackRenderInputsFromEnrichedResultsParams = {
  templateContent: string
  /** Cached DSL variable names; same semantics as `FeedbackTemplate.requiredVariableNames`. */
  requiredVariableNames?: string[] | null
  /**
   * When true, `requiredVariableNames` is authoritative (including `[]` = no variables).
   * When false/omitted, an empty array still falls back to `extractRequiredVariableNames` (DB may store `[]`).
   */
  requiredVariableNamesExplicit?: boolean
  enrichedResult: EnrichedJatosStudyResult
  aggregatedAcrossStats?: Record<string, string>
  /** When template uses `stat:…:across` without precomputed aggregates, pass cohort rows for extraction. */
  allEnrichedResults?: EnrichedJatosStudyResult[]
  /** `StudyVariable.variableKey` allowlist for extraction; from `resolveVariableKeysForExtractionSnapshot` / `resolveVariableKeysForFeedback`. */
  variableKeysAllowlist?: string[]
}

/**
 * Builds bundle + render options from enriched JATOS results (static feedback and any caller with `EnrichedJatosStudyResult[]`).
 */
export function prepareFeedbackRenderInputsFromEnrichedResults(
  params: PrepareFeedbackRenderInputsFromEnrichedResultsParams
): {
  bundle: ReturnType<typeof extractVariableBundleForRenderFromResults>
  requiredVariableNames: string[]
  withinStudyResultId: number
  aggregatedAcrossStats: Record<string, string> | undefined
} {
  const {
    templateContent,
    requiredVariableNames: requiredVariableNamesFromParams,
    requiredVariableNamesExplicit,
    enrichedResult,
    aggregatedAcrossStats,
    allEnrichedResults,
    variableKeysAllowlist,
  } = params

  const requiredVariableNames = (() => {
    if (requiredVariableNamesExplicit && Array.isArray(requiredVariableNamesFromParams)) {
      return requiredVariableNamesFromParams
    }
    if (requiredVariableNamesFromParams === undefined || requiredVariableNamesFromParams === null) {
      return extractRequiredVariableNames(templateContent)
    }
    if (requiredVariableNamesFromParams.length > 0) {
      return requiredVariableNamesFromParams
    }
    return extractRequiredVariableNames(templateContent)
  })()

  const usesAcross = templateUsesStatAcross(templateContent)
  const hasPrecomputedAcross =
    aggregatedAcrossStats !== undefined && Object.keys(aggregatedAcrossStats).length > 0

  const resultsForExtraction =
    usesAcross && !hasPrecomputedAcross && allEnrichedResults && allEnrichedResults.length > 0
      ? allEnrichedResults
      : [enrichedResult]

  const extractionAllowlist =
    variableKeysAllowlist && variableKeysAllowlist.length > 0
      ? new Set(variableKeysAllowlist)
      : undefined

  const bundle = extractVariableBundleForRenderFromResults(
    resultsForExtraction,
    extractionAllowlist
  )

  return {
    bundle,
    requiredVariableNames,
    withinStudyResultId: enrichedResult.id,
    aggregatedAcrossStats: hasPrecomputedAcross ? aggregatedAcrossStats : undefined,
  }
}

/** Static feedback (participant / researcher): extraction from enriched results, then unified render. */
export function renderStaticFeedbackMarkdown(params: {
  templateContent: string
  requiredVariableNames?: string[] | null
  requiredVariableNamesExplicit?: boolean
  enrichedResult: EnrichedJatosStudyResult
  aggregatedAcrossStats?: Record<string, string>
  variableKeysAllowlist?: string[]
}): string {
  const { bundle, requiredVariableNames, withinStudyResultId, aggregatedAcrossStats } =
    prepareFeedbackRenderInputsFromEnrichedResults(params)

  return renderFeedbackTemplate({
    templateContent: params.templateContent,
    bundle,
    requiredVariableNames,
    withinStudyResultId,
    aggregatedAcrossStats,
  })
}

export type RenderStaticFeedbackMarkdownForPersistedTemplateParams = {
  templateContent: string
  requiredVariableNames: string[] | null
  /**
   * Step 6 preview: treat `requiredVariableNames` as authoritative (including `[]`).
   * Persisted paths omit this and follow DB / extract fallbacks in `prepareFeedbackRenderInputsFromEnrichedResults`.
   */
  requiredVariableNamesExplicit?: boolean
  variableKeysAllowlist?: string[]
  enrichedResult: EnrichedJatosStudyResult
  /**
   * Participant path: aggregates from `getParticipantFeedback` when the template uses `stat:…:across`.
   * When set, used as-is (skips cohort computation).
   */
  aggregatedAcrossStats?: Record<string, string>
  /**
   * Researcher path: all pilot-enriched rows; `stat:…:across` aggregates computed here when
   * `aggregatedAcrossStats` is omitted.
   */
  cohortEnrichedResults?: EnrichedJatosStudyResult[]
}

/**
 * Shared static feedback render for persisted DB templates: optional precomputed across-stats
 * (participant JATOS) or cohort-based aggregation (researcher pilots), then `renderStaticFeedbackMarkdown`.
 */
export function renderStaticFeedbackMarkdownForPersistedTemplate(
  params: RenderStaticFeedbackMarkdownForPersistedTemplateParams
): string {
  const aggregatedAcrossStats =
    params.aggregatedAcrossStats !== undefined
      ? params.aggregatedAcrossStats
      : params.cohortEnrichedResults && params.cohortEnrichedResults.length > 0
      ? computeAggregatedAcrossStatsForTemplate(
          params.cohortEnrichedResults,
          params.templateContent,
          params.variableKeysAllowlist ?? []
        )
      : undefined

  return renderStaticFeedbackMarkdown({
    templateContent: params.templateContent,
    requiredVariableNames: params.requiredVariableNames,
    requiredVariableNamesExplicit: params.requiredVariableNamesExplicit,
    enrichedResult: params.enrichedResult,
    aggregatedAcrossStats,
    variableKeysAllowlist: params.variableKeysAllowlist,
  })
}
