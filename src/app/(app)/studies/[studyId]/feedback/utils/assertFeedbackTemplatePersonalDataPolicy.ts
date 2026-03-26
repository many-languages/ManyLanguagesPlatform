import { collectPersonalDataViolationsForFeedbackTemplate } from "@/src/lib/feedback/feedbackTemplatePersonalDataPolicy"
import { getCodebookDataRsc } from "../../codebook/queries/getCodebookData"

/**
 * Throws if the template references variables marked as personal data in the study codebook.
 * Call from feedback template mutations so all save paths are covered.
 */
export async function assertFeedbackTemplatePersonalDataPolicy(
  studyId: number,
  content: string,
  requiredVariableNames?: string[]
): Promise<void> {
  const { variables } = await getCodebookDataRsc(studyId)
  const personalDataNames = new Set(
    variables.filter((v) => v.personalData).map((v) => v.variableName)
  )
  const violations = collectPersonalDataViolationsForFeedbackTemplate(
    content,
    personalDataNames,
    requiredVariableNames
  )
  if (violations.length === 0) {
    return
  }
  throw new Error(
    `Feedback template cannot reference variables marked as personal data: ${violations.join(
      ", "
    )}.`
  )
}
