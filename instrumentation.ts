/**
 * Next.js instrumentation hook.
 * Runs once when the server starts, before handling requests.
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertProductionSecrets } = await import("./src/lib/startupGuards")
    assertProductionSecrets()
  }
}
