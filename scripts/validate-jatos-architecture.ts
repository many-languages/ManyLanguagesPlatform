#!/usr/bin/env npx tsx
/**
 * Validates JATOS architecture rules for app code.
 *
 * Rules (app code = src/app/**):
 * 1. Must NOT import from src/lib/jatos/client/* (exception: browser/uploadStudyFile is allowed)
 * 2. Must NOT import getAdminToken from getAdminToken
 * 3. Must NOT import getTokenForResearcher, getTokenForStudyService, getServiceAccountToken from tokenBroker
 *
 * Run: npx tsx scripts/validate-jatos-architecture.ts
 * Or: npm run validate:jatos-architecture
 *
 * Add to CI (e.g. in .github/workflows or Makefile) to enforce architecture rules.
 */

import { readdirSync, readFileSync } from "fs"
import { join } from "path"

const APP_DIR = join(process.cwd(), "src", "app")
const FORBIDDEN_TOKEN_NAMES = [
  "getAdminToken",
  "getTokenForResearcher",
  "getTokenForStudyService",
  "getServiceAccountToken",
]

interface Violation {
  file: string
  line: number
  message: string
}

function* walkTsFiles(dir: string): Generator<string> {
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue
      yield* walkTsFiles(fullPath)
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      yield fullPath
    }
  }
}

function checkFile(filePath: string): Violation[] {
  const violations: Violation[] = []
  const content = readFileSync(filePath, "utf-8")
  const lines = content.split("\n")

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1

    // 1. Forbidden: import from jatos/client (any path)
    const clientImportMatch = line.match(/from\s+["']([^"']*jatos\/client(?:\/[^"']*)?)["']/)
    if (clientImportMatch) {
      violations.push({
        file: filePath,
        line: lineNum,
        message: `Import from jatos/client is forbidden. Use jatosAccessService or browser/uploadStudyFile instead. (${clientImportMatch[1]})`,
      })
    }

    // 2. Forbidden: import from getAdminToken
    if (line.includes("getAdminToken") && /from\s+["'][^"']*getAdminToken["']/.test(line)) {
      violations.push({
        file: filePath,
        line: lineNum,
        message:
          "Import of getAdminToken is forbidden. Use jatosAccessService for JATOS operations.",
      })
    }

    // 3. Forbidden: import token resolution from tokenBroker
    const tokenBrokerMatch = line.match(/from\s+["']([^"']*tokenBroker)["']/)
    if (tokenBrokerMatch) {
      const importMatch = line.match(/import\s+{([^}]+)}\s+from/)
      const namespaceMatch = line.match(/import\s+\*\s+as\s+\w+\s+from/)
      if (namespaceMatch) {
        violations.push({
          file: filePath,
          line: lineNum,
          message:
            "Namespace import from tokenBroker is forbidden. Import only ensureResearcherProvisioned or clearTokenCache if needed.",
        })
      } else if (importMatch) {
        const importedNames = importMatch[1].split(",").map((s) =>
          s
            .trim()
            .split(/\s+as\s+/)[0]
            .trim()
        )
        const forbidden = FORBIDDEN_TOKEN_NAMES.filter((name) => importedNames.includes(name))
        if (forbidden.length > 0) {
          violations.push({
            file: filePath,
            line: lineNum,
            message: `Import of ${forbidden.join(
              ", "
            )} from tokenBroker is forbidden. Use jatosAccessService for JATOS operations.`,
          })
        }
      }
    }
  }

  return violations
}

function main() {
  const violations: Violation[] = []
  for (const filePath of walkTsFiles(APP_DIR)) {
    violations.push(...checkFile(filePath))
  }

  if (violations.length > 0) {
    console.error("❌ JATOS architecture violations found:\n")
    for (const v of violations) {
      const relative = v.file.replace(process.cwd() + "/", "")
      console.error(`  ${relative}:${v.line}: ${v.message}`)
    }
    console.error("\nSee docs/JATOS_API_USAGE.md for architecture guidelines.")
    process.exit(1)
  }

  console.log("✅ JATOS architecture validation passed.")
}

main()
