import { Prisma } from "db"
import db from "db"
import { getAuthorizedSession } from "@/src/app/(auth)/utils/getAuthorizedSession"
import { studyWithLatestUploadSelect } from "../studySelects"
import type { StudyWithLatestUpload } from "../types"

interface GetStudiesInputType
  extends Pick<Prisma.StudyFindManyArgs, "where" | "orderBy" | "skip" | "take"> {}

type GetStudiesResult = {
  studies: StudyWithLatestUpload[]
  nextPage: Pick<Prisma.StudyFindManyArgs, "take" | "skip"> | null
  hasMore: boolean
  count: number
}

function attachLatestJatosStudyUpload(
  study: Omit<StudyWithLatestUpload, "latestJatosStudyUpload">
): StudyWithLatestUpload {
  return {
    ...study,
    latestJatosStudyUpload: study.jatosStudyUploads[0] ?? null,
  }
}

async function findStudies(args: GetStudiesInputType): Promise<GetStudiesResult> {
  const [studies, count] = await Promise.all([
    db.study.findMany({ ...args, select: studyWithLatestUploadSelect }),
    db.study.count({ where: args.where }),
  ])

  const studiesWithLatestUpload = studies.map(attachLatestJatosStudyUpload)
  const hasMore = (args.skip ?? 0) + (args.take ?? 100) < count
  const nextPage = hasMore ? { take: args.take, skip: (args.skip ?? 0) + (args.take ?? 100) } : null

  return {
    studies: studiesWithLatestUpload,
    nextPage,
    hasMore,
    count,
  }
}

export async function getStudies(args: GetStudiesInputType) {
  await getAuthorizedSession()
  return findStudies(args)
}
