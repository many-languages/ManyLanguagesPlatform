import { afterEach, describe, expect, it, vi } from "vitest"
import { JatosForbiddenError, JatosTransportError } from "./errors"
import { logJatosError, logJatosWarning, sanitizeJatosLogContext } from "./logger"

describe("JATOS logger", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("sanitizes JATOS API errors without logging raw messages or JATOS response text", () => {
    const sanitized = sanitizeJatosLogContext({
      operation: "fetchResults",
      studyId: 10,
      jatosStudyId: 20,
      userId: 30,
      error: new JatosForbiddenError(
        "Raw permission detail",
        "JATOS_FORBIDDEN",
        "Raw JATOS response body",
        { operation: "Fetch results data", studyId: 10, jatosStudyId: 20, userId: 30 }
      ),
    })

    expect(sanitized).toEqual({
      operation: "fetchResults",
      studyId: 10,
      jatosStudyId: 20,
      userId: 30,
      error: {
        name: "JatosForbiddenError",
        category: "forbidden",
        status: 403,
        code: "JATOS_FORBIDDEN",
        operation: "Fetch results data",
      },
    })
    expect(JSON.stringify(sanitized)).not.toContain("Raw permission detail")
    expect(JSON.stringify(sanitized)).not.toContain("Raw JATOS response body")
  })

  it("sanitizes transport causes without logging the raw cause object", () => {
    const sanitized = sanitizeJatosLogContext({
      operation: "downloadResults",
      error: new JatosTransportError(
        "Network failure detail",
        "Fetch results data",
        new Error("Authorization: Bearer secret-token")
      ),
    })

    expect(sanitized).toEqual({
      operation: "downloadResults",
      error: {
        name: "JatosTransportError",
        category: "transport",
        operation: "Fetch results data",
        causeName: "Error",
      },
    })
    expect(JSON.stringify(sanitized)).not.toContain("secret-token")
    expect(JSON.stringify(sanitized)).not.toContain("Network failure detail")
    expect(JSON.stringify(sanitized)).not.toContain("Authorization")
  })

  it("logs only sanitized context for errors and warnings", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const rawError = new Error("token=secret")

    logJatosError("failed", { operation: "op", error: rawError })
    logJatosWarning("warning", { operation: "op", error: rawError })

    expect(errorSpy).toHaveBeenCalledWith("[JATOS] failed", {
      operation: "op",
      error: { name: "Error", category: "unexpected" },
    })
    expect(warnSpy).toHaveBeenCalledWith("[JATOS] warning", {
      operation: "op",
      error: { name: "Error", category: "unexpected" },
    })
  })
})
