export const SIGNUP_USER_ROLES = ["RESEARCHER", "PARTICIPANT", "ADMIN"] as const

export type SignupUserRole = (typeof SIGNUP_USER_ROLES)[number]

export const SIGNUP_USER_ROLE = {
  RESEARCHER: "RESEARCHER",
  PARTICIPANT: "PARTICIPANT",
  ADMIN: "ADMIN",
} as const satisfies Record<SignupUserRole, SignupUserRole>

export const SIGNUP_ROLE_OPTIONS = [
  { value: SIGNUP_USER_ROLE.RESEARCHER, label: "Researcher" },
  { value: SIGNUP_USER_ROLE.PARTICIPANT, label: "Participant" },
] satisfies Array<{ value: SignupUserRole; label: string }>

/** Role choices on the signup form; picking Administrator reveals the invite token field. */
export const SIGNUP_ROLE_OPTIONS_WITH_ADMIN = [
  ...SIGNUP_ROLE_OPTIONS,
  { value: SIGNUP_USER_ROLE.ADMIN, label: "Administrator (invite required)" },
] satisfies Array<{ value: SignupUserRole; label: string }>
