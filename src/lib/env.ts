/**
 * Central env validation: shared placeholder detection and production startup checks.
 */
import { z } from "zod"

export const UNSAFE_VALUES = [
  "CHANGE_ME",
  "devpass",
  "dev-secret",
  "your-token",
  "your-secret",
  "LONGPASS",
  "change-in-production",
  "change-me",
] as const

/** Secret-like env vars checked for placeholder values in production. */
export const PRODUCTION_SECRET_ENV_KEYS = [
  "SESSION_SECRET_KEY",
  "POSTGRES_PASSWORD",
  "JATOS_TOKEN",
] as const

/** Required in production at server startup (participant join URLs depend on JATOS bases). */
export const PRODUCTION_REQUIRED_ENV_KEYS = [
  ...PRODUCTION_SECRET_ENV_KEYS,
  "JATOS_BASE",
  "NEXT_PUBLIC_JATOS_BASE",
] as const

const nonEmptyTrimmedString = z.string().trim().min(1)

export const productionEnvSchema = z.object({
  SESSION_SECRET_KEY: nonEmptyTrimmedString,
  POSTGRES_PASSWORD: nonEmptyTrimmedString,
  JATOS_TOKEN: nonEmptyTrimmedString,
  JATOS_BASE: nonEmptyTrimmedString,
  NEXT_PUBLIC_JATOS_BASE: nonEmptyTrimmedString,
})

export type ProductionEnv = z.infer<typeof productionEnvSchema>

export function isUnsafeEnvValue(value: string): boolean {
  const upper = value.toUpperCase()
  return UNSAFE_VALUES.some((u) => upper.includes(u.toUpperCase()))
}

/** Human-readable issues for production deploy / validate-setup. */
export function collectProductionEnvIssues(env: NodeJS.ProcessEnv = process.env): string[] {
  const parsed = productionEnvSchema.safeParse({
    SESSION_SECRET_KEY: env.SESSION_SECRET_KEY,
    POSTGRES_PASSWORD: env.POSTGRES_PASSWORD,
    JATOS_TOKEN: env.JATOS_TOKEN,
    JATOS_BASE: env.JATOS_BASE,
    NEXT_PUBLIC_JATOS_BASE: env.NEXT_PUBLIC_JATOS_BASE,
  })

  const issues: string[] = []
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      issues.push(typeof key === "string" ? `${key} is not set or empty` : issue.message)
    }
  }

  for (const key of PRODUCTION_SECRET_ENV_KEYS) {
    const value = env[key]?.trim()
    if (!value) continue
    if (isUnsafeEnvValue(value)) {
      issues.push(`${key} appears to use a default/placeholder value`)
    }
  }

  return issues
}

/**
 * Asserts production env is complete and secrets are not placeholders.
 * No-op outside production. Throws on failure (used from instrumentation).
 */
export function assertProductionEnv(): void {
  if (process.env.NODE_ENV !== "production") {
    return
  }

  const issues = collectProductionEnvIssues()
  if (issues.length > 0) {
    throw new Error(`[Startup] Production environment invalid:\n- ${issues.join("\n- ")}`)
  }
}

/** @deprecated Use assertProductionEnv — kept for existing imports. */
export const assertProductionSecrets = assertProductionEnv
