import { Study, FeedbackTemplate } from "@prisma/client"
import { StudyWithRelations } from "../../../queries/getStudy"
import { deriveStep1Completed } from "./deriveStep1Completed"
import { STEP_KEYS, TOTAL_STEPS } from "./constants"

// More flexible interface for studies with minimal researcher data
// Using Partial<Study> allows us to pass lightweight objects from optimized queries
export interface StudyWithMinimalRelations extends Partial<Study> {
  // We need at least these for deriving step 1
  title?: string
  description?: string

  researchers?: { userId?: number; role?: string; id?: number }[]
  FeedbackTemplate?: FeedbackTemplate | { id: number } | null
  latestJatosStudyUpload?: {
    step1Completed?: boolean
    step2Completed?: boolean
    step3Completed?: boolean
    step4Completed?: boolean
    step5Completed?: boolean
    step6Completed?: boolean
    // We might need these for logic
    id?: number
    jatosWorkerType?: string
    jatosFileName?: string
  } | null
}

type StepFlags = {
  step1Completed: boolean
  step2Completed: boolean
  step3Completed: boolean
  step4Completed: boolean
  step5Completed: boolean
  step6Completed: boolean
}

function resolveStepFlags(study: StudyWithRelations | StudyWithMinimalRelations): StepFlags {
  const upload = study.latestJatosStudyUpload
  const flags = {} as StepFlags

  STEP_KEYS.forEach((key) => {
    const uploadValue = upload?.[key]
    if (typeof uploadValue === "boolean") {
      flags[key] = uploadValue
      return
    }
    flags[key] = key === "step1Completed" ? deriveStep1Completed(study) : false
  })

  return flags
}

function isSetupCompleteFromFlags(steps: StepFlags): boolean {
  return STEP_KEYS.every((key) => steps[key])
}

function getIncompleteStepFromFlags(steps: StepFlags): number | null {
  for (let index = 0; index < STEP_KEYS.length; index += 1) {
    const key = STEP_KEYS[index]
    if (!steps[key]) return index + 1
  }
  return null
}

function getCompletedStepsFromFlags(steps: StepFlags): number[] {
  const completed: number[] = []
  STEP_KEYS.forEach((key, index) => {
    if (steps[key]) completed.push(index + 1)
  })
  return completed
}

/**
 * Determines if a study's setup is complete by checking all required steps
 * Uses DB fields as source of truth
 */
export function isSetupComplete(study: StudyWithRelations | StudyWithMinimalRelations): boolean {
  const steps = resolveStepFlags(study)
  return isSetupCompleteFromFlags(steps)
}

/**
 * Returns the first incomplete step number, or null if all complete
 * Uses DB fields as source of truth
 */
export function getIncompleteStep(
  study: StudyWithRelations | StudyWithMinimalRelations
): number | null {
  const steps = resolveStepFlags(study)
  return getIncompleteStepFromFlags(steps)
}

/**
 * Returns an array of completed step numbers (1-6)
 * Uses DB fields as source of truth
 */
export function getCompletedSteps(study: StudyWithRelations | StudyWithMinimalRelations): number[] {
  const steps = resolveStepFlags(study)
  return getCompletedStepsFromFlags(steps)
}

/**
 * Returns setup progress information for display
 * Uses DB fields as source of truth
 */
export function getSetupProgress(study: StudyWithRelations | StudyWithMinimalRelations) {
  const steps = resolveStepFlags(study)
  const incompleteStep = getIncompleteStepFromFlags(steps)
  const isComplete = isSetupCompleteFromFlags(steps)
  const completedSteps = getCompletedStepsFromFlags(steps)

  return {
    isComplete,
    incompleteStep,
    totalSteps: TOTAL_STEPS,
    completedSteps: completedSteps.length,
    completedStepsList: completedSteps,
    progressPercentage: (completedSteps.length / TOTAL_STEPS) * 100,
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
    if (returnTo < 1 || returnTo > TOTAL_STEPS) {
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
  if (nextStep > TOTAL_STEPS) {
    return `/studies/${studyId}` // All steps complete, go to study page
  }
  return `/studies/${studyId}/setup/step${nextStep}`
}
