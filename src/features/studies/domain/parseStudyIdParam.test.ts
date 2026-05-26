import { describe, expect, it } from "vitest"
import { parseStudyIdParam } from "./parseStudyIdParam"

describe("parseStudyIdParam", () => {
  it("accepts positive integer strings", () => {
    expect(parseStudyIdParam("1")).toBe(1)
    expect(parseStudyIdParam("42")).toBe(42)
  })

  it("rejects non-numeric and malformed values", () => {
    expect(parseStudyIdParam("abc")).toBeNull()
    expect(parseStudyIdParam("12.7")).toBeNull()
    expect(parseStudyIdParam("-1")).toBeNull()
    expect(parseStudyIdParam("0")).toBeNull()
    expect(parseStudyIdParam("1e2")).toBeNull()
    expect(parseStudyIdParam("01")).toBeNull()
  })
})
