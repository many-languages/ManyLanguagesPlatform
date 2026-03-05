/**
 * Study status scheduler logic: opens studies at startDate and closes at endDate.
 * Used by the cron API route and can be called from external schedulers.
 */
import db from "db"
import { isSetupComplete } from "@/src/app/(app)/studies/[studyId]/setup/utils/setupStatus"
import type { StudyWithMinimalRelations } from "@/src/app/(app)/studies/[studyId]/setup/utils/setupStatus"

export interface StudyStatusSchedulerResult {
  opened: number
  closed: number
}

export async function runStudyStatusScheduler(): Promise<StudyStatusSchedulerResult> {
  const now = new Date()

  // Fetch all studies with their latest upload for setup check
  const studies = await db.study.findMany({
    where: {
      archived: false,
      OR: [{ status: "CLOSED", adminApproved: true }, { status: "OPEN" }],
    },
    include: {
      jatosStudyUploads: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  })

  const studiesWithLatestUpload = studies.map((s) => ({
    ...s,
    latestJatosStudyUpload: s.jatosStudyUploads[0] ?? null,
  }))

  // Open: adminApproved = true, setup complete, status = CLOSED, startDate <= now < endDate
  const toOpen = studiesWithLatestUpload.filter(
    (s) =>
      s.adminApproved === true &&
      isSetupComplete(s as StudyWithMinimalRelations) &&
      s.status === "CLOSED" &&
      s.startDate <= now &&
      s.endDate > now
  )

  // Close: status = OPEN, endDate < now
  const toClose = studiesWithLatestUpload.filter((s) => s.status === "OPEN" && s.endDate < now)

  if (toOpen.length > 0) {
    await db.study.updateMany({
      where: { id: { in: toOpen.map((s) => s.id) } },
      data: { status: "OPEN" },
    })
  }

  if (toClose.length > 0) {
    await db.study.updateMany({
      where: { id: { in: toClose.map((s) => s.id) } },
      data: { status: "CLOSED" },
    })
  }

  return { opened: toOpen.length, closed: toClose.length }
}
