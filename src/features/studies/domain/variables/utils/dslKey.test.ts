import { describe, expect, it } from "vitest"
import { variableKeyToDslToken } from "./dslKey"

describe("variableKeyToDslToken", () => {
  it("strips leading $", () => {
    expect(variableKeyToDslToken("$score")).toBe("score")
  })

  it("handles simple nested path", () => {
    expect(variableKeyToDslToken("$frameworksRate.angularv1.knowledge")).toBe(
      "frameworksRate.angularv1.knowledge"
    )
  })

  it("removes mid-path [*] wildcard", () => {
    expect(variableKeyToDslToken("$trials[*].rt")).toBe("trials.rt")
  })

  it("removes root-level [*] wildcard without a leading dot", () => {
    expect(variableKeyToDslToken("$[*].score")).toBe("score")
    expect(variableKeyToDslToken("$[*].reactionTime")).toBe("reactionTime")
  })

  it("removes trailing [*] wildcard", () => {
    expect(variableKeyToDslToken("$trials[*]")).toBe("trials")
  })

  it("handles nested array wildcards", () => {
    expect(variableKeyToDslToken("$responses[*].items[*].choice")).toBe("responses.items.choice")
  })

  it("sanitizes quoted key segments mid-path", () => {
    expect(variableKeyToDslToken('$["my.key"].value')).toBe("my_key.value")
  })

  it("sanitizes quoted key at end of path", () => {
    expect(variableKeyToDslToken('$root["my.key"]')).toBe("root.my_key")
  })

  it("replaces spaces and special chars in quoted segments with underscore", () => {
    expect(variableKeyToDslToken('$["rate per item"].score')).toBe("rate_per_item.score")
  })

  it("disambiguated sibling keys produce unique tokens", () => {
    const a = variableKeyToDslToken("$frameworksRate.angularv1.knowledge")
    const b = variableKeyToDslToken("$frameworksRate.angularv2.knowledge")
    expect(a).toBe("frameworksRate.angularv1.knowledge")
    expect(b).toBe("frameworksRate.angularv2.knowledge")
    expect(a).not.toBe(b)
  })

  it("produces tokens that match the IDENT regex", () => {
    const IDENT = /^[a-zA-Z0-9_.]+$/
    const keys = [
      "$score",
      "$frameworksRate.angularv1.knowledge",
      "$trials[*].rt",
      "$responses[*].items[*].choice",
    ]
    for (const key of keys) {
      expect(variableKeyToDslToken(key)).toMatch(IDENT)
    }
  })
})
