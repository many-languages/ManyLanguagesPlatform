"use server"

import db from "db"
import { getBlitzContext } from "@/src/app/blitz-server"
import {
  getEnrichedResultsForResearcher,
  type DownloadPayload,
} from "@/src/lib/jatos/jatosAccessService"
import { mapJatosErrorToUserMessage } from "@/src/lib/jatos/errors"
import { verifyResearcherStudyAccess } from "../utils/verifyResearchersStudyAccess"
import { isSetupComplete } from "../setup/utils/setupStatus"
import { extractVariableBundleForRenderFromResults } from "../variables/utils/extractVariable"
import { DEFAULT_EXTRACTION_CONFIG } from "../variables/types"
import { observationsToLongCsv } from "../variables/utils/observationsLongCsv"

type StudyForSetupCheck = Parameters<typeof isSetupComplete>[0]

/** Narrow upload shape from our Prisma select (setupStatus allows partial uploads on the type union). */
type LatestUploadRow = {
  id: number
  jatosStudyId: number
  approvedExtractionId: number | null
  step1Completed: boolean
  step2Completed: boolean
  step3Completed: boolean
  step4Completed: boolean
  step5Completed: boolean
  step6Completed: boolean
}

async function loadStudyForCleanedDownload(studyId: number): Promise<StudyForSetupCheck | null> {
  const study = await db.study.findUnique({
    where: { id: studyId },
    select: {
      title: true,
      description: true,
      researchers: { select: { userId: true, role: true } },
      FeedbackTemplate: { select: { id: true } },
      jatosStudyUploads: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          jatosStudyId: true,
          approvedExtractionId: true,
          step1Completed: true,
          step2Completed: true,
          step3Completed: true,
          step4Completed: true,
          step5Completed: true,
          step6Completed: true,
        },
      },
    },
  })
  if (!study) return null
  const latest = study.jatosStudyUploads[0] ?? null
  return {
    ...study,
    latestJatosStudyUpload: latest,
  } as StudyForSetupCheck
}

export async function downloadCleanedResultsAction(
  studyId: number
): Promise<{ success: true; payload: DownloadPayload } | { success: false; error: string }> {
  try {
    const { session } = await getBlitzContext()
    const userId = session.userId
    if (userId == null) {
      return { success: false, error: "Not authenticated" }
    }

    await verifyResearcherStudyAccess(studyId, userId)

    const study = await loadStudyForCleanedDownload(studyId)
    if (!study) {
      return { success: false, error: "Study not found." }
    }

    if (!isSetupComplete(study)) {
      return { success: false, error: "Complete study setup before downloading cleaned results." }
    }

    const latestUpload = study.latestJatosStudyUpload as LatestUploadRow | null
    const jatosStudyId = latestUpload?.jatosStudyId ?? null
    const approvedExtractionId = latestUpload?.approvedExtractionId ?? null

    if (jatosStudyId == null) {
      return { success: false, error: "No JATOS study is linked to this study." }
    }

    if (approvedExtractionId == null) {
      return {
        success: false,
        error: "No approved extraction yet. Approve extraction in setup (step 4) first.",
      }
    }

    const enriched = await getEnrichedResultsForResearcher({
      studyId,
      userId,
      jatosStudyId,
    })

    if (enriched.length === 0) {
      return {
        success: false,
        error: "No results to export. Fetch or collect participant or pilot data first.",
      }
    }

    const studyVariables = await db.studyVariable.findMany({
      where: { extractionSnapshotId: approvedExtractionId },
      select: { variableKey: true, variableName: true },
    })

    const variableKeyToName = new Map(
      studyVariables.map((v) => [v.variableKey, v.variableName] as const)
    )
    const allowlist = new Set(studyVariables.map((v) => v.variableKey))

    const bundle = extractVariableBundleForRenderFromResults(
      enriched,
      allowlist,
      DEFAULT_EXTRACTION_CONFIG
    )

    const csv = observationsToLongCsv(bundle.observations, variableKeyToName, {
      includeUtf8Bom: true,
    })

    const buffer = Buffer.from(csv, "utf8")
    const base64 = buffer.toString("base64")

    return {
      success: true,
      payload: {
        filename: `study_${studyId}_cleaned_results.csv`,
        mimeType: "text/csv; charset=utf-8",
        base64,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: mapJatosErrorToUserMessage(error),
    }
  }
}
