/**
 * Startup guards for production deployments.
 * Asserts that critical secrets are set and not placeholders.
 */

const UNSAFE_VALUES = [
  "CHANGE_ME",
  "devpass",
  "dev-secret",
  "your-token",
  "your-secret",
  "LONGPASS",
  "change-in-production",
  "change-me",
]

/**
 * Asserts that production secrets are set and not placeholders.
 * Skips in non-production. Throws if any check fails.
 */
export function assertProductionSecrets(): void {
  if (process.env.NODE_ENV !== "production") {
    return
  }

  const checks: Array<{ name: string; value: string | undefined }> = [
    { name: "SESSION_SECRET_KEY", value: process.env.SESSION_SECRET_KEY },
    { name: "POSTGRES_PASSWORD", value: process.env.POSTGRES_PASSWORD },
    { name: "JATOS_TOKEN", value: process.env.JATOS_TOKEN },
  ]

  for (const { name, value } of checks) {
    if (!value?.trim()) {
      throw new Error(`[Startup] Missing required secret: ${name}.`)
    }
    const upper = value.toUpperCase()
    if (UNSAFE_VALUES.some((u) => upper.includes(u.toUpperCase()))) {
      throw new Error(
        `[Startup] ${name} appears to use a default/placeholder value. Change it for production.`
      )
    }
  }
}
