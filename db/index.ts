import { enhancePrisma } from "blitz"
import { PrismaClient } from "@prisma/client"

// Only check DATABASE_URL at runtime, not during the Next.js build phase.
// Client-side code should never access the database directly.
const isBuild = process.env.NEXT_PHASE === "phase-production-build"
if (typeof window === "undefined" && !isBuild) {
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
