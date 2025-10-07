-- CreateEnum
CREATE TYPE "public"."JatosWorkerType" AS ENUM ('SINGLE', 'MULTIPLE');

-- AlterTable
ALTER TABLE "public"."Study" ADD COLUMN     "jatosWorkerType" "public"."JatosWorkerType" NOT NULL DEFAULT 'SINGLE';
