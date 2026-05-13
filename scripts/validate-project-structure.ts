#!/usr/bin/env npx tsx
/**
 * Validates project structure rules that are too project-specific for ESLint.
 *
 * Rules:
 * 1. Non-test files in feature queries and mutations folders must have a
 *    default export for Blitz RPC.
 * 2. Those RPC files must not have named exports. Shared server helpers, types,
 *    Prisma selects, and constants belong in server/, domain/, services/, or a
 *    feature-root module.
 *
 * Run: npm run validate:project-structure
 */

import { existsSync, readdirSync, readFileSync } from "fs"
import { join, relative } from "path"
import ts from "typescript"

const FEATURES_DIR = join(process.cwd(), "src", "features")
const RPC_FOLDERS = new Set(["queries", "mutations"])

interface Violation {
  file: string
  line: number
  message: string
}

function* walkFiles(dir: string): Generator<string> {
  const entries = readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walkFiles(fullPath)
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      yield fullPath
    }
  }
}

function isRpcImplementationFile(filePath: string): boolean {
  if (filePath.endsWith(".test.ts")) return false

  const parts = relative(FEATURES_DIR, filePath).split(/[\\/]/)
  return parts.length === 4 && RPC_FOLDERS.has(parts[1])
}

function lineFor(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
}

function hasDefaultExportModifier(node: ts.Node): boolean {
  return (
    ts.canHaveModifiers(node) &&
    Boolean(
      ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)
    )
  )
}

function hasExportModifier(node: ts.Node): boolean {
  return (
    ts.canHaveModifiers(node) &&
    Boolean(
      ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
    )
  )
}

function checkRpcFile(filePath: string): Violation[] {
  const violations: Violation[] = []
  const content = readFileSync(filePath, "utf-8")
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true)
  let hasDefaultExport = false

  for (const statement of sourceFile.statements) {
    if (ts.isExportAssignment(statement)) {
      hasDefaultExport = true
      continue
    }

    if (hasDefaultExportModifier(statement)) {
      hasDefaultExport = true
      continue
    }

    if (ts.isExportDeclaration(statement)) {
      violations.push({
        file: filePath,
        line: lineFor(sourceFile, statement),
        message:
          "Named exports are not allowed in Blitz RPC files. Move shared exports to server/, domain/, services/, or a feature-root module.",
      })
      continue
    }

    if (hasExportModifier(statement)) {
      violations.push({
        file: filePath,
        line: lineFor(sourceFile, statement),
        message:
          "Named exports are not allowed in Blitz RPC files. Keep only the default resolver export here.",
      })
    }
  }

  if (!hasDefaultExport) {
    violations.push({
      file: filePath,
      line: 1,
      message:
        "Blitz RPC files in queries/ and mutations/ must default-export a resolver or handler.",
    })
  }

  return violations
}

function main() {
  if (!existsSync(FEATURES_DIR)) {
    console.error("❌ src/features does not exist.")
    process.exit(1)
  }

  const violations: Violation[] = []

  for (const filePath of walkFiles(FEATURES_DIR)) {
    if (isRpcImplementationFile(filePath)) {
      violations.push(...checkRpcFile(filePath))
    }
  }

  if (violations.length > 0) {
    console.error("❌ Project structure violations found:\n")
    for (const violation of violations) {
      const file = relative(process.cwd(), violation.file)
      console.error(`  ${file}:${violation.line}: ${violation.message}`)
    }
    console.error("\nSee docs/PROJECT_STRUCTURE.md for RPC folder rules.")
    process.exit(1)
  }

  console.log("✅ Project structure validation passed.")
}

main()
