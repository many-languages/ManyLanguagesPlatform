import { AuthorizationError } from "blitz"
import { resolver } from "@blitzjs/rpc"
import { getAuthorizedSession } from "@/src/app/(auth)/utils/getAuthorizedSession"
import { isStaffAdmin } from "@/src/lib/auth/roles"
import {
  getStudySummaryCounts,
  type StudySummaryCounts,
} from "@/src/lib/studies/studySummaryCounts"

export type { StudySummaryCounts }

export async function getAdminStudyCounts(): Promise<StudySummaryCounts> {
  const session = await getAuthorizedSession()
  if (!isStaffAdmin(session.role)) {
    throw new AuthorizationError()
  }
  return getStudySummaryCounts({})
}

/** Blitz RPC handler — required for files in queries/. Prefer getAdminStudyCounts from RSC. */
const getAdminStudyCountsRpc = resolver.pipe(
  resolver.authorize(["ADMIN", "SUPERADMIN"]),
  async () => getStudySummaryCounts({})
)

export default getAdminStudyCountsRpc
