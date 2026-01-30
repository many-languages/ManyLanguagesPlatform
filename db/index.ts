import { enhancePrisma } from "blitz"
import { PrismaClient } from "@prisma/client"

// Only check DATABASE_URL on the server side
// Client-side code should never access the database directly
if (typeof window === "undefined") {
  // Ensure DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set!")
  }

  // Verify it contains the correct database name
  if (!process.env.DATABASE_URL.includes("manylanguagesplatform")) {
    throw new Error('DATABASE_URL must point to "manylanguagesplatform" database')
  }
}

const EnhancedPrisma = enhancePrisma(PrismaClient)

export * from "@prisma/client"

const db = new EnhancedPrisma()

export default db
