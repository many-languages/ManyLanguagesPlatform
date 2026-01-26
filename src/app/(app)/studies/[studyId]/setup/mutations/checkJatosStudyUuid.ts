import { resolver } from "@blitzjs/rpc"
import db from "db"
import { z } from "zod"
import { verifyResearcherStudyAccess } from "../../utils/verifyResearchersStudyAccess"
import { checkJatosStudyExists } from "@/src/lib/jatos/api/checkJatosStudyExists"

const CheckJatosStudyUuid = z.object({
  studyId: z.number().int().positive(),
  jatosStudyUUID: z.string().min(1),
  mode: z.enum(["create", "update"]),
})

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default resolver.pipe(
  resolver.zod(CheckJatosStudyUuid),
  resolver.authorize("RESEARCHER"),
  async ({ studyId, jatosStudyUUID, mode }) => {
    await verifyResearcherStudyAccess(studyId)

    const trimmed = jatosStudyUUID.trim()
    if (!trimmed || !UUID_REGEX.test(trimmed)) {
      return { ok: false, error: "Invalid or missing JATOS study UUID in the .jzip file." }
    }

    const existingStudy = await db.study.findFirst({
      where: {
        jatosStudyUUID: trimmed,
        id: { not: studyId },
      },
      select: { id: true, title: true },
    })

    if (existingStudy) {
      return {
        ok: false,
        error: "This JATOS study UUID is already linked to another study.",
      }
    }

    let existsOnJatos = false
    try {
      const result = await checkJatosStudyExists(trimmed)
      existsOnJatos = result.exists
    } catch (error: any) {
      return {
        ok: false,
        error: `Failed to verify JATOS study on the server: ${error?.message || "Unknown error"}`,
      }
    }

    if (mode === "create" && existsOnJatos) {
      return {
        ok: false,
        error: "This JATOS study already exists on the server. Please create a new study.",
      }
    }

    if (mode === "update" && !existsOnJatos) {
      return {
        ok: false,
        error: "This JATOS study was not found on the server. Please re-import it first.",
      }
    }

    return { ok: true, existsOnJatos }
  }
)
