import { AuthenticationError } from "blitz"
import db from "db"
import type { JatosWorkerType } from "@/db"
import { getAuthorizedSession } from "@/src/app/(auth)/utils/getAuthorizedSession"
import { checkJatosStudyUuidForSetup } from "@/src/lib/jatos/jatosAccessService"
import { withStudyWriteAccess } from "./withStudyWriteAccess"

export async function checkJatosStudyUuid(input: {
  studyId: number
  jatosStudyUUID: string
  mode: "create" | "update"
}) {
  const session = await getAuthorizedSession()
  const userId = session.userId

  if (!userId) {
    throw new Error("Not authenticated")
  }

  return checkJatosStudyUuidForSetup({
    studyId: input.studyId,
    userId,
    jatosStudyUuid: input.jatosStudyUUID,
    mode: input.mode,
  })
}

export async function updateJatosUploadWorkerType(input: {
  studyId: number
  jatosWorkerType: JatosWorkerType
}) {
  return withStudyWriteAccess(input.studyId, async (studyId) => {
    const latestUpload = await db.jatosStudyUpload.findFirst({
      where: { studyId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    })

    if (!latestUpload) {
      throw new Error("No JATOS upload found for this study")
    }

    return db.jatosStudyUpload.update({
      where: { id: latestUpload.id },
      data: { jatosWorkerType: input.jatosWorkerType },
      select: { id: true, jatosWorkerType: true, studyId: true },
    })
  })
}

export async function updateStudyBatch(input: { studyId: number; jatosBatchId: number }) {
  return withStudyWriteAccess(input.studyId, async (studyId) => {
    const latestUpload = await db.jatosStudyUpload.findFirst({
      where: { studyId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    })

    if (!latestUpload) {
      throw new Error("No JATOS upload found for this study")
    }

    return db.jatosStudyUpload.update({
      where: { id: latestUpload.id },
      data: { jatosBatchId: input.jatosBatchId },
      select: { id: true, jatosBatchId: true, studyId: true },
    })
  })
}

export async function updateSetupCompletion(input: {
  studyId: number
  step1Completed?: boolean
  step2Completed?: boolean
  step3Completed?: boolean
  step4Completed?: boolean
  step5Completed?: boolean
  step6Completed?: boolean
}) {
  const { studyId, ...completionFlags } = input

  return withStudyWriteAccess(studyId, async (verifiedStudyId) => {
    const updateData: {
      step1Completed?: boolean
      step2Completed?: boolean
      step3Completed?: boolean
      step4Completed?: boolean
      step5Completed?: boolean
      step6Completed?: boolean
    } = {}

    if (completionFlags.step1Completed !== undefined) {
      updateData.step1Completed = completionFlags.step1Completed
    }
    if (completionFlags.step2Completed !== undefined) {
      updateData.step2Completed = completionFlags.step2Completed
    }
    if (completionFlags.step3Completed !== undefined) {
      updateData.step3Completed = completionFlags.step3Completed
    }
    if (completionFlags.step4Completed !== undefined) {
      updateData.step4Completed = completionFlags.step4Completed
    }
    if (completionFlags.step5Completed !== undefined) {
      updateData.step5Completed = completionFlags.step5Completed
    }
    if (completionFlags.step6Completed !== undefined) {
      updateData.step6Completed = completionFlags.step6Completed
    }

    const latestUpload = await db.jatosStudyUpload.findFirst({
      where: { studyId: verifiedStudyId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    })

    if (!latestUpload) {
      throw new Error("No JATOS upload found for this study")
    }

    return db.jatosStudyUpload.update({
      where: { id: latestUpload.id },
      data: updateData,
      select: {
        step1Completed: true,
        step2Completed: true,
        step3Completed: true,
        step4Completed: true,
        step5Completed: true,
        step6Completed: true,
        studyId: true,
      },
    })
  })
}

export async function createResearcherPilotLink(input: {
  studyId: number
  studyResearcherId: number
  jatosStudyUploadId: number
  jatosRunUrl: string
  markerToken: string
}) {
  return withStudyWriteAccess(input.studyId, async (studyId, userId) => {
    const researcher = await db.studyResearcher.findUnique({
      where: { id: input.studyResearcherId },
      select: { id: true, studyId: true, userId: true },
    })

    if (!researcher || researcher.studyId !== studyId) {
      throw new Error("Researcher not found for this study")
    }

    if (researcher.userId !== userId) {
      throw new AuthenticationError("Unauthorized access to researcher record")
    }

    const upload = await db.jatosStudyUpload.findUnique({
      where: { id: input.jatosStudyUploadId },
      select: { id: true, studyId: true },
    })

    if (!upload || upload.studyId !== studyId) {
      throw new Error("JATOS upload not found for this study")
    }

    return db.pilotLink.create({
      data: {
        studyResearcherId: researcher.id,
        jatosStudyUploadId: upload.id,
        jatosRunUrl: input.jatosRunUrl,
        markerToken: input.markerToken,
      },
    })
  })
}
