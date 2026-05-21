// Removed "use server" to keep Blitz RPC conventions clear

import { resolver } from "@blitzjs/rpc"
import { getAdminInvitesRsc } from "../server/getAdminInvites"

export default resolver.pipe(resolver.authorize("SUPERADMIN"), async () => getAdminInvitesRsc())
