import { enhancePrisma } from "blitz"
import { PrismaClient } from "@prisma/client"

// Only check DATABASE_URL on the server side at runtime — skip during `next build`
// so static route scanning doesn't fail when no database is available.
if (typeof window === "undefined" && process.env.NEXT_PHASE !== "phase-production-build") {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set!")
  }

  if (!process.env.DATABASE_URL.includes("manylanguagesplatform")) {
    throw new Error('DATABASE_URL must point to "manylanguagesplatform" database')
  }
}

const EnhancedPrisma = enhancePrisma(PrismaClient)

export * from "@prisma/client"

const db = new EnhancedPrisma()

export default db
