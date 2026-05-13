import { config as loadEnv } from "dotenv"
import { defineConfig } from "vitest/config"
import path from "path"

loadEnv({ path: path.resolve(__dirname, ".env.test"), override: true })
process.env.NODE_ENV = "test"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  test: {
    environment: "node",
    fileParallelism: false,
  },
})
