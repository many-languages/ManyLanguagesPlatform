import { afterEach, describe, expect, it } from "vitest"
import { assertProductionEnv, collectProductionEnvIssues, isUnsafeEnvValue } from "./env"

const originalNodeEnv = process.env.NODE_ENV

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv
})

describe("isUnsafeEnvValue", () => {
  it("flags known placeholders", () => {
    expect(isUnsafeEnvValue("CHANGE_ME_IN_PRODUCTION")).toBe(true)
    expect(isUnsafeEnvValue("super-secret-devpass")).toBe(true)
  })

  it("allows normal secrets", () => {
    expect(isUnsafeEnvValue("xK9mP2nQ7vR4wL8hJ3fT6sA1bC5dE0g")).toBe(false)
  })
})

describe("collectProductionEnvIssues", () => {
  it("reports missing and placeholder values", () => {
    const issues = collectProductionEnvIssues({
      SESSION_SECRET_KEY: "",
      POSTGRES_PASSWORD: "CHANGE_ME",
      JATOS_TOKEN: "real-token-value",
      JATOS_BASE: "http://jatos.example",
      NEXT_PUBLIC_JATOS_BASE: "http://jatos.example",
    })
    expect(issues.some((i) => i.includes("SESSION_SECRET_KEY"))).toBe(true)
    expect(issues.some((i) => i.includes("POSTGRES_PASSWORD"))).toBe(true)
  })
})

describe("assertProductionEnv", () => {
  it("no-ops outside production", () => {
    process.env.NODE_ENV = "development"
    expect(() => assertProductionEnv()).not.toThrow()
  })

  it("throws in production when env is incomplete", () => {
    process.env.NODE_ENV = "production"
    expect(() => assertProductionEnv()).toThrow(/Production environment invalid/)
  })
})
