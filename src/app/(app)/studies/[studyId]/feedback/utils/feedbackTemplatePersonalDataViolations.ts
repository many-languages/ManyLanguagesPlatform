import { collectPersonalDataViolationsForFeedbackTemplate } from "@/src/lib/feedback/feedbackTemplatePersonalDataPolicy"
import { fetchCodebookMergedVariablesForStudy } from "../../codebook/queries/getCodebookData"
import type { FeedbackTemplateRscRow } from "../feedbackTemplateRscSelect"
import { parseRequiredVariableNamesFromDb } from "./parseRequiredVariableNamesFromDb"

/**
 * Violations for a persisted template row: codebook personal-data flags + template content +
 * stored `requiredVariableNames` JSON. Does not resolve extraction keys (unrelated to privacy).
 */
export async function getPersonalDataViolationsForPersistedTemplate(
  studyId: number,
  template: Pick<FeedbackTemplateRscRow, "content" | "requiredVariableNames">
): Promise<string[]> {
  const parsedRequired = parseRequiredVariableNamesFromDb(template.requiredVariableNames)
  return getPersonalDataViolationsForFeedbackTemplate(
    studyId,
    template.content,
    parsedRequired ?? undefined
  )
}

/**
 * Violations for save-time checks (mutations pass content and optional required names explicitly).
 */
export async function getPersonalDataViolationsForFeedbackTemplate(
  studyId: number,
  content: string,
  requiredVariableNames?: string[]
): Promise<string[]> {
  const { variables } = await fetchCodebookMergedVariablesForStudy(studyId)
  const personalDataNames = new Set(
    variables.filter((v) => v.personalData).map((v) => v.variableName)
  )
  return collectPersonalDataViolationsForFeedbackTemplate(
    content,
    personalDataNames,
    requiredVariableNames
  )
}
