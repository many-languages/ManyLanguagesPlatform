"use server"

import { AuthorizationError } from "blitz"
import db from "db"
import { getAuthorizedSession } from "@/src/lib/auth/session"
import { isStaffAdmin } from "@/src/lib/auth/roles"
import { studyHasParticipantResponsesSafe } from "./participantResponses"
import { adminStudyWithLatestUploadArgs } from "../studySelects"
import type { AdminStudyListItemDto } from "../types"

type AdminStudyRow = Awaited<ReturnType<typeof findAdminStudyRows>>[number]

async function findAdminStudyRows() {
  return db.study.findMany({
    ...adminStudyWithLatestUploadArgs,
    orderBy: { createdAt: "desc" },
  })
}

function toAdminStudyListItem(
  study: AdminStudyRow,
  hasParticipantResponses: boolean | null
): AdminStudyListItemDto {
  return {
    id: study.id,
    createdAt: study.createdAt,
    title: study.title,
    description: study.description,
    status: study.status,
    jatosStudyUUID: study.jatosStudyUUID,
    adminApproved: study.adminApproved,
    archived: study.archived,
    latestJatosStudyUpload: study.jatosStudyUploads[0] ?? null,
    hasParticipantResponses,
    feedbackTemplate: study.FeedbackTemplate,
    codebook: study.codebook,
  }
}

async function findAdminStudies(): Promise<AdminStudyListItemDto[]> {
  const studies = await findAdminStudyRows()
  return Promise.all(
    studies.map(async (study) =>
      toAdminStudyListItem(study, await studyHasParticipantResponsesSafe(study.id))
    )
  )
}

export async function getStudiesRsc() {
  const session = await getAuthorizedSession()
  if (!isStaffAdmin(session.role)) {
    throw new AuthorizationError()
  }

  return findAdminStudies()
}
