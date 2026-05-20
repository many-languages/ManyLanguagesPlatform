import { describe, expect, it } from "vitest"
import {
  assertMutuallyExclusiveGroupKeys,
  computeCandidateGroupPrefixes,
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

describe("computeCandidateGroupPrefixes", () => {
  const variables = [
    { dslKey: "matrix.dog.age" },
    { dslKey: "matrix.dog.weight" },
    { dslKey: "matrix.cat.age" },
    { dslKey: "matrix.cat.weight" },
    { dslKey: "other.value" },
  ]

  it("returns prefixes with at least minCount ungrouped descendants", () => {
    const result = computeCandidateGroupPrefixes(variables, [], 2)
    expect(result).toEqual([
      { prefix: "matrix", count: 4 },
      { prefix: "matrix.cat", count: 2 },
      { prefix: "matrix.dog", count: 2 },
    ])
  })

  it("excludes prefixes already used as group keys", () => {
    const result = computeCandidateGroupPrefixes(variables, ["matrix.dog"], 2)
    expect(result.map((r) => r.prefix)).toEqual(["matrix.cat"])
  })

  it("excludes prefixes that overlap existing groups", () => {
    const result = computeCandidateGroupPrefixes(variables, ["matrix"], 2)
    expect(result).toEqual([])
  })

  it("ignores variables already covered by a group", () => {
    const result = computeCandidateGroupPrefixes(variables, ["matrix.dog"], 2)
    expect(result.find((r) => r.prefix === "matrix.dog")).toBeUndefined()
    expect(result.find((r) => r.prefix === "matrix")).toBeUndefined()
    expect(result.find((r) => r.prefix === "matrix.cat")).toEqual({
      prefix: "matrix.cat",
      count: 2,
    })
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
