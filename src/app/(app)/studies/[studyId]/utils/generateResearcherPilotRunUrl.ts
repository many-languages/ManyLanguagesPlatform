import { createResearcherPilotUrlAndSaveAction } from "../setup/actions/createResearcherPilotUrl"

interface GenerateRunUrlArgs {
  studyId: number
  studyResearcherId: number
  jatosStudyUploadId: number
  jatosStudyId: number
  jatosBatchId: number
}

/**
 * Generates a JATOS pilot run URL for a researcher and saves it.
 * Delegates to jatosAccessService via server action.
 * Returns the generated runUrl.
 */
export async function generateAndSaveResearcherPilotRunUrl(
  args: GenerateRunUrlArgs
): Promise<string> {
  return createResearcherPilotUrlAndSaveAction(args)
}
