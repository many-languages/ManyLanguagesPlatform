import { getParticipantFeedback } from "@/src/lib/jatos/jatosAccessService"
import { mapJatosErrorToUserMessage } from "@/src/lib/jatos/errors"
import { getFeedbackTemplateForParticipantRsc } from "../queries/getFeedbackTemplate"
import type {
  LoadParticipantFeedbackPipelineResult,
  ParticipantFeedbackMarkdownLoadResult,
} from "../types"
import { getPersonalDataViolationsForPersistedTemplate } from "./feedbackTemplatePersonalDataViolations"
import { resolvePersistedFeedbackTemplateVariables } from "./resolvePersistedFeedbackTemplateVariables"
import { renderStaticFeedbackMarkdownForPersistedTemplate } from "./renderFeedbackServer"

/**
 * Full participant feedback load: template from DB (same access as RSC) + JATOS + render.
 * Used by RSC and `fetchParticipantFeedbackAction` so refresh always uses current DB template.
 */
export async function loadParticipantFeedbackViewModel(
  studyId: number,
  pseudonym: string,
  jatosStudyId: number
): Promise<LoadParticipantFeedbackPipelineResult> {
  const access = await getFeedbackTemplateForParticipantRsc(studyId)

  if (access.kind === "not_authenticated") {
    return { kind: "not_authenticated" }
  }
  if (access.kind === "not_enrolled") {
    return { kind: "not_enrolled" }
  }

  const { template, userId } = access
  if (!template) {
    return { kind: "no_template" }
  }

  let privacyViolations: string[]
  try {
    privacyViolations = await getPersonalDataViolationsForPersistedTemplate(studyId, template)
  } catch (error) {
    console.error("Error checking feedback privacy policy:", error)
    // Same UX as policy violations: do not expose internals to participants.
    return { kind: "done", loaded: { kind: "maintained" } }
  }
  if (privacyViolations.length > 0) {
    return { kind: "done", loaded: { kind: "maintained" } }
  }

  try {
    const { requiredVariableNames, variableKeysAllowlist } =
      await resolvePersistedFeedbackTemplateVariables(template, studyId)

    const loaded = await loadParticipantFeedbackRenderedMarkdown({
      studyId,
      pseudonym,
      jatosStudyId,
      userId,
      templateContent: template.content,
      requiredVariableNames,
      variableKeysAllowlist,
    })

    return { kind: "done", loaded }
  } catch (error) {
    console.error("Error loading participant feedback:", error)
    return {
      kind: "done",
      loaded: { kind: "failed", error: mapJatosErrorToUserMessage(error) },
    }
  }
}

export async function loadParticipantFeedbackRenderedMarkdown(input: {
  studyId: number
  pseudonym: string
  jatosStudyId: number
  userId: number
  templateContent: string
  requiredVariableNames?: string[] | null
  variableKeysAllowlist?: string[]
}): Promise<ParticipantFeedbackMarkdownLoadResult> {
  const result = await getParticipantFeedback({
    studyId: input.studyId,
    pseudonym: input.pseudonym,
    jatosStudyId: input.jatosStudyId,
    userId: input.userId,
    templateContent: input.templateContent,
    variableKeysAllowlist: input.variableKeysAllowlist,
  })

  if (result.kind === "not_completed") {
    return { kind: "not_completed" }
  }
  if (result.kind === "failed") {
    return { kind: "failed", error: result.error }
  }

  const renderedMarkdown = renderStaticFeedbackMarkdownForPersistedTemplate({
    templateContent: input.templateContent,
    requiredVariableNames: input.requiredVariableNames ?? null,
    variableKeysAllowlist: input.variableKeysAllowlist,
    enrichedResult: result.enrichedResult,
    aggregatedAcrossStats: result.aggregatedAcrossStats,
  })

  return {
    kind: "loaded",
    renderedMarkdown,
    matchingResponseCount: result.matchingResponseCount,
    selectedResponseEndDate: result.selectedResponseEndDate,
  }
}
