import { describe, expect, it } from "vitest"
import { parseReturnToQueryParam } from "./parseReturnToQueryParam"

describe("parseReturnToQueryParam", () => {
  it("accepts study and step targets", () => {
    expect(parseReturnToQueryParam("study")).toBe("study")
    expect(parseReturnToQueryParam("step1")).toBe("step1")
    expect(parseReturnToQueryParam("step6")).toBe("step6")
  })

  it("defaults when missing or invalid", () => {
    expect(parseReturnToQueryParam(undefined)).toBe("step2")
    expect(parseReturnToQueryParam("")).toBe("step2")
    expect(parseReturnToQueryParam("next")).toBe("step2")
    expect(parseReturnToQueryParam("step0")).toBe("step2")
    expect(parseReturnToQueryParam("step7")).toBe("step2")
    expect(parseReturnToQueryParam("//evil")).toBe("step2")
  })
})
