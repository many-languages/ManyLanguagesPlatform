/**
 * JATOS API Route: Import Study
 *
 * Sole exception to the "no API routes" rule. FormData upload requires this route.
 * Delegates to provisioning/importJatosStudy for JATOS upload + DB + membership sync.
 *
 * @route POST /api/jatos/import
 * @body FormData: studyFile (File), studyId (number), jatosWorkerType ("SINGLE"|"MULTIPLE")
 * @returns Import result with jatosStudyId, jatosStudyUUID, latestUpload, etc.
 */
import { NextResponse } from "next/server"
import { getBlitzContext } from "@/src/app/blitz-server"
import { importJatosStudyForResearcher } from "@/src/lib/jatos/provisioning/importJatosStudy"
import type { JatosApiError } from "@/src/types/jatos-api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

export async function POST(
  req: Request
): Promise<
  NextResponse<Awaited<ReturnType<typeof importJatosStudyForResearcher>> | JatosApiError>
> {
  try {
    const form = await req.formData()
    const file = form.get("studyFile") as File | null
    const studyIdRaw = form.get("studyId") as string | null
    const jatosWorkerType = form.get("jatosWorkerType") as string | null

    if (!file) {
      return NextResponse.json({ error: "Missing studyFile" } as JatosApiError, { status: 400 })
    }
    if (!studyIdRaw) {
      return NextResponse.json({ error: "Missing studyId" } as JatosApiError, { status: 400 })
    }
    if (!jatosWorkerType || !["SINGLE", "MULTIPLE"].includes(jatosWorkerType)) {
      return NextResponse.json(
        { error: "Missing or invalid jatosWorkerType (SINGLE or MULTIPLE)" } as JatosApiError,
        { status: 400 }
      )
    }

    if (!file.name.endsWith(".jzip")) {
      return NextResponse.json({ error: "Expected a .jzip file" } as JatosApiError, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is 100MB, got ${(file.size / 1024 / 1024).toFixed(
            2
          )}MB`,
        } as JatosApiError,
        { status: 400 }
      )
    }

    const studyId = parseInt(studyIdRaw, 10)
    if (!Number.isFinite(studyId)) {
      return NextResponse.json({ error: "Invalid studyId" } as JatosApiError, { status: 400 })
    }

    const { session } = await getBlitzContext()
    const userId = session.userId
    if (userId == null) {
      return NextResponse.json({ error: "Not authenticated" } as JatosApiError, { status: 401 })
    }

    const result = await importJatosStudyForResearcher({
      file,
      studyId,
      userId,
      jatosWorkerType: jatosWorkerType as "SINGLE" | "MULTIPLE",
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    const err = error as {
      code?: string
      meta?: { target?: string[] }
      message?: string
      jatosStudyUUID?: string
    }
    if (err?.code === "P2002") {
      const target = err?.meta?.target
      if (target?.includes?.("jatosStudyUUID")) {
        return NextResponse.json(
          {
            error: "UUID already exists in database",
            jatosStudyUUID: err.jatosStudyUUID,
          } as JatosApiError & { jatosStudyUUID?: string },
          { status: 409 }
        )
      }
    }
    console.error("Error importing JATOS study:", error)
    const message = error instanceof Error ? error.message : "Failed to import study"
    return NextResponse.json({ error: message } as JatosApiError, { status: 500 })
  }
}
