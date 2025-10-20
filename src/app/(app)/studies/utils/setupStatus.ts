import { Study, StudyResearcher, FeedbackTemplate } from "@prisma/client"

export interface StudyWithRelations extends Study {
  researchers?: StudyResearcher[]
  FeedbackTemplate?: FeedbackTemplate | null
}

// More flexible interface for studies with minimal researcher data
export interface StudyWithMinimalRelations extends Study {
  researchers?: { userId: number; role: string; jatosRunUrl?: string | null }[]
  FeedbackTemplate?: FeedbackTemplate | null
}

/**
 * Determines if a study's setup is complete by checking all required steps
 */
export function isSetupComplete(
  study: StudyWithRelations | StudyWithMinimalRelations,
  opts?: { hasFeedbackTemplate?: boolean }
): boolean {
  // Step 1: Basic study information (always complete for existing studies)
  const step1Complete = !!(study.title && study.description)

  // Step 2: JATOS study uploaded
  const step2Complete = !!(study.jatosStudyUUID && study.jatosStudyId)

  // Step 3: Pilot test completed (researcher has run URL)
  const step3Complete = step2Complete && !!study.researchers?.some((r) => r.jatosRunUrl)

  // Step 4: Feedback template created
  const step4Complete =
    opts?.hasFeedbackTemplate !== undefined ? !!opts.hasFeedbackTemplate : !!study.FeedbackTemplate
  return step1Complete && step2Complete && step3Complete && step4Complete
}

/**
 * Returns the first incomplete step number, or null if all complete
 */
export function getIncompleteStep(
  study: StudyWithRelations | StudyWithMinimalRelations,
  opts?: { hasFeedbackTemplate?: boolean }
): number | null {
  // Step 1: Basic study information
  if (!study.title || !study.description) {
    return 1
  }

  // Step 2: JATOS study uploaded
  if (!study.jatosStudyUUID || !study.jatosStudyId) {
    return 2
  }

  // Step 3: Pilot test completed
  if (!study.researchers?.some((r) => r.jatosRunUrl)) {
    return 3
  }

  // Step 4: Feedback template created
  const hasTemplate =
    opts?.hasFeedbackTemplate !== undefined ? !!opts.hasFeedbackTemplate : !!study.FeedbackTemplate
  if (!hasTemplate) {
    return 4
  }

  return null // All complete
}

/**
 * Returns setup progress information for display
 */
export function getSetupProgress(
  study: StudyWithRelations | StudyWithMinimalRelations,
  opts?: { hasFeedbackTemplate?: boolean }
) {
  const incompleteStep = getIncompleteStep(study, opts)
  const isComplete = isSetupComplete(study, opts)

  return {
    isComplete,
    incompleteStep,
    totalSteps: 4,
    completedSteps: incompleteStep ? incompleteStep - 1 : 4,
    progressPercentage: incompleteStep ? ((incompleteStep - 1) / 4) * 100 : 100,
  }
}

/**
 * Returns the next step URL for continuing setup
 */
export function getNextSetupStepUrl(
  studyId: number,
  study: StudyWithRelations | StudyWithMinimalRelations,
  opts?: { hasFeedbackTemplate?: boolean }
): string {
  const incompleteStep = getIncompleteStep(study, opts)
  if (!incompleteStep) {
    return `/studies/${studyId}` // All complete, go to study page
  }
  return `/studies/${studyId}/setup/step${incompleteStep}`
}
