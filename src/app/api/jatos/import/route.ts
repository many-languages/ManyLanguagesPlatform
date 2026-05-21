/**
 * JATOS API Route: Import Study
 *
 * Sole exception to the "no API routes" rule. FormData upload requires this route.
 * Delegates to provisioning/importJatosStudy for JATOS upload + DB + membership sync.
 *
 * Error JSON uses `kind` to separate ingress validation from JATOS/DB failures — see
 * `src/lib/jatos/import/importRouteResponse.ts`.
 *
 * @route POST /api/jatos/import
 * @body FormData: studyFile (File), studyId (number), jatosWorkerType ("SINGLE"|"MULTIPLE")
 * @returns Import result with jatosStudyId, jatosStudyUUID, latestUpload, etc.
 */
import { NextResponse } from "next/server"
import { getBlitzContext } from "@/src/app/blitz-server"
import { parseJatosImportFormData } from "@/src/features/studies/validations"
import {
  jatosImportAuthErrorResponse,
  jatosImportConflictErrorResponse,
  jatosImportIngressErrorResponse,
  jatosImportJatosFailureResponse,
} from "@/src/lib/jatos/import/importRouteResponse"
import { importJatosStudyForResearcher } from "@/src/lib/jatos/provisioning/importJatosStudy"
import type { JatosImportResponse } from "@/src/types/jatos-api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

export async function POST(req: Request): Promise<NextResponse<JatosImportResponse | unknown>> {
  try {
    const form = await req.formData()
    const parsed = parseJatosImportFormData(form)
    if (!parsed.success) {
      return jatosImportIngressErrorResponse(parsed.error)
    }

    const { studyFile: file, studyId, jatosWorkerType } = parsed.data

    const { session } = await getBlitzContext()
    const userId = session.userId
    if (userId == null) {
      return jatosImportAuthErrorResponse()
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
        return jatosImportConflictErrorResponse(
          "UUID already exists in database",
          err.jatosStudyUUID
        )
      }
    }
    console.error("Error importing JATOS study:", error)

    return jatosImportJatosFailureResponse(error)
  }
}
