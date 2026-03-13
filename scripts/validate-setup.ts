#!/usr/bin/env npx tsx
/**
 * Validates JATOS and app setup before deployment.
 * Run via: make validate-setup or npx tsx scripts/validate-setup.ts
 *
 * Checks:
 * - JATOS_BASE set
 * - JATOS_TOKEN set and valid (calls /jatos/api/v1/admin/token)
 * - Service account in SystemConfig (key jatosServiceUserID)
 * - In production: SESSION_SECRET_KEY and POSTGRES_PASSWORD not placeholders
 */

import { config } from "dotenv"

// Load .env from project root (for local runs)
config({ path: ".env", quiet: true })

const JATOS_BASE = process.env.JATOS_BASE
const JATOS_TOKEN = process.env.JATOS_TOKEN
const NODE_ENV = process.env.NODE_ENV || "development"
const isProduction = NODE_ENV === "production"

const UNSAFE_VALUES = [
  "CHANGE_ME",
  "devpass",
  "dev-secret",
  "your-token",
  "your-secret",
  "LONGPASS",
  "change-in-production",
  "change-me",
]

function isUnsafe(value: string): boolean {
  const upper = value.toUpperCase()
  return UNSAFE_VALUES.some((u) => upper.includes(u.toUpperCase()))
}

async function checkJatosBase(): Promise<boolean> {
  if (!JATOS_BASE?.trim()) {
    console.error("❌ JATOS_BASE is not set")
    return false
  }
  console.log("✅ JATOS_BASE is set")
  return true
}

async function checkJatosToken(): Promise<boolean> {
  if (!JATOS_TOKEN?.trim()) {
    console.error("❌ JATOS_TOKEN is not set")
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

function checkProductionSecrets(): boolean {
  if (!isProduction) return true

  const checks: Array<{ name: string; value: string | undefined }> = [
    { name: "SESSION_SECRET_KEY", value: process.env.SESSION_SECRET_KEY },
    { name: "POSTGRES_PASSWORD", value: process.env.POSTGRES_PASSWORD },
  ]

  let ok = true
  for (const { name, value } of checks) {
    if (!value?.trim()) {
      console.error(`❌ ${name} is not set (required in production)`)
      ok = false
    } else if (isUnsafe(value)) {
      console.error(`❌ ${name} appears to use a placeholder value`)
      ok = false
    }
  }
  if (ok) {
    console.log("✅ Production secrets look safe")
  }
  return ok
}

async function main() {
  console.log("🔍 Validating setup...\n")

  const results: boolean[] = []
  results.push(await checkJatosBase())
  results.push(await checkJatosToken())
  results.push(await checkServiceAccount())
  results.push(checkProductionSecrets())

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
