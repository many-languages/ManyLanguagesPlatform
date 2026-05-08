import { mapJatosErrorToUserMessage } from "@/src/lib/jatos/errors"

const GENERIC = "Something went wrong. Please try again."

/**
 * Maps feedback template save failures to user-safe copy. Does not forward raw `Error.message`
 * except for intentional domain validation (personal data variables) emitted by our code.
 */
export function mapFeedbackTemplateSaveErrorToUserMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return mapJatosErrorToUserMessage(error)
  }

  const msg = error.message

  if (msg === "Not authenticated") {
    return "Please sign in to save your feedback template."
  }
  if (msg === "You are not authorized to access this study.") {
    return "You don't have access to save this template."
  }
  if (msg === "Feedback template not found") {
    return "This template could not be found. Refresh the page and try again."
  }
  if (msg === "Template content cannot be empty") {
    return "Please enter some content for your feedback template."
  }
  if (msg.startsWith("Feedback template cannot reference variables marked as personal data:")) {
    return msg
  }

  return GENERIC
}
