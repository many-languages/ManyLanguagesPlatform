import { describe, expect, it } from "vitest"

import { sortCodebookItems } from "./codebookSort"

describe("sortCodebookItems", () => {
  const items = [{ n: "banana" }, { n: "Apple" }, { n: "item10" }, { n: "item2" }]

  it("keeps presentation order untouched", () => {
    expect(sortCodebookItems(items, "presentation", (i) => i.n)).toBe(items)
  })

  it("sorts alphabetically, case-insensitive and numeric-aware, without mutating", () => {
    const sorted = sortCodebookItems(items, "alphabetical", (i) => i.n)
    expect(sorted.map((i) => i.n)).toEqual(["Apple", "banana", "item2", "item10"])
    expect(items[0].n).toBe("banana")
  })
})
