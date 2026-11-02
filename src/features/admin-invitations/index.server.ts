// Server-only entry point. Do not import from client components — see `./index.ts` for the client-safe surface.
export { getAdminInvitesRsc } from "./server/getAdminInvites"
export { getStalePendingAdminInvitesRsc } from "./server/getStalePendingAdminInvites"
