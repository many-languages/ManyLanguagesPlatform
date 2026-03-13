/**
 * Returns the JATOS admin token (JATOS_TOKEN env var).
 * Used only by provisioning and tokenBroker — never by jatosAccessService.
 */
export function getAdminToken(): string {
  const token = process.env.JATOS_TOKEN
  if (!token) {
    throw new Error("Missing JATOS_TOKEN environment variable")
  }
  return token
}
