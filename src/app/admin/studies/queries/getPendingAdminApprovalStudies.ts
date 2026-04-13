"use server"

import { AuthorizationError } from "blitz"
import { resolver } from "@blitzjs/rpc"
import db from "db"
import { getAuthorizedSession } from "@/src/app/(auth)/utils/getAuthorizedSession"
import { isStaffAdmin } from "@/src/lib/auth/roles"
import {
  isSetupComplete,
  type StudyWithMinimalRelations,
} from "@/src/app/(app)/studies/[studyId]/setup/utils/setupStatus"

const DASHBOARD_LIMIT = 3

async function findPendingAdminApprovalStudiesForDashboard() {
  const studies = await db.study.findMany({
    where: {
      adminApproved: null,
      archived: false,
      FeedbackTemplate: { isNot: null },
    },
    select: {
      id: true,
      title: true,
      description: true,
      FeedbackTemplate: { select: { createdAt: true } },
      researchers: { select: { userId: true, role: true, id: true } },
      jatosStudyUploads: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          step1Completed: true,
          step2Completed: true,
          step3Completed: true,
          step4Completed: true,
          step5Completed: true,
          step6Completed: true,
          jatosWorkerType: true,
          jatosFileName: true,
        },
      },
    },
  })

  const mapped = studies.map((s) => ({
    ...s,
    latestJatosStudyUpload: s.jatosStudyUploads[0] ?? null,
  }))

  const ready = mapped.filter((s) => isSetupComplete(s as StudyWithMinimalRelations))

  ready.sort((a, b) => {
    const ta = a.FeedbackTemplate?.createdAt.getTime() ?? 0
    const tb = b.FeedbackTemplate?.createdAt.getTime() ?? 0
    return ta - tb
  })

  return ready.slice(0, DASHBOARD_LIMIT).map((s) => ({
    id: s.id,
    title: s.title,
    feedbackTemplateCreatedAt: s.FeedbackTemplate!.createdAt,
  }))
}

/**
 * Studies pending admin approval with setup complete, oldest feedback template first (most urgent).
 */
export async function getPendingAdminApprovalStudiesForDashboardRsc() {
  const session = await getAuthorizedSession()
  if (!isStaffAdmin(session.role)) {
    throw new AuthorizationError()
  }

  return findPendingAdminApprovalStudiesForDashboard()
}

/** Blitz RPC handler — required for files in queries/. Prefer getPendingAdminApprovalStudiesForDashboardRsc from RSC. */
const getPendingAdminApprovalStudies = resolver.pipe(
  resolver.authorize(["ADMIN", "SUPERADMIN"]),
  async () => findPendingAdminApprovalStudiesForDashboard()
)

export default getPendingAdminApprovalStudies

export type PendingAdminApprovalStudyRow = Awaited<
  ReturnType<typeof getPendingAdminApprovalStudiesForDashboardRsc>
>[number]
