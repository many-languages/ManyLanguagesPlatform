import { resolver } from "@blitzjs/rpc"
import db from "db"
import { ArchiveStudy } from "../validations"
import { assertStudyArchiveAllowed } from "@/src/lib/studies"
import type { UserRole } from "@/db"

/** Shared logic for PI and ADMIN archive paths. */
async function performArchiveStudy(studyId: number, userId: number, role: UserRole) {
  if (role === "ADMIN") {
    // Admin may archive any study; no StudyResearcher row required.
  } else {
    const researcher = await db.studyResearcher.findFirst({
      where: { studyId, userId, role: "PI" },
    })
    if (!researcher) {
      throw new Error("You are not authorized to archive this study")
    }
  }

  await assertStudyArchiveAllowed(studyId)

  return db.study.update({
    where: { id: studyId },
    data: {
      archived: true,
      archivedAt: new Date(),
      archivedById: userId,
      status: "CLOSED",
    },
    select: { id: true, archived: true, archivedAt: true, status: true },
  })
}

export default resolver.pipe(
  resolver.zod(ArchiveStudy),
  resolver.authorize(),
  async ({ id }, ctx) => {
    if (!ctx.session.userId) {
      throw new Error("You must be logged in to archive this study")
    }

    const role = ctx.session.role as UserRole
    if (role !== "ADMIN" && role !== "RESEARCHER") {
      throw new Error("You are not authorized to archive this study")
    }

    return performArchiveStudy(id, ctx.session.userId, role)
  }
)
