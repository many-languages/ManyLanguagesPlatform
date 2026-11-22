-- Users can hold several roles (e.g. RESEARCHER + ADMIN). The role in use at a given moment lives
-- only in the session, so `User.role` is replaced by `User.roles`.

-- AlterTable: roles (backfilled from the old single role, then the old column is dropped)
ALTER TABLE "User" ADD COLUMN "roles" "UserRole"[];
UPDATE "User" SET "roles" = ARRAY["role"];
ALTER TABLE "User" ADD CONSTRAINT "User_roles_not_empty" CHECK ("roles" IS NOT NULL AND cardinality("roles") > 0);
ALTER TABLE "User" DROP COLUMN "role";

-- CreateEnum
CREATE TYPE "NotificationAudience" AS ENUM ('PORTAL', 'ADMIN');

-- AlterTable: notifications are split into a portal inbox and an admin inbox
ALTER TABLE "Notification" ADD COLUMN "audience" "NotificationAudience" NOT NULL DEFAULT 'PORTAL';
UPDATE "Notification" SET "audience" = 'ADMIN' WHERE "routeData"->>'path' LIKE '/admin%';

-- AlterTable: remember who accepted an admin invite
ALTER TABLE "AdminInvite" ADD COLUMN "redeemedById" INTEGER;
ALTER TABLE "AdminInvite" ADD CONSTRAINT "AdminInvite_redeemedById_fkey" FOREIGN KEY ("redeemedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
