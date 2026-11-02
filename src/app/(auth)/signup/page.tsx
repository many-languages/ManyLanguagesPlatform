import { validateAdminInviteToken } from "@/src/features/admin-invitations/server/validateAdminInviteToken"
import { SignupForm } from "@/src/features/auth/ui/client/SignupForm"

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ adminInvite?: string | string[] }>
}) {
  const { adminInvite } = await searchParams
  const token = typeof adminInvite === "string" ? adminInvite : ""

  // Validate an invite link on the server so the first render is already filled in
  const initialInviteValidation = token ? await validateAdminInviteToken({ token }) : null

  return <SignupForm initialInviteToken={token} initialInviteValidation={initialInviteValidation} />
}
