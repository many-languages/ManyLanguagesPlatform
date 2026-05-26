/**
 * Builds a JATOS run URL for participants (browser).
 * Uses NEXT_PUBLIC_JATOS_BASE — the public URL clients can reach.
 * Single source of truth for all participant-facing run links.
 */
export {
  generateJatosRunUrl,
  jatosRunUrlSchema,
  normalizeJatosPublicBase,
} from "./jatosRunUrlSchema"
