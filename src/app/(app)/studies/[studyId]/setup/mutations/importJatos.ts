import { resolver } from "@blitzjs/rpc"
import db from "db"
import { ImportJatosSchema } from "../../../validations"
import { verifyResearcherStudyAccess } from "../../utils/verifyResearchersStudyAccess"
import { deriveStep1Completed } from "../utils/deriveStep1Completed"

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
    await verifyResearcherStudyAccess(studyId, ctx.session.userId!)

    try {
      const result = await db.$transaction(async (tx) => {
        const studyInfo = await tx.study.findUnique({
          where: { id: studyId },
          select: { title: true, description: true },
        })

        if (!studyInfo) {
          throw new Error("Study not found")
        }

        const step1Completed = deriveStep1Completed(studyInfo)

        const study = await tx.study.update({
          where: { id: studyId },
          data: { jatosStudyUUID },
          select: { id: true, jatosStudyUUID: true },
        })

        // If same build already imported (update flow), update existing record instead of creating
        const existingUpload = await tx.jatosStudyUpload.findUnique({
          where: { studyId_buildHash: { studyId, buildHash } },
          select: { id: true },
        })

        let upload
        if (existingUpload) {
          upload = await tx.jatosStudyUpload.update({
            where: { id: existingUpload.id },
            data: {
              jatosStudyId,
              jatosFileName,
              jatosWorkerType,
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
        } else {
          const latestUpload = await tx.jatosStudyUpload.findFirst({
            where: { studyId },
            orderBy: { versionNumber: "desc" },
            select: { versionNumber: true },
          })
          const versionNumber = (latestUpload?.versionNumber ?? 0) + 1

          upload = await tx.jatosStudyUpload.create({
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
        }

        return { study, upload }
      })

      return { study: result.study, latestUpload: result.upload }
    } catch (e: any) {
      // Handle DB unique constraint (e.g. jatosStudyUUID on Study)
      if (e?.code === "P2002") {
        const target = e?.meta?.target
        if (target?.includes?.("jatosStudyUUID")) {
          return {
            error: "UUID already exists in database",
            jatosStudyUUID,
          }
        }
      }
      throw e
    }
  }
)
