import db from "db"
import { getAuthorizedSession } from "@/src/app/(auth)/utils/getAuthorizedSession"
import { ensureResearcherStudyMembership } from "@/src/lib/jatos/jatosAccessService"
import { assertStudyNotArchived } from "./studyLifecycle"
import type { CreateStudyInput, UpdateStudyInput } from "../validations"

export async function createStudy(data: CreateStudyInput) {
  const session = await getAuthorizedSession()
  const userId = session.userId

  if (!userId) {
    throw new Error("You must be logged in to create a study")
  }

  const study = await db.study.create({
    data: {
      ...data,
      status: "CLOSED",
      researchers: {
        create: {
          userId,
          role: "PI",
        },
      },
    },
    include: { researchers: true },
  })

  const latestUpload = await db.jatosStudyUpload.findFirst({
    where: { studyId: study.id },
    orderBy: { versionNumber: "desc" },
    select: { jatosStudyId: true },
  })

  if (latestUpload) {
    await ensureResearcherStudyMembership({ userId, jatosStudyId: latestUpload.jatosStudyId })
  }

  return study
}

export async function updateStudy(input: { studyId: number; data: Omit<UpdateStudyInput, "id"> }) {
  const session = await getAuthorizedSession()
  const userId = session.userId

  if (!userId) {
    throw new Error("Not authenticated")
  }

  const isPi = await db.studyResearcher.findFirst({
    where: { studyId: input.studyId, userId, role: "PI" },
    select: { id: true },
  })

  if (!isPi) {
    throw new Error("You are not authorized to update this study")
  }

  await assertStudyNotArchived(input.studyId)

  return db.study.update({
    where: { id: input.studyId },
    data: {
      title: input.data.title,
      description: input.data.description,
      startDate: new Date(input.data.startDate),
      endDate: new Date(input.data.endDate),
      sampleSize: input.data.sampleSize,
      payment: input.data.payment,
      length: input.data.length,
      status: input.data.status,
    },
  })
}
