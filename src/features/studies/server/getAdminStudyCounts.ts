import { AuthorizationError } from "blitz"
import { getAuthorizedSession } from "@/src/app/(auth)/utils/getAuthorizedSession"
import { isStaffAdmin } from "@/src/lib/auth/roles"
import { getStudySummaryCounts, type StudySummaryCounts } from "./studySummaryCounts"

export async function getAdminStudyCounts(): Promise<StudySummaryCounts> {
  const session = await getAuthorizedSession()
  if (!isStaffAdmin(session.role)) {
    throw new AuthorizationError()
  }

  return getStudySummaryCounts({})
}
