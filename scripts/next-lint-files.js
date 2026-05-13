#!/usr/bin/env node

const { spawnSync } = require("node:child_process")

const files = process.argv.slice(2).filter((file) => /\.(js|ts|tsx)$/.test(file))

if (files.length === 0) {
  process.exit(0)
}

const args = ["next", "lint", "--fix", ...files.flatMap((file) => ["--file", file])]

const result = spawnSync("npx", args, {
  stdio: "inherit",
})

process.exit(result.status ?? 1)
