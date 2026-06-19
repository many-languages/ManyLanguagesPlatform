/**
 * Next.js instrumentation hook.
 * Runs once when the server starts, before handling requests.
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.on("uncaughtExceptionMonitor", (err, origin) => {
      console.error("[FATAL] Uncaught exception origin:", origin)
      console.error("[FATAL] Error:", err)
    })
    process.on("unhandledRejection", (reason) => {
      console.error("[FATAL] Unhandled rejection:", reason)
    })
    const { assertProductionEnv } = await import("./src/lib/env")
    assertProductionEnv()
  }
}
