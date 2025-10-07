import { SimpleRolesIsAuthorized } from "@blitzjs/auth"
import { User, UserRole } from "@/db"

declare module "@blitzjs/auth" {
  export interface Session {
    isAuthorized: SimpleRolesIsAuthorized<UserRole>
    PublicData: {
      userId: User["id"]
      role: UserRole
    }
  }
}
