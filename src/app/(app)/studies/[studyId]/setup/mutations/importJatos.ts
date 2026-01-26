import { resolver } from "@blitzjs/rpc"
import db from "db"
import { ImportJatosSchema } from "../../../validations"
import { verifyResearcherStudyAccess } from "../../utils/verifyResearchersStudyAccess"

export default resolver.pipe(
  resolver.zod(ImportJatosSchema),
  resolver.authorize("RESEARCHER"),
  async (input, ctx) => {
    const {
      studyId,
      jatosWorkerType,
      jatosStudyId,
      jatosStudyUUID,
      jatosFileName,
      buildHash,
      hashAlgorithm,
    } = input

    // Authorization check
    await verifyResearcherStudyAccess(studyId)

    try {
      const result = await db.$transaction(async (tx) => {
        const studyInfo = await tx.study.findUnique({
          where: { id: studyId },
          select: { title: true, description: true },
        })

        if (!studyInfo) {
          throw new Error("Study not found")
        }

        const step1Completed = Boolean(studyInfo.title && studyInfo.description)

        const latestUpload = await tx.jatosStudyUpload.findFirst({
          where: { studyId },
          orderBy: { versionNumber: "desc" },
          select: { versionNumber: true },
        })

        const versionNumber = (latestUpload?.versionNumber ?? 0) + 1

        const study = await tx.study.update({
          where: { id: studyId },
          data: { jatosStudyUUID },
          select: { id: true, jatosStudyUUID: true },
        })

        const upload = await tx.jatosStudyUpload.create({
          data: {
            studyId,
            versionNumber,
            jatosStudyId,
            jatosFileName,
            jatosWorkerType,
            buildHash,
            hashAlgorithm: hashAlgorithm ?? undefined,
            step1Completed,
          },
          select: {
            id: true,
            studyId: true,
            versionNumber: true,
            jatosStudyId: true,
            jatosFileName: true,
            jatosWorkerType: true,
            buildHash: true,
            hashAlgorithm: true,
          },
        })

        return { study, upload }
      })

      return { study: result.study, latestUpload: result.upload }
    } catch (e: any) {
      // Handle DB unique constraint (shouldn't happen with new flow)
      if (e?.code === "P2002") {
        const target = e?.meta?.target
        if (target?.includes?.("jatosStudyUUID")) {
          return {
            error: "UUID already exists in database",
            jatosStudyUUID,
          }
        }
        if (target?.includes?.("buildHash")) {
          return {
            error: "This JATOS build has already been imported for this study",
          }
        }
      }
      throw e
    }
  }
)
