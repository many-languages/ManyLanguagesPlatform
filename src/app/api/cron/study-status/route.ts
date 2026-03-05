/**
 * Cron endpoint for study status scheduler.
 * Opens studies at startDate and closes at endDate.
 * Protected by CRON_SECRET header.
 *
 * @route GET /api/cron/study-status
 * @header X-Cron-Secret or Authorization: Bearer <CRON_SECRET>
 */
import { NextResponse } from "next/server"
import { runStudyStatusScheduler } from "@/src/lib/studyStatusScheduler"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getSecretFromRequest(req: Request): string | null {
  const authHeader = req.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7)
  }
  return req.headers.get("x-cron-secret")
}

export async function GET(req: Request): Promise<NextResponse> {
  const secret = getSecretFromRequest(req)
  const expectedSecret = process.env.CRON_SECRET

  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await runStudyStatusScheduler()
    return NextResponse.json({
      success: true,
      opened: result.opened,
      closed: result.closed,
    })
  } catch (error) {
    console.error("Study status scheduler error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
