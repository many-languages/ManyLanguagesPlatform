import { describe, expect, it } from "vitest"

import {
  PILOT_LINK_LABEL_MAX_LENGTH,
  getPilotLinkLabel,
  normalizePilotLinkLabel,
} from "./pilotLinkLabel"

describe("normalizePilotLinkLabel", () => {
  it("returns null for empty, whitespace or missing labels", () => {
    expect(normalizePilotLinkLabel(undefined)).toBeNull()
    expect(normalizePilotLinkLabel(null)).toBeNull()
    expect(normalizePilotLinkLabel("   ")).toBeNull()
  })

  it("trims labels", () => {
    expect(normalizePilotLinkLabel("  fast responder ")).toBe("fast responder")
  })

  it("rejects labels that are too long", () => {
    expect(() => normalizePilotLinkLabel("a".repeat(PILOT_LINK_LABEL_MAX_LENGTH + 1))).toThrow()
    expect(normalizePilotLinkLabel("a".repeat(PILOT_LINK_LABEL_MAX_LENGTH))).not.toBeNull()
  })
})

describe("getPilotLinkLabel", () => {
  const labels = { abc123: "fast responder" }

  it("returns the label for a known marker token", () => {
    expect(getPilotLinkLabel("pilot:abc123", labels)).toBe("fast responder")
  })

  it("returns null for unknown tokens, non-pilot comments and missing data", () => {
    expect(getPilotLinkLabel("pilot:zzz", labels)).toBeNull()
    expect(getPilotLinkLabel("participant 7", labels)).toBeNull()
    expect(getPilotLinkLabel(undefined, labels)).toBeNull()
    expect(getPilotLinkLabel("pilot:abc123", undefined)).toBeNull()
  })
})
