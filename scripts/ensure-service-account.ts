/**
 * Ensures the JATOS service account is provisioned.
 * Invoked at app startup (after migrations) in the Docker entrypoint.
 * Idempotent — safe to run on every startup.
 */
import { ensureServiceAccount } from "../src/lib/jatos/provisioning/ensureServiceAccount"

async function main() {
  try {
    const id = await ensureServiceAccount()
    console.log(`✅ JATOS service account ready (user ID: ${id})`)
  } catch (err) {
    console.error("❌ Failed to ensure JATOS service account:", err)
    process.exit(1)
  }
}

main()
