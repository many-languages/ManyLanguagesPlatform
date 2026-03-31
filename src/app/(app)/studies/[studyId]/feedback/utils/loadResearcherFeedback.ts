import { getAllPilotResultsForResearcher } from "@/src/lib/jatos/jatosAccessService"
import { mapJatosErrorToUserMessage } from "@/src/lib/jatos/errors"
import type {
  LoadResearcherFeedbackPipelineResult,
  ResearcherFeedbackMarkdownLoadResult,
} from "../types"
import { getFeedbackTemplateForResearcherRsc } from "../queries/getFeedbackTemplate"
import { getPersonalDataViolationsForPersistedTemplate } from "./feedbackTemplatePersonalDataViolations"
import { resolvePersistedFeedbackTemplateVariables } from "./resolvePersistedFeedbackTemplateVariables"
import { renderStaticFeedbackMarkdownForPersistedTemplate } from "./renderFeedbackServer"

/**
 * Researcher feedback preview: template from DB + pilot results + server render.
 * Mirrors `loadParticipantFeedbackViewModel` (discriminated result, narrow try/catch for JATOS/render).
 */
export async function loadResearcherFeedbackViewModel(
  studyId: number
): Promise<LoadResearcherFeedbackPipelineResult> {
  const access = await getFeedbackTemplateForResearcherRsc(studyId)

  if (access.kind === "not_authenticated") {
    return { kind: "not_authenticated" }
  }
  if (access.kind === "not_authorized") {
    return { kind: "not_authorized" }
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
    return {
      kind: "done",
      loaded: { kind: "failed", error: "Something went wrong. Please try again." },
    }
  }
  if (privacyViolations.length > 0) {
    const loaded: ResearcherFeedbackMarkdownLoadResult = {
      kind: "personal_data_blocked",
      variableNames: privacyViolations,
    }
    return { kind: "done", loaded }
  }

  try {
    const { requiredVariableNames, variableKeysAllowlist } =
      await resolvePersistedFeedbackTemplateVariables(template)

    const allPilotResults = await getAllPilotResultsForResearcher({ studyId, userId })
    const researcherHasPilotData = allPilotResults.length > 0
    const enrichedResult = allPilotResults[0] ?? null

    let renderedMarkdown: string | null = null
    if (enrichedResult) {
      renderedMarkdown = renderStaticFeedbackMarkdownForPersistedTemplate({
        templateContent: template.content,
        requiredVariableNames,
        variableKeysAllowlist,
        enrichedResult,
        cohortEnrichedResults: allPilotResults,
      })
    }

    const loaded: ResearcherFeedbackMarkdownLoadResult = {
      kind: "loaded",
      renderedMarkdown,
      researcherHasPilotData,
    }
    return { kind: "done", loaded }
  } catch (error) {
    console.error("Error loading researcher feedback preview:", error)
    return {
      kind: "done",
      loaded: { kind: "failed", error: mapJatosErrorToUserMessage(error) },
    }
  }
}
