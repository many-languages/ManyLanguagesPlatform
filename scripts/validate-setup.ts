#!/usr/bin/env npx tsx
/**
 * Validates JATOS and app setup before deployment.
 * Run via: make validate-setup or npx tsx scripts/validate-setup.ts
 *
 * Checks:
 * - JATOS_BASE and NEXT_PUBLIC_JATOS_BASE set
 * - JATOS_TOKEN set and valid (calls /jatos/api/v1/admin/token)
 * - Service account in SystemConfig (key jatosServiceUserID)
 * - DATABASE_URL connectivity
 * - In production: required env vars and no placeholder secrets
 */

import { config } from "dotenv"
import {
  collectProductionEnvIssues,
  isUnsafeEnvValue,
  PRODUCTION_SECRET_ENV_KEYS,
} from "../src/lib/env"

// Load .env from project root (for local runs)
config({ path: ".env" })

const JATOS_BASE = process.env.JATOS_BASE
const JATOS_TOKEN = process.env.JATOS_TOKEN
const NODE_ENV = process.env.NODE_ENV || "development"
const isProduction = NODE_ENV === "production"

async function checkJatosBase(): Promise<boolean> {
  if (!JATOS_BASE?.trim()) {
    console.error("❌ JATOS_BASE is not set")
    return false
  }
  console.log("✅ JATOS_BASE is set")
  return true
}

function checkPublicJatosBase(): boolean {
  if (!process.env.NEXT_PUBLIC_JATOS_BASE?.trim()) {
    console.error("❌ NEXT_PUBLIC_JATOS_BASE is not set")
    return false
  }
  console.log("✅ NEXT_PUBLIC_JATOS_BASE is set")
  return true
}

async function checkJatosToken(): Promise<boolean> {
  if (!JATOS_TOKEN?.trim()) {
    console.error("❌ JATOS_TOKEN is not set")
    return false
  }

  if (isProduction && isUnsafeEnvValue(JATOS_TOKEN)) {
    console.error("❌ JATOS_TOKEN appears to use a placeholder value")
    return false
  }

  try {
    const res = await fetch(`${JATOS_BASE}/jatos/api/v1/admin/token`, {
      headers: {
        Authorization: `Bearer ${JATOS_TOKEN}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    })

    if (res.ok) {
      console.log("✅ JATOS_TOKEN is valid")
      return true
    }
    const text = await res.text()
    console.error(`❌ JATOS_TOKEN validation failed (${res.status}): ${text}`)
    return false
  } catch (err) {
    console.error(`❌ Error validating JATOS_TOKEN: ${(err as Error).message}`)
    console.error("   Ensure JATOS is running and reachable at JATOS_BASE")
    return false
  }
}

async function checkServiceAccount(): Promise<boolean> {
  try {
    const { default: db } = await import("../db")
    const config = await db.systemConfig.findUnique({
      where: { key: "jatosServiceUserID" },
    })
    if (!config?.value) {
      if (isProduction) {
        console.error("❌ Service account not in SystemConfig (key jatosServiceUserID)")
        return false
      }
      console.warn("⚠️  Service account not yet provisioned (run app once to auto-provision)")
      return true // Warn only in dev
    }
    console.log("✅ Service account provisioned")
    return true
  } catch (err) {
    console.error(`❌ Error checking service account: ${(err as Error).message}`)
    return false
  }
}

async function checkDatabaseConnectivity(): Promise<boolean> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl?.trim()) {
    console.error("❌ DATABASE_URL is not set")
    return false
  }

  try {
    const { default: db } = await import("../db")
    await db.$queryRaw`SELECT 1`
    console.log("✅ DATABASE_URL connects successfully")
    return true
  } catch (err) {
    console.error(`❌ DATABASE_URL connectivity failed: ${(err as Error).message}`)
    return false
  }
}

function checkProductionEnv(): boolean {
  if (!isProduction) return true

  const issues = collectProductionEnvIssues()
  if (issues.length > 0) {
    for (const issue of issues) {
      console.error(`❌ ${issue}`)
    }
    return false
  }

  console.log(
    `✅ Production env OK (${PRODUCTION_SECRET_ENV_KEYS.join(
      ", "
    )}, JATOS_BASE, NEXT_PUBLIC_JATOS_BASE)`
  )
  return true
}

async function main() {
  console.log("🔍 Validating setup...\n")

  const results: boolean[] = []
  results.push(await checkJatosBase())
  results.push(checkPublicJatosBase())
  results.push(await checkJatosToken())
  results.push(await checkServiceAccount())
  results.push(await checkDatabaseConnectivity())
  results.push(checkProductionEnv())

  const allOk = results.every(Boolean)
  console.log("")
  if (allOk) {
    console.log("✅ All checks passed")
    process.exit(0)
  } else {
    console.log("❌ Some checks failed")
    process.exit(1)
  }
}

main()
