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
import { JatosApiError, JatosTransportError } from "@/src/lib/jatos/errors"
import type { JatosImportResponse } from "@/src/types/jatos-api"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

function getSafeImportErrorLogContext(input: {
  error: unknown
  studyId?: number
  userId?: number
}) {
  const { error, studyId, userId } = input
  const base = {
    operation: "jatos_import",
    studyId,
    userId,
    errorName: error instanceof Error ? error.name : typeof error,
  }

  if (error instanceof JatosTransportError) {
    return {
      ...base,
      category: "jatos_transport",
      jatosOperation: error.operation,
      causeName: error.cause instanceof Error ? error.cause.name : undefined,
    }
  }

  if (error instanceof JatosApiError) {
    return {
      ...base,
      category: "jatos_api",
      status: error.status,
      code: error.code,
      jatosOperation: error.context?.operation,
    }
  }

  const err = error as { code?: string; meta?: { target?: string[] } } | null
  if (err?.code) {
    return {
      ...base,
      category: "database_or_known_error",
      code: err.code,
      target: err.meta?.target,
    }
  }

  return {
    ...base,
    category: "unexpected",
  }
}

export async function POST(req: Request): Promise<NextResponse<JatosImportResponse | unknown>> {
  let studyIdForLog: number | undefined
  let userIdForLog: number | undefined

  try {
    const form = await req.formData()
    const parsed = parseJatosImportFormData(form)
    if (!parsed.success) {
      return jatosImportIngressErrorResponse(parsed.error)
    }

    const { studyFile: file, studyId, jatosWorkerType } = parsed.data
    studyIdForLog = studyId

    const { session } = await getBlitzContext()
    const userId = session.userId
    userIdForLog = userId ?? undefined
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
    console.error(
      "[JatosImportRoute] Import failed",
      getSafeImportErrorLogContext({ error, studyId: studyIdForLog, userId: userIdForLog })
    )

    return jatosImportJatosFailureResponse(error)
  }
}
