import { enhancePrisma } from "blitz"
import { PrismaClient } from "@prisma/client"

// Only check DATABASE_URL on the server side
// Client-side code should never access the database directly
if (typeof window === "undefined") {
  // Log DATABASE_URL at module load time
  console.log(
    "🔍 [db/index.ts] Module loading - DATABASE_URL:",
    process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":****@") || "NOT SET"
  )

  // Ensure DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set!")
  }

  // Verify it contains the correct database name
  if (!process.env.DATABASE_URL.includes("manylanguagesplatform")) {
    console.error('ERROR: DATABASE_URL does not point to "manylanguagesplatform" database!')
    console.error("Current DATABASE_URL:", process.env.DATABASE_URL.replace(/:[^:@]+@/, ":****@"))
    throw new Error('DATABASE_URL must point to "manylanguagesplatform" database')
  }

  // Extract database name from connection string for logging
  const dbNameMatch = process.env.DATABASE_URL.match(/\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/)
  if (dbNameMatch) {
    const [, user, , host, port, dbName] = dbNameMatch
    console.log(
      `🔍 [db/index.ts] Parsed connection: user=${user}, host=${host}, port=${port}, database=${dbName}`
    )
  }
}

const EnhancedPrisma = enhancePrisma(PrismaClient)

export * from "@prisma/client"

// Log when Prisma Client is instantiated
console.log("🔍 [db/index.ts] Creating Prisma Client instance...")
const db = new EnhancedPrisma()

// Fix MaxListenersExceededWarning by increasing the limit
if (typeof window === "undefined") {
  // Increase max listeners to prevent warnings during development
  db.$on?.setMaxListeners?.(20)

  // Log connection info after a short delay to see if it connects
  setTimeout(() => {
    console.log(
      "🔍 [db/index.ts] Prisma Client created, DATABASE_URL at this moment:",
      process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":****@") || "NOT SET"
    )
  }, 1000)
}

export default db
