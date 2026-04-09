#!/usr/bin/env npx tsx
/**
 * Ensures the JATOS service account exists at startup.
 * Invoked from Docker entrypoint after prisma migrate deploy.
 * Idempotent — on subsequent starts, returns existing ID without calling JATOS.
 *
 * Retries if JATOS is not yet ready (e.g. on first deploy).
 */

import { ensureServiceAccount } from "../src/lib/jatos/provisioning/ensureServiceAccount"

const MAX_RETRIES = 5
const RETRY_DELAY_MS = 10_000

async function main() {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const id = await ensureServiceAccount()
      console.log(`✅ JATOS service account ready (ID: ${id})`)
      return
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < MAX_RETRIES) {
        console.warn(
          `⚠️ Service account provisioning failed (attempt ${attempt}/${MAX_RETRIES}): ${lastError.message}`
        )
        console.warn(`   Retrying in ${RETRY_DELAY_MS / 1000}s...`)
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
      }
    }
  }

  console.error("❌ Failed to ensure JATOS service account after", MAX_RETRIES, "attempts")
  console.error("   Last error:", lastError?.message)
  process.exit(1)
}

main()
