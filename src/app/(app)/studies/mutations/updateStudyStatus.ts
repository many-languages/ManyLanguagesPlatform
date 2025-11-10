import { resolver } from "@blitzjs/rpc"
import db from "db"
import { UpdateStudyStatus } from "../validations"
import { sendNotification } from "../../notifications/services"

export default resolver.pipe(
  resolver.zod(UpdateStudyStatus),
  resolver.authorize("RESEARCHER"),
  async ({ studyId, status }, ctx) => {
    // Verify the user is a researcher on this study
    const researcher = await db.studyResearcher.findFirst({
      where: { studyId, userId: ctx.session.userId! },
    })

    if (!researcher) {
      throw new Error("You are not authorized to modify this study.")
    }

    const existingStudy = await db.study.findUnique({
      where: { id: studyId },
      select: {
        status: true,
        title: true,
      },
    })

    if (!existingStudy) {
      throw new Error("Study not found.")
    }

    if (existingStudy.status === status) {
      return existingStudy
    }

    const study = await db.study.update({
      where: { id: studyId },
      data: { status },
      select: {
        id: true,
        title: true,
        status: true,
      },
    })

    if (status === "OPEN" && existingStudy.status !== "OPEN") {
      const researcherIds = await db.studyResearcher.findMany({
        where: { studyId },
        select: { userId: true },
      })

      const recipientIds = researcherIds.map((r) => r.userId)

      if (recipientIds.length > 0) {
        const setupCompletedAt = new Intl.DateTimeFormat("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date())

        await sendNotification({
          templateId: "studySetupCompleted",
          recipients: recipientIds,
          data: {
            studyTitle: existingStudy.title ?? study.title,
            setupCompletedAt,
            nextStep: "You can now invite participants and monitor their progress.",
          },
          routeData: {
            path: "/studies/[studyId]",
            params: { studyId },
          },
        })
      }
    }

    return study
  }
)
