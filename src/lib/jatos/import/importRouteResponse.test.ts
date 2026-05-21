import { describe, expect, it } from "vitest"
import {
  JatosImportRouteError,
  messageForJatosImportFailure,
  parseJatosImportRouteErrorJson,
} from "./importRouteResponse"

describe("parseJatosImportRouteErrorJson", () => {
  it("preserves ingress kind from route JSON", () => {
    const err = parseJatosImportRouteErrorJson(
      { error: "Missing study file (.jzip).", kind: "ingress" },
      400
    )
    expect(err).toBeInstanceOf(JatosImportRouteError)
    expect(err.kind).toBe("ingress")
    expect(err.message).toBe("Missing study file (.jzip).")
  })

  it("preserves jatos kind for mapped server failures", () => {
    const err = parseJatosImportRouteErrorJson(
      { error: "Something went wrong. Please try again.", kind: "jatos" },
      500
    )
    expect(err.kind).toBe("jatos")
  })
})

describe("messageForJatosImportFailure", () => {
  it("passes through ingress messages without Import failed prefix", () => {
    const err = new JatosImportRouteError('Expected a .jzip file (got "x.zip").', "ingress", 400)
    expect(messageForJatosImportFailure(err)).toBe('Expected a .jzip file (got "x.zip").')
  })

  it("prefixes jatos-kind messages", () => {
    const err = new JatosImportRouteError("Something went wrong. Please try again.", "jatos", 500)
    expect(messageForJatosImportFailure(err)).toBe(
      "Import failed: Something went wrong. Please try again."
    )
  })
})
