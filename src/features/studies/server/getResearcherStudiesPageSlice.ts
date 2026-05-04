import { Prisma } from "db"
import type { StudyView } from "../domain/studyView"
import { getStudies } from "../queries/getStudies"
import type { StudyWithLatestUpload } from "../queries/getStudies"
import { isSetupComplete } from "../domain/setup/setupStatus"

/** Shared page size for `/studies` researcher + participant lists. */
export const STUDIES_LIST_PAGE_SIZE = 7
export const RESEARCHER_STUDIES_MAX_SETUP_FILTER = 500

/**
 * Paginated researcher study rows for `/studies` (researcher role), including "incomplete" setup filter.
 */
export async function getResearcherStudiesPageSlice(options: {
  page: number
  userId: number
  view: StudyView
}): Promise<{
  studies: StudyWithLatestUpload[]
  hasMore: boolean
  extraQuery?: Record<string, string>
}> {
  const { page, userId, view } = options

  const baseWhere: Prisma.StudyWhereInput = {
    OR: [{ researchers: { some: { userId } } }, { participations: { some: { userId } } }],
  }

  let where: Prisma.StudyWhereInput
  switch (view) {
    case "archived":
      where = { AND: [baseWhere, { archived: true }] }
      break
    case "active":
      where = { AND: [baseWhere, { archived: false }, { status: "OPEN" }] }
      break
    case "incomplete":
      where = { AND: [baseWhere, { archived: false }] }
      break
    default:
      where = { AND: [baseWhere, { archived: false }] }
  }

  const extraQuery = view !== "all" ? { view } : undefined

  if (view === "incomplete") {
    const result = await getStudies({
      where: { AND: [baseWhere, { archived: false }] },
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: RESEARCHER_STUDIES_MAX_SETUP_FILTER,
    })
    const filtered = result.studies.filter((s) => !isSetupComplete(s as StudyWithLatestUpload))
    const start = page * STUDIES_LIST_PAGE_SIZE
    return {
      studies: filtered.slice(start, start + STUDIES_LIST_PAGE_SIZE),
      hasMore: filtered.length > start + STUDIES_LIST_PAGE_SIZE,
      extraQuery,
    }
  }

  const result = await getStudies({
    where,
    orderBy: { createdAt: "desc" },
    skip: STUDIES_LIST_PAGE_SIZE * page,
    take: STUDIES_LIST_PAGE_SIZE,
  })
  return { studies: result.studies, hasMore: result.hasMore, extraQuery }
}
