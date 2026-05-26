/**
 * jatosAccessService — JATOS integration / use-case layer.
 *
 * This file acts as the public facade. The internal implementation has been
 * modularized into the `jatosAccess/` directory.
 */

export type { GetParticipantFeedbackResult } from "./participantFeedbackTypes"

export * from "./jatosAccess/researcherResults"
export * from "./jatosAccess/participantFeedback"
export * from "./jatosAccess/pilotResults"
export * from "./jatosAccess/setupValidation"
export * from "./jatosAccess/studyCodes"
