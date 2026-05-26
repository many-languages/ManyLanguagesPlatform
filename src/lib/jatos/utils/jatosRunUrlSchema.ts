import { z } from "zod"

/** Trailing slashes stripped so run URLs match `generateJatosRunUrl` output. */
export function normalizeJatosPublicBase(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_JATOS_BASE?.trim()
  if (!raw) return undefined
  return raw.replace(/\/+$/, "")
}

/**
 * Builds a JATOS run URL for participants (browser).
 * Uses NEXT_PUBLIC_JATOS_BASE — the public URL clients can reach.
 * Single source of truth for all participant-facing run links.
 */
export function generateJatosRunUrl(code: string): string {
  const base = normalizeJatosPublicBase()
  if (!base) {
    throw new Error("Missing NEXT_PUBLIC_JATOS_BASE")
  }
  return `${base}/publix/${code}`
}

export const jatosRunUrlSchema = z
  .string()
  .url("Must be a valid URL")
  .superRefine((url, ctx) => {
    const base = normalizeJatosPublicBase()
    if (!base) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "JATOS public base URL is not configured",
      })
      return
    }
    if (!url.startsWith(`${base}/publix/`)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Must be a JATOS run URL for this deployment",
      })
    }
  })
