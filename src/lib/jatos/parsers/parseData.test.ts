import { describe, it, expect } from "vitest"
import { parseData } from "./index"

describe("parseData", () => {
  it("returns error for null content", () => {
    const result = parseData(null)

    expect(result.success).toBe(false)
    expect(result.data).toBeNull()
    expect(result.format.format).toBe("text")
    expect(result.error).toBe("No content to parse")
  })

  it("parses valid JSON object", () => {
    const content = '{"key": "value", "nested": {"a": 1}}'
    const result = parseData(content)

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ key: "value", nested: { a: 1 } })
    expect(result.format.format).toBe("json")
    expect(result.format.confidence).toBe(1)
  })

  it("parses valid JSON array", () => {
    const content = "[1, 2, 3]"
    const result = parseData(content)

    expect(result.success).toBe(true)
    expect(result.data).toEqual([1, 2, 3])
    expect(result.format.format).toBe("json")
  })

  it("returns as text when content is invalid JSON (format detector falls back to text)", () => {
    const content = "{ invalid json"
    const result = parseData(content)

    expect(result.success).toBe(true)
    expect(result.data).toBe(content)
    expect(result.format.format).toBe("text")
  })

  it("parses CSV with comma delimiter", () => {
    const content = "name,age,city\nAlice,30,Berlin\nBob,25,Paris"
    const result = parseData(content)

    expect(result.success).toBe(true)
    expect(result.format.format).toBe("csv")
    expect(result.data).toEqual([
      { name: "Alice", age: 30, city: "Berlin" },
      { name: "Bob", age: 25, city: "Paris" },
    ])
  })

  it("parses TSV with tab delimiter", () => {
    const content = "col1\tcol2\nval1\tval2"
    const result = parseData(content)

    expect(result.success).toBe(true)
    expect(result.format.format).toBe("tsv")
    expect(result.data).toEqual([{ col1: "val1", col2: "val2" }])
  })

  it("returns raw text for plain text without structure", () => {
    const content = "Just some plain text without commas or tabs"
    const result = parseData(content)

    expect(result.success).toBe(true)
    expect(result.data).toBe(content)
    expect(result.format.format).toBe("text")
  })

  it("returns raw text for empty string", () => {
    const result = parseData("")

    expect(result.success).toBe(false)
    expect(result.format.format).toBe("text")
    expect(result.error).toBe("No content to parse")
  })
})
