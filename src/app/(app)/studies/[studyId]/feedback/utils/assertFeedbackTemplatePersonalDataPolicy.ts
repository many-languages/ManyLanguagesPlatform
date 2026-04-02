import { getPersonalDataViolationsForFeedbackTemplate } from "./feedbackTemplatePersonalDataViolations"

/**
 * Throws if the template references variables marked as personal data in the study codebook.
 * Call from feedback template mutations so all save paths are covered.
 */
export async function assertFeedbackTemplatePersonalDataPolicy(
  studyId: number,
  content: string,
  requiredVariableNames?: string[]
): Promise<void> {
  const violations = await getPersonalDataViolationsForFeedbackTemplate(
    studyId,
    content,
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
