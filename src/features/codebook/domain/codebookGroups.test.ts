import { describe, expect, it } from "vitest"
import {
  assertMutuallyExclusiveGroupKeys,
  findWinningGroupKey,
  groupKeysOverlap,
  isCoveredByGroupKey,
  pruneNestedParentGroups,
  variableHasDescriptionCoverage,
  wouldOverlapExistingGroupKeys,
} from "./codebookGroups"

describe("isCoveredByGroupKey", () => {
  it("matches strict descendants", () => {
    expect(isCoveredByGroupKey("matrix.dog", "matrix")).toBe(true)
    expect(
      isCoveredByGroupKey("frameworksRate.angularv2.experience", "frameworksRate.angularv2")
    ).toBe(true)
  })

  it("does not match self or unrelated keys", () => {
    expect(isCoveredByGroupKey("matrix", "matrix")).toBe(false)
    expect(isCoveredByGroupKey("matrix.dog", "matrix.cat")).toBe(false)
  })
})

describe("groupKeysOverlap", () => {
  it("detects parent-child overlap", () => {
    expect(groupKeysOverlap("frameworksRate", "frameworksRate.angularv2")).toBe(true)
  })

  it("allows sibling prefixes", () => {
    expect(groupKeysOverlap("frameworksRate.angularv1", "frameworksRate.angularv2")).toBe(false)
  })
})

describe("assertMutuallyExclusiveGroupKeys", () => {
  it("throws on nested keys", () => {
    expect(() =>
      assertMutuallyExclusiveGroupKeys(["frameworksRate", "frameworksRate.angularv2"])
    ).toThrow(/overlap/)
  })

  it("allows siblings", () => {
    expect(() =>
      assertMutuallyExclusiveGroupKeys(["frameworksRate.angularv1", "frameworksRate.angularv2"])
    ).not.toThrow()
  })
})

describe("findWinningGroupKey", () => {
  it("prefers longest matching prefix when legacy nested groups exist", () => {
    const keys = ["frameworksRate", "frameworksRate.angularv2"]
    expect(findWinningGroupKey("frameworksRate.angularv2.experience", keys)).toBe(
      "frameworksRate.angularv2"
    )
    expect(findWinningGroupKey("frameworksRate.angularv1.experience", keys)).toBe("frameworksRate")
  })
})

describe("pruneNestedParentGroups", () => {
  it("removes parent when child group exists", () => {
    const groups = [
      { groupKey: "frameworksRate", description: "parent" },
      { groupKey: "frameworksRate.angularv2", description: "child" },
    ]
    expect(pruneNestedParentGroups(groups).map((g) => g.groupKey)).toEqual([
      "frameworksRate.angularv2",
    ])
  })

  it("keeps sibling groups", () => {
    const groups = [
      { groupKey: "frameworksRate.angularv1", description: "a" },
      { groupKey: "frameworksRate.angularv2", description: "b" },
    ]
    expect(pruneNestedParentGroups(groups)).toHaveLength(2)
  })
})

describe("wouldOverlapExistingGroupKeys", () => {
  it("blocks parent when child exists", () => {
    expect(wouldOverlapExistingGroupKeys("frameworksRate", ["frameworksRate.angularv2"])).toBe(true)
  })

  it("blocks child when parent exists", () => {
    expect(wouldOverlapExistingGroupKeys("frameworksRate.angularv2", ["frameworksRate"])).toBe(true)
  })
})

describe("variableHasDescriptionCoverage", () => {
  it("uses winning group description only", () => {
    const groups = [
      { groupKey: "frameworksRate", description: "parent desc" },
      { groupKey: "frameworksRate.angularv2", description: "" },
    ]
    expect(variableHasDescriptionCoverage("frameworksRate.angularv2.experience", "", groups)).toBe(
      false
    )
    expect(variableHasDescriptionCoverage("frameworksRate.angularv1.experience", "", groups)).toBe(
      true
    )
  })
})
