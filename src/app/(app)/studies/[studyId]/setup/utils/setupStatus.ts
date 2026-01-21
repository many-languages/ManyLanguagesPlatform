import { Study, FeedbackTemplate } from "@prisma/client"
import { StudyWithRelations } from "../../../queries/getStudy"

// More flexible interface for studies with minimal researcher data
export interface StudyWithMinimalRelations extends Study {
  researchers?: { userId: number; role: string; jatosRunUrl?: string | null }[]
  FeedbackTemplate?: FeedbackTemplate[] | { id: number }[]
}

/**
 * Determines if a study's setup is complete by checking all required steps
 * Uses DB fields as source of truth
 */
export function isSetupComplete(study: StudyWithRelations | StudyWithMinimalRelations): boolean {
  return !!(
    study.step1Completed &&
    study.step2Completed &&
    study.step3Completed &&
    study.step4Completed &&
    study.step5Completed &&
    study.step6Completed
  )
}

/**
 * Returns the first incomplete step number, or null if all complete
 * Uses DB fields as source of truth
 */
export function getIncompleteStep(
  study: StudyWithRelations | StudyWithMinimalRelations
): number | null {
  if (!study.step1Completed) return 1
  if (!study.step2Completed) return 2
  if (!study.step3Completed) return 3
  if (!study.step4Completed) return 4
  if (!study.step5Completed) return 5
  if (!study.step6Completed) return 6
  return null // All complete
}

/**
 * Returns an array of completed step numbers (1-5)
 * Uses DB fields as source of truth
 */
export function getCompletedSteps(study: StudyWithRelations | StudyWithMinimalRelations): number[] {
  const completed: number[] = []

  if (study.step1Completed) completed.push(1)
  if (study.step2Completed) completed.push(2)
  if (study.step3Completed) completed.push(3)
  if (study.step4Completed) completed.push(4)
  if (study.step5Completed) completed.push(5)

  return completed
}

/**
 * Returns setup progress information for display
 * Uses DB fields as source of truth
 */
export function getSetupProgress(study: StudyWithRelations | StudyWithMinimalRelations) {
  const incompleteStep = getIncompleteStep(study)
  const isComplete = isSetupComplete(study)
  const completedSteps = getCompletedSteps(study)

  return {
    isComplete,
    incompleteStep,
    totalSteps: 6,
    completedSteps: completedSteps.length,
    completedStepsList: completedSteps,
    progressPercentage: (completedSteps.length / 6) * 100,
  }
}

/**
 * Returns the next step URL for continuing setup
 * Uses DB fields as source of truth
 */
export function getNextSetupStepUrl(
  studyId: number,
  study: StudyWithRelations | StudyWithMinimalRelations
): string {
  const incompleteStep = getIncompleteStep(study)
  if (!incompleteStep) {
    return `/studies/${studyId}` // All complete, go to study page
  }
  return `/studies/${studyId}/setup/step${incompleteStep}`
}

/**
 * Returns the navigation URL after completing a setup step
 * @param studyId - The study ID
 * @param currentStep - The step number that was just completed (1-5)
 * @param returnTo - Navigation target: "study" to return to study page, "next" to go to next step, or a specific step number
 * @param study - Optional study object to determine next incomplete step when returnTo is "next"
 */
export function getPostStepNavigationUrl(
  studyId: number,
  currentStep: number,
  returnTo: "study" | "next" | number = "next",
  study?: StudyWithRelations | StudyWithMinimalRelations
): string {
  if (returnTo === "study") {
    return `/studies/${studyId}`
  }

  if (typeof returnTo === "number") {
    if (returnTo < 1 || returnTo > 6) {
      // Invalid step number, default to study page
      return `/studies/${studyId}`
    }
    return `/studies/${studyId}/setup/step${returnTo}`
  }

  // returnTo === "next"
  if (study) {
    // Use existing logic to find next incomplete step
    return getNextSetupStepUrl(studyId, study)
  }

  // Default to next step if study not provided
  const nextStep = currentStep + 1
  if (nextStep > 5) {
    return `/studies/${studyId}` // All steps complete, go to study page
  }
  return `/studies/${studyId}/setup/step${nextStep}`
}
