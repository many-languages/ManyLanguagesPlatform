import db from "db"
import { resolver } from "@blitzjs/rpc"
import { assertStudyNotArchived } from "@/src/lib/studies"
import { verifyResearcherStudyAccess } from "@/src/app/(app)/studies/[studyId]/utils/verifyResearchersStudyAccess"
import { ToggleParticipantPayed } from "../validations"

export default resolver.pipe(
  resolver.zod(ToggleParticipantPayed),
  resolver.authorize("RESEARCHER"),
  async ({ participantIds, makePayed }, ctx) => {
    if (participantIds.length === 0) {
      throw new Error("No participants selected.")
    }

    const rows = await db.participantStudy.findMany({
      where: { id: { in: participantIds } },
      select: { id: true, studyId: true },
    })
    if (rows.length !== participantIds.length) {
      throw new Error("One or more participants not found.")
    }
    const studyIds = [...new Set(rows.map((r) => r.studyId))]
    if (studyIds.length !== 1) {
      throw new Error("Participants must belong to a single study.")
    }
    const studyId = studyIds[0]!
    await verifyResearcherStudyAccess(studyId, ctx.session.userId!)
    await assertStudyNotArchived(studyId)

    const updated = await db.participantStudy.updateMany({
      where: { id: { in: participantIds } },
      data: { payed: makePayed },
    })

    return updated
  }
)
