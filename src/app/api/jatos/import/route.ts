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
import { parseJatosImportFormData } from "@/src/features/studies/validations"
import { importJatosStudyForResearcher } from "@/src/lib/jatos/provisioning/importJatosStudy"
import { isJatosApiError, mapJatosErrorToUserMessage } from "@/src/lib/jatos/errors"
import type { JatosApiError } from "@/src/types/jatos-api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(
  req: Request
): Promise<
  NextResponse<Awaited<ReturnType<typeof importJatosStudyForResearcher>> | JatosApiError>
> {
  try {
    const form = await req.formData()
    const parsed = parseJatosImportFormData(form)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error } as JatosApiError, { status: 400 })
    }

    const { studyFile: file, studyId, jatosWorkerType } = parsed.data

    const { session } = await getBlitzContext()
    const userId = session.userId
    if (userId == null) {
      return NextResponse.json({ error: "Not authenticated" } as JatosApiError, { status: 401 })
    }

    const result = await importJatosStudyForResearcher({
      file,
      studyId,
      userId,
      jatosWorkerType,
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

    const safeError = mapJatosErrorToUserMessage(error)
    const status =
      isJatosApiError(error) && error.status >= 400 && error.status <= 599 ? error.status : 500

    return NextResponse.json({ error: safeError } as JatosApiError, { status })
  }
}
