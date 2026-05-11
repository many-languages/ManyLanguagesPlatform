"use server"

import { AuthorizationError } from "blitz"
import db from "db"
import { getAuthorizedSession } from "@/src/app/(auth)/utils/getAuthorizedSession"
import { isStaffAdmin } from "@/src/lib/auth/roles"
import { isSetupComplete, type StudyWithMinimalRelations } from "../domain/setup/setupStatus"
import { pendingAdminApprovalStudySelect } from "../studySelects"
import type { PendingAdminApprovalStudyRow } from "../types"

const DASHBOARD_LIMIT = 3

type PendingAdminApprovalStudyCandidate = {
  id: number
  title: string
  description: string
  FeedbackTemplate: { createdAt: Date } | null
  researchers: Array<{ userId: number; role: string; id: number }>
  jatosStudyUploads: Array<{
    id: number
    step1Completed: boolean
    step2Completed: boolean
    step3Completed: boolean
    step4Completed: boolean
    step5Completed: boolean
    step6Completed: boolean
    jatosWorkerType: string
    jatosFileName: string
  }>
  latestJatosStudyUpload: {
    id: number
    step1Completed: boolean
    step2Completed: boolean
    step3Completed: boolean
    step4Completed: boolean
    step5Completed: boolean
    step6Completed: boolean
    jatosWorkerType: string
    jatosFileName: string
  } | null
}

function attachLatestJatosStudyUpload(
  study: Omit<PendingAdminApprovalStudyCandidate, "latestJatosStudyUpload">
): PendingAdminApprovalStudyCandidate {
  return {
    ...study,
    latestJatosStudyUpload: study.jatosStudyUploads[0] ?? null,
  }
}

async function findPendingAdminApprovalStudiesForDashboard(): Promise<
  PendingAdminApprovalStudyRow[]
> {
  const studies = await db.study.findMany({
    where: {
      adminApproved: null,
      archived: false,
      FeedbackTemplate: { isNot: null },
    },
    select: pendingAdminApprovalStudySelect,
  })

  const mapped = studies.map(attachLatestJatosStudyUpload)
  const ready = mapped.filter((study) => isSetupComplete(study as StudyWithMinimalRelations))

  ready.sort((a, b) => {
    const ta = a.FeedbackTemplate?.createdAt.getTime() ?? 0
    const tb = b.FeedbackTemplate?.createdAt.getTime() ?? 0
    return ta - tb
  })

  return ready.slice(0, DASHBOARD_LIMIT).map((study) => ({
    id: study.id,
    title: study.title,
    feedbackTemplateCreatedAt: study.FeedbackTemplate!.createdAt,
  }))
}

export async function getPendingAdminApprovalStudiesForDashboardRsc() {
  const session = await getAuthorizedSession()
  if (!isStaffAdmin(session.role)) {
    throw new AuthorizationError()
  }

  return findPendingAdminApprovalStudiesForDashboard()
}
